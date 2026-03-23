import React, { useState, useCallback, useRef } from 'react';
import { GripVertical, Plus, X, Move, Maximize2, Minimize2, Settings, Save, BarChart3, Hash, FileText, Target } from 'lucide-react';

const WIDGET_TYPES = [
  { id: 'kpi', label: 'KPI Card', icon: Hash, defaultSize: { w: 1, h: 1 } },
  { id: 'chart', label: 'Chart', icon: BarChart3, defaultSize: { w: 2, h: 2 } },
  { id: 'text', label: 'Text Note', icon: FileText, defaultSize: { w: 2, h: 1 } },
  { id: 'metric', label: 'Metric Highlight', icon: Target, defaultSize: { w: 1, h: 1 } },
];

const GRID_COLS = 4;

export default function DashboardBuilder({ metrics, charts, stats, columns }) {
  const [widgets, setWidgets] = useState([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [dragItem, setDragItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const gridRef = useRef(null);

  const addWidget = (type) => {
    const typeInfo = WIDGET_TYPES.find(t => t.id === type);
    const newWidget = {
      id: `widget-${Date.now()}`,
      type,
      position: widgets.length,
      size: typeInfo?.defaultSize || { w: 1, h: 1 },
      config: getDefaultConfig(type, metrics, charts, stats, columns),
    };
    setWidgets(prev => [...prev, newWidget]);
    setShowAddMenu(false);
  };

  const removeWidget = (id) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  };

  const toggleWidgetSize = (id) => {
    setWidgets(prev => prev.map(w => {
      if (w.id !== id) return w;
      return { ...w, size: { w: w.size.w === 2 ? 1 : 2, h: w.size.h } };
    }));
  };

  const moveWidget = (fromIdx, toIdx) => {
    setWidgets(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      return updated;
    });
  };

  const handleDragStart = (e, index) => {
    setDragItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragItem === null || dragItem === index) return;
    moveWidget(dragItem, index);
    setDragItem(index);
  };

  const handleDragEnd = () => {
    setDragItem(null);
  };

  const updateWidgetConfig = (id, key, value) => {
    setWidgets(prev => prev.map(w => {
      if (w.id !== id) return w;
      return { ...w, config: { ...w.config, [key]: value } };
    }));
  };

  const saveLayout = () => {
    const layouts = JSON.parse(localStorage.getItem('insightai-builder-layouts') || '[]');
    layouts.push({ id: Date.now(), widgets, savedAt: new Date().toISOString() });
    localStorage.setItem('insightai-builder-layouts', JSON.stringify(layouts.slice(-10)));
  };

  const numericCols = columns.filter(c => stats[c]?.type === 'numeric');

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isEditing ? 'bg-[var(--accent)] text-[var(--bg-primary)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}>
            <Settings className="w-3 h-3" />
            {isEditing ? 'Done Editing' : 'Edit Layout'}
          </button>
          {isEditing && (
            <button onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-glow)] text-[var(--accent)]">
              <Plus className="w-3 h-3" /> Add Widget
            </button>
          )}
        </div>
        {widgets.length > 0 && (
          <button onClick={saveLayout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <Save className="w-3 h-3" /> Save Layout
          </button>
        )}
      </div>

      {/* Add widget menu */}
      {showAddMenu && (
        <div className="glass-card p-4 animate-fade-in">
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-3">Add Widget</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {WIDGET_TYPES.map(type => {
              const Icon = type.icon;
              return (
                <button key={type.id} onClick={() => addWidget(type.id)}
                  className="flex items-center gap-2 p-3 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-active)] hover:bg-[var(--accent-glow)] transition-all">
                  <Icon className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-xs text-[var(--text-primary)]">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Widget grid */}
      {widgets.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Move className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-sm text-[var(--text-muted)]">No widgets yet. Click "Edit Layout" then "Add Widget" to start building.</p>
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {widgets.map((widget, index) => (
            <div
              key={widget.id}
              draggable={isEditing}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`glass-card p-4 transition-all ${
                widget.size.w === 2 ? 'col-span-2' : 'col-span-1'
              } ${isEditing ? 'ring-1 ring-[var(--border-active)] ring-dashed cursor-move' : ''} ${
                dragItem === index ? 'opacity-50' : ''
              }`}
            >
              {/* Widget header */}
              {isEditing && (
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <GripVertical className="w-3 h-3 text-[var(--text-muted)]" />
                    <span className="text-[10px] text-[var(--text-muted)] uppercase">{widget.type}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleWidgetSize(widget.id)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                      {widget.size.w === 2 ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                    </button>
                    <button onClick={() => removeWidget(widget.id)} className="p-1 text-[var(--text-muted)] hover:text-rose-400">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Widget content */}
              <WidgetContent
                widget={widget}
                metrics={metrics}
                charts={charts}
                stats={stats}
                columns={columns}
                isEditing={isEditing}
                onConfigChange={(key, val) => updateWidgetConfig(widget.id, key, val)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getDefaultConfig(type, metrics, charts, stats, columns) {
  const numericCols = columns.filter(c => stats[c]?.type === 'numeric');
  switch (type) {
    case 'kpi':
      return { metricIndex: 0 };
    case 'chart':
      return { chartIndex: 0 };
    case 'text':
      return { text: 'Add your notes here...' };
    case 'metric':
      return { column: numericCols[0] || '', aggregation: 'mean' };
    default:
      return {};
  }
}

function WidgetContent({ widget, metrics, charts, stats, columns, isEditing, onConfigChange }) {
  const numericCols = columns.filter(c => stats[c]?.type === 'numeric');

  switch (widget.type) {
    case 'kpi': {
      const metric = metrics[widget.config.metricIndex];
      if (isEditing) {
        return (
          <div>
            <select value={widget.config.metricIndex} onChange={e => onConfigChange('metricIndex', parseInt(e.target.value))}
              className="w-full px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] mb-2">
              {metrics.map((m, i) => <option key={i} value={i}>{m.name}</option>)}
            </select>
            {metric && <p className="text-lg font-semibold font-mono text-[var(--accent)]">{metric.value}</p>}
          </div>
        );
      }
      if (!metric) return <p className="text-xs text-[var(--text-muted)]">No metric data</p>;
      return (
        <div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">{metric.name}</p>
          <p className="text-2xl font-semibold font-mono text-[var(--text-primary)]">{metric.value}</p>
          {metric.change && <p className={`text-xs mt-1 ${metric.change.includes('+') ? 'text-emerald-400' : 'text-rose-400'}`}>{metric.change}</p>}
        </div>
      );
    }

    case 'chart': {
      const chart = charts[widget.config.chartIndex];
      if (isEditing) {
        return (
          <div>
            <select value={widget.config.chartIndex} onChange={e => onConfigChange('chartIndex', parseInt(e.target.value))}
              className="w-full px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] mb-2">
              {charts.map((c, i) => <option key={i} value={i}>{c.title || `Chart ${i + 1}`}</option>)}
            </select>
            {chart && <p className="text-xs text-[var(--text-muted)]">{chart.type} chart: {chart.title}</p>}
          </div>
        );
      }
      if (!chart) return <p className="text-xs text-[var(--text-muted)]">No chart data</p>;
      return (
        <div>
          <p className="text-xs font-medium text-[var(--text-primary)] mb-1">{chart.title}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{chart.type} · {chart.x} → {chart.y}</p>
        </div>
      );
    }

    case 'text': {
      if (isEditing) {
        return (
          <textarea
            value={widget.config.text}
            onChange={e => onConfigChange('text', e.target.value)}
            className="w-full h-20 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] resize-none focus:outline-none focus:border-[var(--border-active)]"
          />
        );
      }
      return <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{widget.config.text}</p>;
    }

    case 'metric': {
      if (isEditing) {
        return (
          <div className="space-y-2">
            <select value={widget.config.column} onChange={e => onConfigChange('column', e.target.value)}
              className="w-full px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]">
              {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={widget.config.aggregation} onChange={e => onConfigChange('aggregation', e.target.value)}
              className="w-full px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]">
              <option value="mean">Average</option>
              <option value="sum">Sum</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
              <option value="median">Median</option>
            </select>
          </div>
        );
      }
      const stat = stats[widget.config.column];
      if (!stat) return <p className="text-xs text-[var(--text-muted)]">No data</p>;
      const value = stat[widget.config.aggregation] ?? stat.mean;
      return (
        <div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
            {widget.config.aggregation} of {widget.config.column}
          </p>
          <p className="text-2xl font-semibold font-mono text-[var(--text-primary)]">
            {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}
          </p>
        </div>
      );
    }

    default:
      return <p className="text-xs text-[var(--text-muted)]">Unknown widget type</p>;
  }
}
