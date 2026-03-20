import React, { createContext, useContext, useState } from 'react';
import { Calculator, Home, Bookmark, Settings, DollarSign, LogOut, User, Smartphone, Mail, X, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;

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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Deal Wise Rent <onboarding@resend.dev>',
          to: ['mdmhafi@gmail.com'],
          reply_to: email,
          subject: `[Contact] ${subject}`,
          html: `
            <p><strong>From:</strong> ${name} (${email})</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <hr/>
            <p style="white-space:pre-wrap">${message.replace(/\n/g, '<br>')}</p>
          `,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? json.error?.message ?? 'Failed to send. Check your Resend API key.');
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
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm font-bold text-foreground">Contact Us</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {sent ? (
          <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
            <p className="text-sm font-semibold text-foreground">Message sent!</p>
            <p className="text-xs text-muted-foreground">We'll get back to you as soon as possible.</p>
          </div>
        ) : (
          <>
            {/* Form */}
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="What's this about?"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Write your message here..."
                  rows={4}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              {error && (
                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!canSend}
                className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type Tab = 'calculator' | 'rent-estimator' | 'saved' | 'settings';

interface AppLayoutContextType {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const AppLayoutContext = createContext<AppLayoutContextType>({ activeTab: 'calculator', setActiveTab: () => {} });

export const useAppLayout = () => useContext(AppLayoutContext);

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'calculator', label: 'Calculator', icon: Calculator },
  { id: 'rent-estimator', label: 'Rent Estimator', icon: Home },
  { id: 'saved', label: 'Saved', icon: Bookmark },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<Tab>('calculator');
  const [contactOpen, setContactOpen] = useState(false);
  const { user, signOut, openAuthDialog } = useAuth();

  return (
    <AppLayoutContext.Provider value={{ activeTab, setActiveTab }}>
      {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-sidebar-border bg-sidebar shrink-0">
          {/* Sidebar Header: Logo + Sign In / User */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground tracking-tight">Deal Wise Rent</span>
            </div>
            {!user && (
              <button
                onClick={openAuthDialog}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Contact Us */}
          <div className="px-4 pt-3 border-t border-sidebar-border">
            <button
              onClick={() => setContactOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors text-sm font-medium"
            >
              <Mail className="w-4 h-4 shrink-0" />
              Contact Us
            </button>
          </div>

          {/* App Store Link */}
          <div className="px-4 py-3">
            <a
              href="https://apps.apple.com/us/app/cash-flow-rental/id6757372799"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors group"
            >
              <Smartphone className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground leading-tight">Get the iOS App</p>
                <p className="text-[10px] text-muted-foreground leading-tight truncate">Cash Flow Rental on App Store</p>
              </div>
            </a>
          </div>

          {/* Sidebar Footer */}
          {user && (
            <div className="p-4 border-t border-sidebar-border space-y-3">
              <p className="text-xs text-muted-foreground truncate" title={user.email}>{user.email}</p>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Top Header */}
          <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-base font-bold text-foreground tracking-tight">Deal Wise Rent</span>
              <a
                href="https://apps.apple.com/us/app/cash-flow-rental/id6757372799"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors ml-1"
                title="Download iOS App"
              >
                <Smartphone className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-semibold text-primary">App</span>
              </a>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setContactOpen(true)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                title="Contact Us"
              >
                <Mail className="w-4 h-4" />
              </button>
            {user ? (
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span className="max-w-[120px] truncate">{user.email}</span>
              </button>
            ) : (
              <button
                onClick={openAuthDialog}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                Sign In
              </button>
            )}
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Tab Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex z-50">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex flex-col items-center py-2.5 gap-1 transition-colors duration-150",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </AppLayoutContext.Provider>
  );
}
