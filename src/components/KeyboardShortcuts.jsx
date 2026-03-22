import React, { useState, useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], description: 'Open search / Ask AI' },
  { keys: ['Ctrl', 'E'], description: 'Export as PDF' },
  { keys: ['Ctrl', 'D'], description: 'Toggle dark mode' },
  { keys: ['Ctrl', '1'], description: 'AI Insights tab' },
  { keys: ['Ctrl', '2'], description: 'Visualizations tab' },
  { keys: ['Ctrl', '3'], description: 'Data Preview tab' },
  { keys: ['Ctrl', '4'], description: 'Ask AI tab' },
  { keys: ['Ctrl', '5'], description: 'Chart Builder tab' },
  { keys: ['Ctrl', '6'], description: 'Templates tab' },
  { keys: ['Esc'], description: 'Close modal / panel' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
];

export default function KeyboardShortcuts({ onAction }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // ? key to show shortcuts (when not in input)
      if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        e.preventDefault();
        setIsOpen(prev => !prev);
        return;
      }

      // Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false);
        onAction?.('escape');
        return;
      }

      // Ctrl/Cmd combinations
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            onAction?.('search');
            break;
          case 'e':
            e.preventDefault();
            onAction?.('export');
            break;
          case 'd':
            e.preventDefault();
            onAction?.('theme');
            break;
          case '1':
            e.preventDefault();
            onAction?.('tab-insights');
            break;
          case '2':
            e.preventDefault();
            onAction?.('tab-charts');
            break;
          case '3':
            e.preventDefault();
            onAction?.('tab-data');
            break;
          case '4':
            e.preventDefault();
            onAction?.('tab-query');
            break;
          case '5':
            e.preventDefault();
            onAction?.('tab-builder');
            break;
          case '6':
            e.preventDefault();
            onAction?.('tab-templates');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAction]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-active)] transition-all shadow-lg"
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setIsOpen(false)}>
      <div className="glass-card p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Keyboard Shortcuts</h3>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-white/5 text-[var(--text-muted)]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-[var(--text-secondary)]">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, j) => (
                  <React.Fragment key={j}>
                    {j > 0 && <span className="text-[var(--text-muted)] text-xs">+</span>}
                    <kbd className="px-2 py-0.5 rounded bg-white/5 border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-muted)]">
                      {key}
                    </kbd>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
