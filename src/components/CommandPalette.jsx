import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ArrowRight, Brain, BarChart3, Table2, MessageSquare, Settings2, TrendingUp, FileText, Palette, Sun, Moon, Download, RotateCcw, Target, Wrench, BookOpen, Terminal, Bell } from 'lucide-react';

const COMMANDS = [
  { id: 'tab-insights', label: 'Go to AI Insights', category: 'Navigation', icon: Brain, shortcut: 'Ctrl+1' },
  { id: 'tab-charts', label: 'Go to Visualizations', category: 'Navigation', icon: BarChart3, shortcut: 'Ctrl+2' },
  { id: 'tab-forecast', label: 'Go to Forecast', category: 'Navigation', icon: TrendingUp },
  { id: 'tab-data', label: 'Go to Data Preview', category: 'Navigation', icon: Table2, shortcut: 'Ctrl+3' },
  { id: 'tab-query', label: 'Ask AI a Question', category: 'Navigation', icon: MessageSquare, shortcut: 'Ctrl+4' },
  { id: 'tab-builder', label: 'Open Chart Builder', category: 'Navigation', icon: Settings2, shortcut: 'Ctrl+5' },
  { id: 'tab-templates', label: 'Analysis Templates', category: 'Navigation', icon: FileText, shortcut: 'Ctrl+6' },
  { id: 'tab-dashboard-builder', label: 'Dashboard Builder', category: 'Navigation', icon: Settings2 },
  { id: 'theme', label: 'Toggle Dark/Light Mode', category: 'Appearance', icon: Sun, shortcut: 'Ctrl+D' },
  { id: 'export', label: 'Export as PDF', category: 'Actions', icon: Download, shortcut: 'Ctrl+E' },
  { id: 'generate-story', label: 'Generate Data Story', category: 'AI', icon: BookOpen },
  { id: 'generate-code', label: 'Generate SQL/Python Code', category: 'AI', icon: Terminal },
  { id: 'run-analysis', label: 'Re-run Analysis', category: 'Actions', icon: RotateCcw },
  { id: 'reset', label: 'New Dataset', category: 'Actions', icon: RotateCcw },
  { id: 'share', label: 'Share Report', category: 'Actions', icon: FileText },
  { id: 'alerts', label: 'View Anomaly Alerts', category: 'Data', icon: Bell },
  { id: 'goals', label: 'Goal Tracker', category: 'Data', icon: Target },
  { id: 'cleaning', label: 'Data Cleaning', category: 'Data', icon: Wrench },
];

export default function CommandPalette({ onAction, isVisible }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter commands
  const filtered = useMemo(() => {
    if (!query.trim()) return COMMANDS;
    const lower = query.toLowerCase();
    return COMMANDS.filter(cmd =>
      cmd.label.toLowerCase().includes(lower) ||
      cmd.category.toLowerCase().includes(lower)
    );
  }, [query]);

  // Group by category
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(cmd => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filtered]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[selectedIndex];
      if (cmd) {
        executeCommand(cmd);
      }
    }
  };

  const executeCommand = (cmd) => {
    setIsOpen(false);
    setQuery('');
    onAction?.(cmd.id);
  };

  if (!isOpen) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]" onClick={() => setIsOpen(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg mx-4 glass-card border border-[var(--border-active)] shadow-2xl overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)]">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-muted)]">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              No commands found for "{query}"
            </div>
          ) : (
            Object.entries(grouped).map(([category, commands]) => (
              <div key={category}>
                <p className="px-4 py-1.5 text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium">{category}</p>
                {commands.map(cmd => {
                  flatIndex++;
                  const idx = flatIndex;
                  const Icon = cmd.icon;
                  const isSelected = selectedIndex === idx;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected ? 'bg-[var(--accent-glow)]' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                      <span className={`text-sm flex-1 ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                        {cmd.label}
                      </span>
                      {cmd.shortcut && (
                        <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-[var(--border-subtle)] text-[9px] font-mono text-[var(--text-muted)]">
                          {cmd.shortcut}
                        </kbd>
                      )}
                      {isSelected && <ArrowRight className="w-3 h-3 text-[var(--accent)]" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white/5 border border-[var(--border-subtle)] font-mono">↑↓</kbd> Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white/5 border border-[var(--border-subtle)] font-mono">↵</kbd> Execute
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white/5 border border-[var(--border-subtle)] font-mono">Esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
}
