import React from 'react';
import { Brain, BarChart3, Table2, MessageSquare, Settings2, Sparkles } from 'lucide-react';

const TABS = [
  { id: 'insights', label: 'Insights', icon: Brain },
  { id: 'charts', label: 'Charts', icon: BarChart3 },
  { id: 'data', label: 'Data', icon: Table2 },
  { id: 'query', label: 'Ask AI', icon: MessageSquare },
  { id: 'builder', label: 'Builder', icon: Settings2 },
];

export default function MobileNav({ activeTab, onTabChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-[var(--bg-primary)]/95 backdrop-blur-xl border-t border-[var(--border-subtle)] safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-0 ${
                isActive
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_6px_var(--accent)]' : ''}`} />
              <span className="text-[9px] font-medium truncate">{tab.label}</span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-[var(--accent)] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
