import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon,
  ScatterChart as ScatterIcon, TrendingUp, Plus, X, Settings2,
  Download, Trash2, Sparkles, ChevronDown
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { prepareChartData, CHART_COLORS, formatNumber, computeStats } from '../utils/dataProcessor';
import ChartPanel from './ChartPanel';

const STORAGE_KEY = 'askdata-custom-charts';

const CHART_TYPES = [
  { id: 'bar', label: 'Bar', icon: BarChart3 },
  { id: 'line', label: 'Line', icon: LineChartIcon },
  { id: 'area', label: 'Area', icon: TrendingUp },
  { id: 'pie', label: 'Pie', icon: PieChartIcon },
  { id: 'scatter', label: 'Scatter', icon: ScatterIcon },
];

const AGGREGATIONS = [
  { id: 'sum', label: 'Sum' },
  { id: 'average', label: 'Average' },
  { id: 'count', label: 'Count' },
  { id: 'min', label: 'Min' },
  { id: 'max', label: 'Max' },
];

const SORT_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'desc', label: 'Descending' },
  { id: 'asc', label: 'Ascending' },
];

const LIMIT_OPTIONS = [
  { id: 5, label: '5' },
  { id: 10, label: '10' },
  { id: 15, label: '15' },
  { id: 20, label: '20' },
  { id: 0, label: 'All' },
];

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    borderRadius: '12px',
    fontSize: '11px',
    color: '#f1f5f9',
    padding: '6px 10px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  labelStyle: { color: '#94a3b8', fontSize: '10px', marginBottom: '2px' },
};

const AXIS_STYLE = {
  fontSize: 10,
  fill: '#64748b',
  fontFamily: '"JetBrains Mono", monospace',
};

const GRID_STYLE = {
  strokeDasharray: '3 3',
  stroke: 'rgba(148, 163, 184, 0.06)',
};

function aggregateData(data, config) {
  const { type, x, y, aggregation, sort = 'none', limit = 0, extraY = [] } = config;
  const allYCols = y ? [y, ...extraY] : extraY;

  if (type === 'pie') {
    const counts = {};
    data.forEach(row => {
      const key = row[x] || 'Unknown';
      const val = y ? parseFloat(row[y]) || 0 : 1;
      if (!counts[key]) counts[key] = { sum: 0, count: 0, min: Infinity, max: -Infinity };
      counts[key].sum += val;
      counts[key].count += 1;
      counts[key].min = Math.min(counts[key].min, val);
      counts[key].max = Math.max(counts[key].max, val);
    });
    let result = Object.entries(counts).map(([name, agg]) => {
      let value;
      if (aggregation === 'average') value = agg.sum / agg.count;
      else if (aggregation === 'count') value = agg.count;
      else if (aggregation === 'min') value = agg.min;
      else if (aggregation === 'max') value = agg.max;
      else value = agg.sum;
      return { name, value: Math.round(value * 100) / 100 };
    });
    if (sort === 'desc') result.sort((a, b) => b.value - a.value);
    else if (sort === 'asc') result.sort((a, b) => a.value - b.value);
    else result.sort((a, b) => b.value - a.value);
    const effectiveLimit = limit > 0 ? limit : 10;
    return result.slice(0, effectiveLimit);
  }

  if (type === 'scatter') {
    const effectiveLimit = limit > 0 ? limit : 200;
    return data
      .map(row => ({ x: parseFloat(row[x]), y: parseFloat(row[y]) }))
      .filter(d => !isNaN(d.x) && !isNaN(d.y))
      .slice(0, effectiveLimit);
  }

  // Bar, line, area -- support multi-series
  const grouped = {};
  data.forEach(row => {
    const key = row[x] || 'Unknown';
    if (!grouped[key]) {
      grouped[key] = { name: key };
      allYCols.forEach(col => {
        grouped[key][`${col}_sum`] = 0;
        grouped[key][`${col}_count`] = 0;
        grouped[key][`${col}_min`] = Infinity;
        grouped[key][`${col}_max`] = -Infinity;
      });
    }
    allYCols.forEach(col => {
      const val = parseFloat(row[col]) || 0;
      grouped[key][`${col}_sum`] += val;
      grouped[key][`${col}_count`] += 1;
      grouped[key][`${col}_min`] = Math.min(grouped[key][`${col}_min`], val);
      grouped[key][`${col}_max`] = Math.max(grouped[key][`${col}_max`], val);
    });
  });

  let result = Object.values(grouped).map(d => {
    const row = { name: d.name };
    allYCols.forEach(col => {
      let value;
      if (aggregation === 'average') value = d[`${col}_sum`] / d[`${col}_count`];
      else if (aggregation === 'count') value = d[`${col}_count`];
      else if (aggregation === 'min') value = d[`${col}_min`];
      else if (aggregation === 'max') value = d[`${col}_max`];
      else value = d[`${col}_sum`];
      row[col] = Math.round(value * 100) / 100;
    });
    // Keep a "value" field for backward compat with single-series
    if (allYCols.length === 1) {
      row.value = row[allYCols[0]];
    }
    return row;
  });

  // Sort
  const sortKey = allYCols.length === 1 ? 'value' : allYCols[0];
  if (sort === 'desc') result.sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));
  else if (sort === 'asc') result.sort((a, b) => (a[sortKey] || 0) - (b[sortKey] || 0));

  // Limit
  const effectiveLimit = limit > 0 ? limit : 20;
  if (result.length > effectiveLimit) {
    result = result.slice(0, effectiveLimit);
  }

  return result;
}

