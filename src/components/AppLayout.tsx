import React, { createContext, useContext, useState } from 'react';
import { Calculator, Home, Bookmark, Settings, DollarSign, LogOut, User, Smartphone, Mail, X, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;

/* ── Contact Modal ── */
function ContactModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const canSend = name.trim() && email.trim() && subject.trim() && message.trim() && !sending;

  const handleSend = async () => {
    setError('');
    setSending(true);
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Deal Wise Rent <onboarding@resend.dev>',
          to: ['mdmhafi@gmail.com'],
          reply_to: email,
          subject: `[Contact] ${subject}`,
          html: `<p><strong>From:</strong> ${name} (${email})</p><p><strong>Subject:</strong> ${subject}</p><hr/><p style="white-space:pre-wrap">${message.replace(/\n/g, '<br>')}</p>`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? json.error?.message ?? 'Failed to send.');
      setSent(true);
      setTimeout(onClose, 2000);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl overflow-hidden animate-float-up">
        {/* Gradient top bar */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, hsl(263 80% 58%), hsl(220 80% 62%))' }} />

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(263 80% 58%), hsl(245 80% 60%))' }}>
              <Mail className="w-4 h-4 text-white" />
            </div>
            <p className="font-bold text-foreground">Contact Us</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {sent ? (
          <div className="px-5 py-12 flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-1">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <p className="text-base font-bold text-foreground">Message sent!</p>
            <p className="text-sm text-muted-foreground">We'll get back to you as soon as possible.</p>
          </div>
        ) : (
          <>
            <div className="px-5 py-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Your Name', value: name, set: setName, type: 'text', placeholder: 'John Doe' },
                  { label: 'Your Email', value: email, set: setEmail, type: 'email', placeholder: 'you@example.com' },
                ].map(f => (
                  <div key={f.label} className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{f.label}</label>
                    <input
                      type={f.type}
                      value={f.value}
                      onChange={e => f.set(e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="What's this about?"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Write your message here..."
                  rows={4}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-shadow"
                />
              </div>
              {error && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
            </div>

            <div className="px-5 pb-5 flex gap-2.5">
              <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!canSend}
                className="flex-1 h-10 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-gradient"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {sending ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Layout Context ── */
type Tab = 'calculator' | 'rent-estimator' | 'saved' | 'settings';

interface AppLayoutContextType {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const AppLayoutContext = createContext<AppLayoutContextType>({ activeTab: 'calculator', setActiveTab: () => {} });
export const useAppLayout = () => useContext(AppLayoutContext);

const tabs: { id: Tab; label: string; icon: React.ElementType; short: string }[] = [
  { id: 'calculator',     label: 'Deal Analyzer',   icon: Calculator, short: 'Analyzer' },
  { id: 'rent-estimator', label: 'Rent Estimator',  icon: Home,       short: 'Rent Est.' },
  { id: 'saved',          label: 'Saved Deals',     icon: Bookmark,   short: 'Saved' },
  { id: 'settings',       label: 'Settings',        icon: Settings,   short: 'Settings' },
];

/* ── App Layout ── */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<Tab>('calculator');
  const [contactOpen, setContactOpen] = useState(false);
  const { user, signOut, openAuthDialog } = useAuth();

  return (
    <AppLayoutContext.Provider value={{ activeTab, setActiveTab }}>
      {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}

      <div className="min-h-screen bg-background flex flex-col">

        {/* ─────────── Top Navigation Bar ─────────── */}
        <header className="sticky top-0 z-40 w-full">
          {/* Frosted glass background */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-b border-border/60" />

          <div className="relative max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between h-16 gap-4">

            {/* ── Logo ── */}
            <button
              onClick={() => setActiveTab('calculator')}
              className="flex items-center gap-2.5 shrink-0 group"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm transition-shadow group-hover:shadow-md"
                style={{ background: 'linear-gradient(135deg, hsl(263 80% 58%), hsl(245 80% 60%))' }}
              >
                <DollarSign className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-bold tracking-tight text-foreground hidden sm:block">
                Deal Wise <span className="gradient-text">Rent</span>
              </span>
            </button>

            {/* ── Desktop Nav Pills ── */}
            <nav className="hidden md:flex items-center gap-1 bg-muted/60 rounded-full p-1 border border-border/50">
              {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/70'
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {/* ── Right Actions ── */}
            <div className="flex items-center gap-2 shrink-0">
              {/* iOS App */}
              <a
                href="https://apps.apple.com/us/app/cash-flow-rental/id6757372799"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/70 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-all hover:shadow-sm bg-background/60"
              >
                <Smartphone className="w-3.5 h-3.5" />
                iOS App
              </a>

              {/* Contact — desktop */}
              <button
                onClick={() => setContactOpen(true)}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                Contact
              </button>

              {/* Contact — mobile icon */}
              <button
                onClick={() => setContactOpen(true)}
                className="md:hidden p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Contact Us"
              >
                <Mail className="w-4 h-4" />
              </button>

              {/* Auth */}
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="hidden lg:block text-xs text-muted-foreground max-w-[130px] truncate">{user.email}</span>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={openAuthDialog}
                  className="px-4 py-1.5 rounded-full text-sm font-semibold text-white transition-all btn-gradient shadow-sm"
                >
                  Sign In
                </button>
              )}
            </div>

          </div>
        </header>

        {/* ── Main Content ── */}
        <main className="flex-1 pb-16 md:pb-0">
          {children}
        </main>

        {/* ── Mobile Bottom Tab Bar ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
          <div className="bg-card/90 backdrop-blur-xl border-t border-border/70 flex">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 flex flex-col items-center py-3 gap-1 transition-all duration-150',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Icon className={cn('w-5 h-5 transition-transform', isActive && 'scale-110')} />
                  <span className="text-[10px] font-medium leading-none">{tab.short}</span>
                </button>
              );
            })}
          </div>
        </nav>

      </div>
    </AppLayoutContext.Provider>
  );
}
