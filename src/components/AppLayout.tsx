import React, { createContext, useContext, useState } from 'react';
import { Calculator, Home, Bookmark, Settings, DollarSign, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user, signOut, openAuthDialog } = useAuth();

  return (
    <AppLayoutContext.Provider value={{ activeTab, setActiveTab }}>
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
            </div>
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