function exportChartCSV(chart) {
  const chartData = chart.data;
  if (!chartData || chartData.length === 0) return;
  const headers = Object.keys(chartData[0]);
  const csvRows = [headers.join(',')];
  chartData.forEach(row => {
    csvRows.push(headers.map(h => {
      const val = row[h];
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return val ?? '';
    }).join(','));
  });
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(chart.title || 'chart').replace(/[^a-z0-9]/gi, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function PreviewChart({ type, previewData, color, extraY, y }) {
  const allYCols = y ? [y, ...(extraY || [])] : [];
  const multiSeries = allYCols.length > 1;

  if (!previewData || previewData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-xs">
        Configure options to see preview
      </div>
    );
  }

  const renderMultiBars = () =>
    allYCols.map((col, i) => (
      <Bar key={col} dataKey={col} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={30} fillOpacity={0.85} />
    ));

  const renderMultiLines = () =>
    allYCols.map((col, i) => (
      <Line key={col} type="monotone" dataKey={col} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 2 }} />
    ));

  const renderMultiAreas = () =>
    allYCols.map((col, i) => {
      const c = CHART_COLORS[i % CHART_COLORS.length];
      return (
        <Area key={col} type="monotone" dataKey={col} stroke={c} strokeWidth={1.5} fill={c} fillOpacity={0.15} />
      );
    });

  switch (type) {
    case 'bar':
      return (
        <BarChart data={previewData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={45} />
          <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={45} />
          <Tooltip {...TOOLTIP_STYLE} />
          {multiSeries ? renderMultiBars() : (
            <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={30} fillOpacity={0.85} />
          )}
        </BarChart>
      );
    case 'line':
      return (
        <LineChart data={previewData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={45} />
          <Tooltip {...TOOLTIP_STYLE} />
          {multiSeries ? renderMultiLines() : (
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 2 }} />
          )}
        </LineChart>
      );
    case 'area':
      return (
        <AreaChart data={previewData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={45} />
          <Tooltip {...TOOLTIP_STYLE} />
          {multiSeries ? renderMultiAreas() : (
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={color} fillOpacity={0.15} />
          )}
        </AreaChart>
      );
    case 'pie':
      return (
        <PieChart>
          <Pie
            data={previewData}
            cx="50%"
            cy="50%"
            innerRadius={30}
            outerRadius={55}
            dataKey="value"
            paddingAngle={2}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            labelLine={{ stroke: '#64748b', strokeWidth: 0.5 }}
          >
            {previewData.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP_STYLE} />
        </PieChart>
      );
    case 'scatter':
      return (
        <ScatterChart margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis dataKey="x" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis dataKey="y" tick={AXIS_STYLE} tickLine={false} axisLine={false} width={45} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Scatter data={previewData} fill={color} fillOpacity={0.6} />
        </ScatterChart>
      );
    default:
      return null;
  }
}

