import React, { createContext, useContext, useState } from 'react';
import { Calculator, Home, Bookmark, Settings, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  return (
    <AppLayoutContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-sidebar-border bg-sidebar shrink-0">
          <div className="flex items-center gap-2.5 px-6 py-5 border-b border-sidebar-border">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">CashFlow</span>
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
          <div className="p-4 border-t border-sidebar-border">
            <p className="text-xs text-muted-foreground text-center">CashFlow v1.1</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>

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
