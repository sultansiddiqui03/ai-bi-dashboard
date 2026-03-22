import React, { useState, useMemo } from 'react';
import { BarChart3, LineChart, PieChart, ScatterChart as ScatterIcon, TrendingUp, Plus, X, Settings2 } from 'lucide-react';
import { prepareChartData, CHART_COLORS } from '../utils/dataProcessor';
import ChartPanel from './ChartPanel';

const CHART_TYPES = [
  { id: 'bar', label: 'Bar', icon: BarChart3 },
  { id: 'line', label: 'Line', icon: LineChart },
  { id: 'area', label: 'Area', icon: TrendingUp },
  { id: 'pie', label: 'Pie', icon: PieChart },
  { id: 'scatter', label: 'Scatter', icon: ScatterIcon },
];

const AGGREGATIONS = [
  { id: 'sum', label: 'Sum' },
  { id: 'average', label: 'Average' },
  { id: 'count', label: 'Count' },
  { id: 'min', label: 'Min' },
  { id: 'max', label: 'Max' },
];

function aggregateData(data, config) {
  const { type, x, y, aggregation } = config;

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
    return Object.entries(counts)
      .map(([name, agg]) => {
        let value;
        if (aggregation === 'average') value = agg.sum / agg.count;
        else if (aggregation === 'count') value = agg.count;
        else if (aggregation === 'min') value = agg.min;
        else if (aggregation === 'max') value = agg.max;
        else value = agg.sum;
        return { name, value: Math.round(value * 100) / 100 };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }

  if (type === 'scatter') {
    return data
      .map(row => ({ x: parseFloat(row[x]), y: parseFloat(row[y]) }))
      .filter(d => !isNaN(d.x) && !isNaN(d.y))
      .slice(0, 200);
  }

  // Bar, line, area
  const grouped = {};
  data.forEach(row => {
    const key = row[x] || 'Unknown';
    const val = parseFloat(row[y]) || 0;
    if (!grouped[key]) grouped[key] = { name: key, sum: 0, count: 0, min: Infinity, max: -Infinity };
    grouped[key].sum += val;
    grouped[key].count += 1;
    grouped[key].min = Math.min(grouped[key].min, val);
    grouped[key].max = Math.max(grouped[key].max, val);
  });

  let result = Object.values(grouped).map(d => {
    let value;
    if (aggregation === 'average') value = d.sum / d.count;
    else if (aggregation === 'count') value = d.count;
    else if (aggregation === 'min') value = d.min;
    else if (aggregation === 'max') value = d.max;
    else value = d.sum;
    return { name: d.name, value: Math.round(value * 100) / 100 };
  });

  if (result.length > 20) {
    result = result.sort((a, b) => b.value - a.value).slice(0, 20);
  }

  return result;
}

export default function ChartBuilder({ data, columns, stats }) {
  const [customCharts, setCustomCharts] = useState([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [config, setConfig] = useState({
    type: 'bar',
    x: '',
    y: '',
    aggregation: 'sum',
    title: '',
  });

  const numericCols = columns.filter(c => stats[c]?.type === 'numeric');
  const categoricalCols = columns.filter(c => stats[c]?.type === 'categorical');
  const allCols = columns;

  const xOptions = config.type === 'scatter' ? numericCols : allCols;
  const yOptions = config.type === 'pie' ? [...numericCols, { label: 'Count', value: '' }] : numericCols;

  const handleAdd = () => {
    if (!config.x || (!config.y && config.type !== 'pie')) return;
    const title = config.title || `${config.y || 'Count'} by ${config.x} (${config.aggregation})`;
    const chartData = aggregateData(data, config);
    setCustomCharts(prev => [...prev, {
      ...config,
      title,
      data: chartData,
      color: CHART_COLORS[prev.length % CHART_COLORS.length],
      id: Date.now(),
    }]);
    setConfig({ type: 'bar', x: '', y: '', aggregation: 'sum', title: '' });
    setShowBuilder(false);
  };

  const handleRemove = (id) => {
    setCustomCharts(prev => prev.filter(c => c.id !== id));
  };

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
        <button
          onClick={() => setShowBuilder(!showBuilder)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] text-[var(--bg-primary)] hover:brightness-110 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Build Chart
        </button>
      </div>

      {/* Builder panel */}
      {showBuilder && (
        <div className="glass-card p-5 space-y-4 animate-fade-in">
          {/* Chart type selector */}
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Chart Type</label>
            <div className="flex gap-2">
              {CHART_TYPES.map(ct => {
                const Icon = ct.icon;
                return (
                  <button
                    key={ct.id}
                    onClick={() => setConfig(c => ({ ...c, type: ct.id, x: '', y: '' }))}
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
                onChange={(e) => setConfig(c => ({ ...c, y: e.target.value }))}
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

          {/* Aggregation method */}
          {config.type !== 'scatter' && (
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Aggregation</label>
              <div className="flex gap-2">
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

      {/* Custom charts grid */}
      {customCharts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {customCharts.map((chart, i) => (
            <div key={chart.id} className="relative">
              <button
                onClick={() => handleRemove(chart.id)}
                className="absolute top-3 right-3 z-10 p-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all"
                title="Remove chart"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <ChartPanel chart={chart} index={i} data={data} columns={columns} stats={stats} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