export default function ChartBuilder({ data, columns, stats }) {
  const [customCharts, setCustomCharts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showBuilder, setShowBuilder] = useState(false);
  const [config, setConfig] = useState({
    type: 'bar',
    x: '',
    y: '',
    aggregation: 'sum',
    title: '',
    sort: 'none',
    limit: 0,
    color: CHART_COLORS[0],
    extraY: [],
  });

  const numericCols = useMemo(() => columns.filter(c => stats[c]?.type === 'numeric'), [columns, stats]);
  const categoricalCols = useMemo(() => columns.filter(c => stats[c]?.type === 'categorical'), [columns, stats]);
  const allCols = columns;

  const xOptions = config.type === 'scatter' ? numericCols : allCols;

  // Save to localStorage whenever customCharts changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customCharts));
    } catch {
      // Silently fail if storage is full
    }
  }, [customCharts]);

  // Live preview data
  const previewData = useMemo(() => {
    if (!config.x) return [];
    if (!config.y && config.type !== 'pie') return [];
    try {
      return aggregateData(data, config);
    } catch {
      return [];
    }
  }, [data, config]);

  const handleAdd = useCallback(() => {
    if (!config.x || (!config.y && config.type !== 'pie')) return;
    const title = config.title || `${config.y || 'Count'} by ${config.x} (${config.aggregation})`;
    const chartData = aggregateData(data, config);
    const allYCols = config.y ? [config.y, ...config.extraY] : [];
    setCustomCharts(prev => [...prev, {
      ...config,
      title,
      data: chartData,
      color: config.color,
      extraY: config.extraY,
      allYCols,
      id: Date.now(),
    }]);
    setConfig({
      type: 'bar', x: '', y: '', aggregation: 'sum', title: '',
      sort: 'none', limit: 0, color: CHART_COLORS[0], extraY: [],
    });
    setShowBuilder(false);
  }, [config, data]);

  const handleRemove = useCallback((id) => {
    setCustomCharts(prev => prev.filter(c => c.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    setCustomCharts([]);
  }, []);

  const handleAddSeries = useCallback(() => {
    const usedCols = new Set([config.y, ...config.extraY]);
    const available = numericCols.filter(c => !usedCols.has(c));
    if (available.length > 0) {
      setConfig(c => ({ ...c, extraY: [...c.extraY, available[0]] }));
    }
  }, [config.y, config.extraY, numericCols]);

  const handleRemoveSeries = useCallback((index) => {
    setConfig(c => ({
      ...c,
      extraY: c.extraY.filter((_, i) => i !== index),
    }));
  }, []);

  const handleUpdateSeries = useCallback((index, value) => {
    setConfig(c => ({
      ...c,
      extraY: c.extraY.map((v, i) => i === index ? value : v),
    }));
  }, []);

  const applySuggestion = useCallback((xCol, yCol) => {
    setConfig(c => ({
      ...c,
      type: 'bar',
      x: xCol,
      y: yCol,
      aggregation: 'sum',
      sort: 'desc',
      limit: 10,
      extraY: [],
    }));
    setShowBuilder(true);
  }, []);

  const supportsMultiSeries = ['bar', 'line', 'area'].includes(config.type);
  const canAddSeries = supportsMultiSeries && config.y;
  const usedYCols = new Set([config.y, ...config.extraY]);
  const availableForSeries = numericCols.filter(c => !usedYCols.has(c));

  if (!data || !columns.length) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-sm font-medium text-[var(--text-primary)]">Custom Charts</h3>
          {customCharts.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)]">
              {customCharts.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {customCharts.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all"
            >
              <Trash2 className="w-3 h-3" />
              Clear All
            </button>
          )}
          <button
            onClick={() => setShowBuilder(!showBuilder)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] text-[var(--bg-primary)] hover:brightness-110 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Build Chart
          </button>
        </div>
      </div>

      {/* Builder panel */}
      {showBuilder && (
        <div className="glass-card p-5 space-y-4 animate-fade-in">
          {/* Chart type selector */}
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Chart Type</label>
            <div className="flex gap-2 flex-wrap">
              {CHART_TYPES.map(ct => {
                const Icon = ct.icon;
                return (
                  <button
                    key={ct.id}
                    onClick={() => setConfig(c => ({ ...c, type: ct.id, x: '', y: '', extraY: [] }))}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      config.type === ct.id
                        ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                        : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {ct.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* X and Y axis selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
                {config.type === 'scatter' ? 'X Axis (numeric)' : 'Category / X Axis'}
              </label>
              <select
                value={config.x}
                onChange={(e) => setConfig(c => ({ ...c, x: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]"
              >
                <option value="">Select column...</option>
                {xOptions.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
                {config.type === 'pie' ? 'Value (optional)' : 'Value / Y Axis'}
              </label>
              <select
                value={config.y}
                onChange={(e) => setConfig(c => ({ ...c, y: e.target.value, extraY: [] }))}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]"
              >
                <option value="">
                  {config.type === 'pie' ? 'Count (default)' : 'Select column...'}
                </option>
                {numericCols.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Multi-Series (extra Y columns) */}
          {supportsMultiSeries && config.extraY.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider block">Additional Series</label>
              {config.extraY.map((col, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CHART_COLORS[(idx + 1) % CHART_COLORS.length] }}
                  />
                  <select
                    value={col}
                    onChange={(e) => handleUpdateSeries(idx, e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]"
                  >
                    {numericCols.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRemoveSeries(idx)}
                    className="p-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {canAddSeries && availableForSeries.length > 0 && (
            <button
              onClick={handleAddSeries}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-[var(--accent)] hover:bg-white/10 transition-all border border-dashed border-[var(--border-subtle)]"
            >
              <Plus className="w-3 h-3" />
              Add Series
            </button>
          )}

          {/* Aggregation method */}
          {config.type !== 'scatter' && (
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Aggregation</label>
              <div className="flex gap-2 flex-wrap">
                {AGGREGATIONS.map(agg => (
                  <button
                    key={agg.id}
                    onClick={() => setConfig(c => ({ ...c, aggregation: agg.id }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      config.aggregation === agg.id
                        ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30'
                        : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
                    }`}
                  >
                    {agg.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sort & Limit controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Sort</label>
              <div className="flex gap-2">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setConfig(c => ({ ...c, sort: opt.id }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      config.sort === opt.id
                        ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30'
                        : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Limit</label>
              <div className="flex gap-2 flex-wrap">
                {LIMIT_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setConfig(c => ({ ...c, limit: opt.id }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      config.limit === opt.id
                        ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30'
                        : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Primary Color</label>
            <div className="flex gap-2 flex-wrap">
              {CHART_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setConfig(prev => ({ ...prev, color: c }))}
                  className={`w-7 h-7 rounded-lg transition-all ${
                    config.color === c
                      ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-card)] ring-[var(--accent)] scale-110'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Title input */}
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Chart Title (optional)</label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig(c => ({ ...c, title: e.target.value }))}
              placeholder="Auto-generated if empty..."
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)]"
            />
          </div>

          {/* Live Preview */}
          {previewData.length > 0 && (
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Preview</label>
              <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-3">
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PreviewChart
                      type={config.type}
                      previewData={previewData}
                      color={config.color}
                      extraY={config.extraY}
                      y={config.y}
                    />
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-2 text-center">
                  {previewData.length} data points
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleAdd}
              disabled={!config.x || (!config.y && config.type !== 'pie')}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] text-sm font-medium hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Add Chart
            </button>
            <button
              onClick={() => setShowBuilder(false)}
              className="px-4 py-2 rounded-lg bg-white/5 text-[var(--text-secondary)] text-sm hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty State with suggestions */}
      {customCharts.length === 0 && !showBuilder && (
        <div className="glass-card p-6 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--accent)]/10 mb-2">
            <Sparkles className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">No custom charts yet</p>
            <p className="text-xs text-[var(--text-muted)]">
              Build your own visualizations by clicking "Build Chart" above, or try one of these quick starts:
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {categoricalCols.length > 0 && numericCols.length > 0 && (
              <button
                onClick={() => applySuggestion(categoricalCols[0], numericCols[0])}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--accent)] transition-all border border-[var(--border-subtle)]"
              >
                Bar chart of <span className="text-[var(--accent)]">{categoricalCols[0]}</span> by <span className="text-[var(--accent)]">{numericCols[0]}</span>
              </button>
            )}
            {categoricalCols.length > 0 && numericCols.length > 1 && (
              <button
                onClick={() => applySuggestion(categoricalCols[0], numericCols[1])}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--accent)] transition-all border border-[var(--border-subtle)]"
              >
                Bar chart of <span className="text-[var(--accent)]">{categoricalCols[0]}</span> by <span className="text-[var(--accent)]">{numericCols[1]}</span>
              </button>
            )}
            {categoricalCols.length > 1 && numericCols.length > 0 && (
              <button
                onClick={() => applySuggestion(categoricalCols[1], numericCols[0])}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--accent)] transition-all border border-[var(--border-subtle)]"
              >
                Bar chart of <span className="text-[var(--accent)]">{categoricalCols[1]}</span> by <span className="text-[var(--accent)]">{numericCols[0]}</span>
              </button>
            )}
            {numericCols.length >= 2 && (
              <button
                onClick={() => {
                  setConfig(c => ({
                    ...c,
                    type: 'scatter',
                    x: numericCols[0],
                    y: numericCols[1],
                    extraY: [],
                  }));
                  setShowBuilder(true);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--accent)] transition-all border border-[var(--border-subtle)]"
              >
                Scatter of <span className="text-[var(--accent)]">{numericCols[0]}</span> vs <span className="text-[var(--accent)]">{numericCols[1]}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Custom charts grid */}
      {customCharts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {customCharts.map((chart, i) => (
            <div key={chart.id} className="relative">
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
                <button
                  onClick={() => exportChartCSV(chart)}
                  className="p-1 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-all"
                  title="Export as CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleRemove(chart.id)}
                  className="p-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all"
                  title="Remove chart"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <ChartPanel chart={chart} index={i} data={data} columns={columns} stats={stats} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
