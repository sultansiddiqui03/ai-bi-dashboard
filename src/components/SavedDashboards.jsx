import React, { useState, useEffect } from 'react';
import { Layout, Save, Trash2, ChevronDown, ChevronUp, GripVertical, Plus, X, Check } from 'lucide-react';

const DEFAULT_LAYOUT = {
  id: 'default',
  name: 'Default Layout',
  panels: ['kpis', 'profiler', 'filters', 'charts', 'goals'],
  createdAt: new Date().toISOString(),
};

export default function SavedDashboards({ onLayoutChange }) {
  const [layouts, setLayouts] = useState(() => {
    try {
      const stored = localStorage.getItem('insightai-layouts');
      return stored ? JSON.parse(stored) : [DEFAULT_LAYOUT];
    } catch { return [DEFAULT_LAYOUT]; }
  });
  const [activeLayout, setActiveLayout] = useState(layouts[0]?.id || 'default');
  const [showManager, setShowManager] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);

  const save = (updated) => {
    setLayouts(updated);
    localStorage.setItem('insightai-layouts', JSON.stringify(updated));
  };

  const PANEL_OPTIONS = [
    { id: 'kpis', label: 'KPI Cards' },
    { id: 'profiler', label: 'Data Profiler' },
    { id: 'filters', label: 'Filters & Cleaning' },
    { id: 'charts', label: 'Charts' },
    { id: 'goals', label: 'Goal Tracker' },
    { id: 'forecast', label: 'Forecast Panel' },
    { id: 'joiner', label: 'Dataset Joiner' },
  ];

  const addLayout = () => {
    if (!newName.trim()) return;
    const newLayout = {
      id: `layout-${Date.now()}`,
      name: newName.trim(),
      panels: ['kpis', 'profiler', 'filters', 'charts', 'goals'],
      createdAt: new Date().toISOString(),
    };
    save([...layouts, newLayout]);
    setNewName('');
    setActiveLayout(newLayout.id);
    onLayoutChange?.(newLayout.panels);
  };

  const removeLayout = (id) => {
    if (layouts.length <= 1) return;
    const updated = layouts.filter(l => l.id !== id);
    save(updated);
    if (activeLayout === id) {
      setActiveLayout(updated[0].id);
      onLayoutChange?.(updated[0].panels);
    }
  };

  const togglePanel = (layoutId, panelId) => {
    const updated = layouts.map(l => {
      if (l.id !== layoutId) return l;
      const panels = l.panels.includes(panelId)
        ? l.panels.filter(p => p !== panelId)
        : [...l.panels, panelId];
      return { ...l, panels };
    });
    save(updated);
    const layout = updated.find(l => l.id === layoutId);
    if (layout && layoutId === activeLayout) {
      onLayoutChange?.(layout.panels);
    }
  };

  const movePanel = (layoutId, panelId, direction) => {
    const updated = layouts.map(l => {
      if (l.id !== layoutId) return l;
      const idx = l.panels.indexOf(panelId);
      if (idx < 0) return l;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= l.panels.length) return l;
      const panels = [...l.panels];
      [panels[idx], panels[newIdx]] = [panels[newIdx], panels[idx]];
      return { ...l, panels };
    });
    save(updated);
    const layout = updated.find(l => l.id === layoutId);
    if (layout && layoutId === activeLayout) {
      onLayoutChange?.(layout.panels);
    }
  };

  const switchLayout = (id) => {
    setActiveLayout(id);
    const layout = layouts.find(l => l.id === id);
    if (layout) onLayoutChange?.(layout.panels);
  };

  const currentLayout = layouts.find(l => l.id === activeLayout) || layouts[0];

  return (
    <div className="glass-card p-4">
      <button
        onClick={() => setShowManager(!showManager)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Layout className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-medium text-[var(--text-primary)]">
            Layout: {currentLayout?.name || 'Default'}
          </span>
        </div>
        {showManager ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
      </button>

      {showManager && (
        <div className="mt-4 space-y-4 animate-fade-in">
          {/* Layout selector */}
          <div className="flex flex-wrap gap-2">
            {layouts.map(l => (
              <button
                key={l.id}
                onClick={() => switchLayout(l.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeLayout === l.id
                    ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {l.name}
              </button>
            ))}
          </div>

          {/* Add layout */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addLayout()}
              placeholder="New layout name"
              className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)]"
            />
            <button onClick={addLayout} disabled={!newName.trim()} className="px-3 py-1.5 rounded-lg bg-[var(--accent)]/20 text-[var(--accent)] text-xs font-medium disabled:opacity-30">
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Panel arrangement for current layout */}
          {currentLayout && (
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">Panels</p>
              <div className="space-y-1">
                {PANEL_OPTIONS.map(panel => {
                  const isActive = currentLayout.panels.includes(panel.id);
                  const idx = currentLayout.panels.indexOf(panel.id);
                  return (
                    <div key={panel.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${isActive ? 'bg-[var(--bg-secondary)]' : 'opacity-50'}`}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePanel(currentLayout.id, panel.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center ${isActive ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--bg-primary)]' : 'border-[var(--border-subtle)]'}`}
                        >
                          {isActive && <Check className="w-2.5 h-2.5" />}
                        </button>
                        <span className="text-[var(--text-primary)]">{panel.label}</span>
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => movePanel(currentLayout.id, panel.id, -1)} disabled={idx <= 0} className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-20">
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button onClick={() => movePanel(currentLayout.id, panel.id, 1)} disabled={idx >= currentLayout.panels.length - 1} className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-20">
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Delete layout */}
          {layouts.length > 1 && (
            <button
              onClick={() => removeLayout(activeLayout)}
              className="flex items-center gap-1.5 text-[10px] text-rose-400 hover:text-rose-300"
            >
              <Trash2 className="w-3 h-3" />
              Delete "{currentLayout?.name}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
