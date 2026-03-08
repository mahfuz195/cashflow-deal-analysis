import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalculatorState } from '@/types/calculator';
import { useCalculator } from '@/hooks/useCalculator';
import ReactMarkdown from 'react-markdown';

type Msg = { role: 'user' | 'assistant'; content: string };

interface DealCoachProps {
  calculatorState: CalculatorState;
  updateField: <K extends keyof CalculatorState>(field: K, value: CalculatorState[K]) => void;
  onOpenRef?: (openFn: () => void) => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

async function streamChat({
  messages,
  calculatorState,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  calculatorState: CalculatorState;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, calculatorState }),
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ error: 'Connection failed' }));
    onError(errorData.error || `Error ${resp.status}`);
    return;
  }

  if (!resp.body) {
    onError('No response body');
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = '';
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') { streamDone = true; break; }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + '\n' + textBuffer;
        break;
      }
    }
  }

  // Final flush
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split('\n')) {
      if (!raw) continue;
      if (raw.endsWith('\r')) raw = raw.slice(0, -1);
      if (raw.startsWith(':') || raw.trim() === '') continue;
      if (!raw.startsWith('data: ')) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}

function parseApplySuggestions(content: string): { field: string; value: number | boolean }[] {
  const suggestions: { field: string; value: number | boolean }[] = [];
  const regex = /```apply\s*\n?\s*(\{[^}]+\})\s*\n?\s*```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.field && parsed.value !== undefined) {
        suggestions.push(parsed);
      }
    } catch { /* ignore */ }
  }
  return suggestions;
}

function stripApplyBlocks(content: string): string {
  return content.replace(/```apply\s*\n?\s*\{[^}]+\}\s*\n?\s*```/g, '').trim();
}

export function DealCoach({ calculatorState, updateField, onOpenRef }: DealCoachProps) {
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    onOpenRef?.(() => setOpen(true));
  }, [onOpenRef]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    setError('');
    const userMsg: Msg = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const allMessages = [...messages, userMsg];

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: allMessages,
        calculatorState,
        onDelta: upsertAssistant,
        onDone: () => setIsLoading(false),
        onError: (err) => { setError(err); setIsLoading(false); },
      });
    } catch (e) {
      console.error(e);
      setError('Failed to connect to Deal Coach. Please try again.');
      setIsLoading(false);
    }
  }, [messages, isLoading, calculatorState]);

  const handleApply = (field: string, value: number | boolean) => {
    updateField(field as keyof CalculatorState, value as any);
    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: `✅ Applied: **${field}** set to **${value}**. Check your updated metrics!` },
    ]);
  };

  const quickActions = [
    { label: 'Analyze my deal', msg: 'Analyze my current deal and tell me if it\'s worth pursuing.' },
    { label: 'How to improve?', msg: 'What specific changes would improve this deal\'s returns?' },
    { label: 'Offer scenarios', msg: 'Show me 2-3 alternative offer scenarios for this property.' },
  ];

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 md:bottom-6 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 group"
          aria-label="Open Deal Coach"
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-primary opacity-30 animate-ping group-hover:opacity-0" />
          <Sparkles className="w-5 h-5 shrink-0 relative" />
          <span className="text-sm font-semibold relative hidden sm:inline">Deal Advisor</span>
        </button>
      )}

      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:bg-transparent md:pointer-events-none"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Chat Panel */}
      <div
        className={cn(
          'fixed z-50 flex flex-col bg-card border-l border-border shadow-2xl transition-transform duration-300',
          // Desktop: side drawer
          'md:top-0 md:right-0 md:h-full md:w-[420px]',
          // Mobile: full screen
          'top-0 right-0 h-full w-full md:w-[420px]',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Deal Advisor</h2>
              <p className="text-[10px] text-muted-foreground">AI Investment Analysis</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-accent rounded-xl rounded-tl-sm px-3.5 py-2.5 text-sm text-foreground max-w-[85%]">
                  <p className="font-medium mb-1">👋 I'm your Deal Coach!</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    I can analyze your current deal, suggest improvements, create offer scenarios, and answer any real estate investment questions.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pl-9">
                {quickActions.map(qa => (
                  <button
                    key={qa.label}
                    onClick={() => send(qa.msg)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-border bg-background hover:bg-accent transition-colors text-foreground"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            if (msg.role === 'user') {
              return (
                <div key={i} className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-xl rounded-tr-sm px-3.5 py-2.5 text-sm max-w-[85%]">
                    {msg.content}
                  </div>
                </div>
              );
            }

            const suggestions = parseApplySuggestions(msg.content);
            const cleanContent = stripApplyBlocks(msg.content);

            return (
              <div key={i} className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="space-y-2 max-w-[85%]">
                  <div className="bg-accent rounded-xl rounded-tl-sm px-3.5 py-2.5 text-sm text-foreground prose prose-sm prose-slate dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown>{cleanContent}</ReactMarkdown>
                  </div>
                  {suggestions.map((s, si) => (
                    <button
                      key={si}
                      onClick={() => handleApply(s.field, s.value)}
                      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors bg-primary/5 hover:bg-primary/10 rounded-lg px-3 py-1.5"
                    >
                      <ArrowRight className="w-3 h-3" />
                      Apply: {s.field} → {String(s.value)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="bg-accent rounded-xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive text-xs rounded-lg px-3 py-2 mx-9">
              {error}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-border p-3 bg-card">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Ask about your deal..."
              disabled={isLoading}
              className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <Button
              size="icon"
              onClick={() => send(input)}
              disabled={!input.trim() || isLoading}
              className="h-10 w-10 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
