import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  GripVertical, Plus, X, Move, Maximize2, Minimize2, Settings, Save,
  BarChart3, Hash, FileText, Target, Layout, Table2, GitCompare,
  Sparkles, Clock, Layers, TrendingUp, PieChart as PieIcon, Search
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { prepareChartData, CHART_COLORS, formatNumber, computeStats } from '../utils/dataProcessor';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#f1f5f9',
    padding: '8px 12px',
  },
};

const AXIS_STYLE = { fontSize: 10, fill: '#64748b', fontFamily: '"JetBrains Mono", monospace' };

const WIDGET_TYPES = [
  { id: 'kpi', label: 'KPI Card', icon: Hash, defaultSize: { w: 1, h: 1 } },
  { id: 'chart', label: 'Chart', icon: BarChart3, defaultSize: { w: 2, h: 2 } },
  { id: 'text', label: 'Text Note', icon: FileText, defaultSize: { w: 2, h: 1 } },
  { id: 'metric', label: 'Metric Highlight', icon: Target, defaultSize: { w: 1, h: 1 } },
  { id: 'table', label: 'Data Table', icon: Table2, defaultSize: { w: 2, h: 2 } },
  { id: 'comparison', label: 'Comparison', icon: GitCompare, defaultSize: { w: 2, h: 1 } },
];

const GRID_COLS = 4;
const STORAGE_KEY = 'askdata-builder-layouts';

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function buildTemplates(metrics, charts, stats, columns, data) {
  const numericCols = columns.filter(c => stats[c]?.type === 'numeric');
  const categoricalCols = columns.filter(c => stats[c]?.type === 'categorical');

  const barChart = charts.find(c => c.type === 'bar');
  const lineChart = charts.find(c => c.type === 'line' || c.type === 'area');
  const pieChart = charts.find(c => c.type === 'pie');
  const scatterChart = charts.find(c => c.type === 'scatter');

  const barIdx = barChart ? charts.indexOf(barChart) : 0;
  const lineIdx = lineChart ? charts.indexOf(lineChart) : Math.min(1, charts.length - 1);
  const pieIdx = pieChart ? charts.indexOf(pieChart) : Math.min(2, charts.length - 1);
  const scatterIdx = scatterChart ? charts.indexOf(scatterChart) : 0;

  return [
    {
      id: 'executive',
      name: 'Executive Overview',
      description: 'Top KPIs, main bar chart, trend line, and distribution pie',
      icon: Layout,
      color: '#38bdf8',
      widgets: [
        ...(metrics.slice(0, 3).map((_, i) => ({
          id: `tpl-kpi-${i}-${Date.now()}`,
          type: 'kpi',
          position: i,
          size: { w: 1, h: 1 },
          config: { metricIndex: i },
        }))),
        ...(charts.length > 0 ? [{
          id: `tpl-bar-${Date.now()}`,
          type: 'chart',
          position: 3,
          size: { w: 2, h: 2 },
          config: { chartIndex: barIdx },
        }] : []),
        ...(charts.length > 1 ? [{
          id: `tpl-line-${Date.now()}`,
          type: 'chart',
          position: 4,
          size: { w: 2, h: 2 },
          config: { chartIndex: lineIdx },
        }] : []),
        ...(charts.length > 2 ? [{
          id: `tpl-pie-${Date.now()}`,
          type: 'chart',
          position: 5,
          size: { w: 2, h: 2 },
          config: { chartIndex: pieIdx },
        }] : []),
      ],
    },
    {
      id: 'explorer',
      name: 'Data Explorer',
      description: 'All numeric metric highlights with scatter plot',
      icon: Search,
      color: '#34d399',
      widgets: [
        ...numericCols.slice(0, 4).map((col, i) => ({
          id: `tpl-metric-${i}-${Date.now()}`,
          type: 'metric',
          position: i,
          size: { w: 1, h: 1 },
          config: { column: col, aggregation: 'mean' },
        })),
        ...(charts.length > 0 ? [{
          id: `tpl-scatter-${Date.now()}`,
          type: 'chart',
          position: numericCols.slice(0, 4).length,
          size: { w: 2, h: 2 },
          config: { chartIndex: scatterIdx },
        }] : []),
        ...(columns.length > 0 ? [{
          id: `tpl-table-${Date.now()}`,
          type: 'table',
          position: numericCols.slice(0, 4).length + 1,
          size: { w: 2, h: 2 },
          config: { columns: columns.slice(0, 5), rowCount: 5 },
        }] : []),
      ],
    },
    {
      id: 'performance',
      name: 'Performance Tracker',
      description: 'KPIs with area chart and goal metrics',
      icon: TrendingUp,
      color: '#fbbf24',
      widgets: [
        ...(metrics.slice(0, 2).map((_, i) => ({
          id: `tpl-perf-kpi-${i}-${Date.now()}`,
          type: 'kpi',
          position: i,
          size: { w: 1, h: 1 },
          config: { metricIndex: i },
        }))),
        ...(numericCols.length >= 2 ? [{
          id: `tpl-comp-${Date.now()}`,
          type: 'comparison',
          position: 2,
          size: { w: 2, h: 1 },
          config: { columnA: numericCols[0], columnB: numericCols[1], aggregation: 'mean' },
        }] : []),
        ...(charts.length > 0 ? [{
          id: `tpl-area-${Date.now()}`,
          type: 'chart',
          position: 3,
          size: { w: 2, h: 2 },
          config: { chartIndex: lineIdx },
        }] : []),
        ...numericCols.slice(0, 2).map((col, i) => ({
          id: `tpl-perf-metric-${i}-${Date.now()}`,
          type: 'metric',
          position: 4 + i,
          size: { w: 1, h: 1 },
          config: { column: col, aggregation: 'sum' },
        })),
      ],
    },
    {
      id: 'summary',
      name: 'Quick Summary',
      description: 'A compact text note with key metrics at a glance',
      icon: Layers,
      color: '#a78bfa',
      widgets: [
        {
          id: `tpl-sum-text-${Date.now()}`,
          type: 'text',
          position: 0,
          size: { w: 2, h: 1 },
          config: { text: `**Dashboard Summary**\nDataset has ${columns.length} columns and ${(data || []).length} rows.\nNumeric columns: ${numericCols.join(', ') || 'none'}` },
        },
        ...(metrics.slice(0, 4).map((_, i) => ({
          id: `tpl-sum-kpi-${i}-${Date.now()}`,
          type: 'kpi',
          position: 1 + i,
          size: { w: 1, h: 1 },
          config: { metricIndex: i },
        }))),
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Helper: render mini chart from Recharts config
// ---------------------------------------------------------------------------

function renderMiniChart(chartConfig, chartData, color, height) {
  if (!chartData || chartData.length === 0) {
    return <p className="text-xs text-[var(--text-muted)] italic">No chart data available</p>;
  }

  const { type } = chartConfig;

  switch (type) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={36} tickFormatter={formatNumber} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatNumber(v)} />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'line':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={36} tickFormatter={formatNumber} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatNumber(v)} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      );

    case 'area':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id={`areaGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={36} tickFormatter={formatNumber} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatNumber(v)} />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#areaGrad-${color.replace('#', '')})`} />
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'pie':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={height * 0.35} innerRadius={height * 0.18} paddingAngle={2} strokeWidth={0}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatNumber(v)} />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'scatter':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="x" tick={AXIS_STYLE} tickLine={false} axisLine={false} name={chartConfig.x} tickFormatter={formatNumber} />
            <YAxis dataKey="y" tick={AXIS_STYLE} tickLine={false} axisLine={false} width={36} name={chartConfig.y} tickFormatter={formatNumber} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatNumber(v)} />
            <Scatter data={chartData} fill={color} fillOpacity={0.7} r={3} />
          </ScatterChart>
        </ResponsiveContainer>
      );

    default:
      // Fallback to bar
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={36} tickFormatter={formatNumber} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatNumber(v)} />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
  }
}

// ---------------------------------------------------------------------------
// Helper: render sparkline for metric widgets
// ---------------------------------------------------------------------------

function renderSparkline(data, column, color) {
  if (!data || data.length === 0) return null;

  // Sample up to 50 data points for the sparkline
  const step = Math.max(1, Math.floor(data.length / 50));
  const sparkData = [];
  for (let i = 0; i < data.length; i += step) {
    const val = parseFloat(data[i][column]);
    if (!isNaN(val)) sparkData.push({ v: val });
  }
  if (sparkData.length < 2) return null;

  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${column.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${column.replace(/\W/g, '')})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Helper: render bold markdown-like text (**text**)
// ---------------------------------------------------------------------------

function renderRichText(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-[var(--text-primary)]">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

// ---------------------------------------------------------------------------
// Default configs for widget types
// ---------------------------------------------------------------------------

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
    case 'table':
      return { columns: columns.slice(0, 5), rowCount: 5 };
    case 'comparison':
      return {
        columnA: numericCols[0] || '',
        columnB: numericCols[1] || numericCols[0] || '',
        aggregation: 'mean',
      };
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// Widget content renderer
// ---------------------------------------------------------------------------

function WidgetContent({ widget, metrics, charts, stats, columns, data, isEditing, onConfigChange }) {
  const numericCols = columns.filter(c => stats[c]?.type === 'numeric');

  switch (widget.type) {
    // ---- KPI Card ----
    case 'kpi': {
      const metric = metrics[widget.config.metricIndex];
      if (isEditing) {
        return (
          <div>
            <select
              value={widget.config.metricIndex}
              onChange={e => onConfigChange('metricIndex', parseInt(e.target.value))}
              className="w-full px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] mb-2"
            >
              {metrics.map((m, i) => <option key={i} value={i}>{m.name}</option>)}
            </select>
            {metric && <p className="text-lg font-semibold font-mono text-[var(--accent)]">{metric.value}</p>}
          </div>
        );
      }
      if (!metric) return <p className="text-xs text-[var(--text-muted)]">No metric data</p>;

      const isPositive = metric.change && (metric.change.includes('+') || parseFloat(metric.change) > 0);
      const isNegative = metric.change && (metric.change.includes('-') || parseFloat(metric.change) < 0);

      return (
        <div className="relative overflow-hidden rounded-lg">
          {/* Subtle gradient background */}
          <div
            className="absolute inset-0 opacity-[0.07] rounded-lg"
            style={{
              background: isPositive
                ? 'linear-gradient(135deg, #34d399, transparent)'
                : isNegative
                  ? 'linear-gradient(135deg, #fb7185, transparent)'
                  : 'linear-gradient(135deg, var(--accent), transparent)',
            }}
          />
          <div className="relative">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">{metric.name}</p>
            <p className="text-2xl font-semibold font-mono text-[var(--text-primary)]">{metric.value}</p>
            {metric.change && (
              <p className={`text-xs mt-1 font-medium ${isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-[var(--text-muted)]'}`}>
                {metric.change}
              </p>
            )}
          </div>
        </div>
      );
    }

    // ---- Chart Widget ----
    case 'chart': {
      const chart = charts[widget.config.chartIndex];
      if (isEditing) {
        return (
          <div>
            <select
              value={widget.config.chartIndex}
              onChange={e => onConfigChange('chartIndex', parseInt(e.target.value))}
              className="w-full px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] mb-2"
            >
              {charts.map((c, i) => <option key={i} value={i}>{c.title || `Chart ${i + 1}`}</option>)}
            </select>
            {chart && <p className="text-xs text-[var(--text-muted)]">{chart.type} chart: {chart.title}</p>}
          </div>
        );
      }
      if (!chart) return <p className="text-xs text-[var(--text-muted)]">No chart data</p>;

      const chartData = data ? prepareChartData(data, chart) : [];
      const chartHeight = widget.size.w === 2 ? 300 : 200;
      const color = CHART_COLORS[widget.config.chartIndex % CHART_COLORS.length];

      return (
        <div>
          <p className="text-xs font-medium text-[var(--text-primary)] mb-2">{chart.title}</p>
          <p className="text-[10px] text-[var(--text-muted)] mb-2">{chart.type} &middot; {chart.x} &rarr; {chart.y}</p>
          {renderMiniChart(chart, chartData, color, chartHeight)}
        </div>
      );
    }

    // ---- Text Widget ----
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
      return (
        <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
          {widget.config.text.split('\n').map((line, i) => (
            <div key={i}>{renderRichText(line)}</div>
          ))}
        </div>
      );
    }

    // ---- Metric Highlight ----
    case 'metric': {
      if (isEditing) {
        return (
          <div className="space-y-2">
            <select
              value={widget.config.column}
              onChange={e => onConfigChange('column', e.target.value)}
              className="w-full px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
            >
              {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={widget.config.aggregation}
              onChange={e => onConfigChange('aggregation', e.target.value)}
              className="w-full px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
            >
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
      const range = stat.max - stat.min;
      const pct = range > 0 ? ((value - stat.min) / range) * 100 : 50;

      return (
        <div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
            {widget.config.aggregation} of {widget.config.column}
          </p>
          <p className="text-2xl font-semibold font-mono text-[var(--text-primary)]">
            {formatNumber(value)}
          </p>
          {/* Sparkline */}
          <div className="mt-1">
            {renderSparkline(data, widget.config.column, CHART_COLORS[0])}
          </div>
          {/* Min/max range indicator */}
          <div className="mt-1">
            <div className="flex justify-between text-[9px] text-[var(--text-muted)] font-mono">
              <span>{formatNumber(stat.min)}</span>
              <span>{formatNumber(stat.max)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--bg-secondary)] mt-0.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(2, Math.min(98, pct))}%`,
                  background: `linear-gradient(90deg, ${CHART_COLORS[0]}, ${CHART_COLORS[1]})`,
                }}
              />
            </div>
          </div>
        </div>
      );
    }

    // ---- Table Widget ----
    case 'table': {
      const tableCols = widget.config.columns || columns.slice(0, 5);
      const rowCount = widget.config.rowCount || 5;

      if (isEditing) {
        return (
          <div className="space-y-2">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Select columns (comma-separated)</p>
            <input
              type="text"
              value={(widget.config.columns || []).join(', ')}
              onChange={e => {
                const cols = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                onConfigChange('columns', cols);
              }}
              className="w-full px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
              placeholder={columns.slice(0, 3).join(', ')}
            />
            <select
              value={rowCount}
              onChange={e => onConfigChange('rowCount', parseInt(e.target.value))}
              className="w-full px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
            >
              {[3, 5, 8, 10].map(n => <option key={n} value={n}>{n} rows</option>)}
            </select>
          </div>
        );
      }

      if (!data || data.length === 0) return <p className="text-xs text-[var(--text-muted)]">No data</p>;

      const validCols = tableCols.filter(c => columns.includes(c));
      const displayCols = validCols.length > 0 ? validCols : columns.slice(0, 5);
      const rows = data.slice(0, rowCount);

      return (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                {displayCols.map(col => (
                  <th key={col} className="text-left py-1.5 px-2 text-[var(--text-muted)] font-medium uppercase tracking-wider text-[9px]">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-[var(--border-subtle)] border-opacity-30">
                  {displayCols.map(col => (
                    <td key={col} className="py-1.5 px-2 text-[var(--text-secondary)] font-mono truncate max-w-[120px]">
                      {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // ---- Comparison Widget ----
    case 'comparison': {
      if (isEditing) {
        return (
          <div className="space-y-2">
            <select
              value={widget.config.columnA}
              onChange={e => onConfigChange('columnA', e.target.value)}
              className="w-full px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
            >
              {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={widget.config.columnB}
              onChange={e => onConfigChange('columnB', e.target.value)}
              className="w-full px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
            >
              {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={widget.config.aggregation}
              onChange={e => onConfigChange('aggregation', e.target.value)}
              className="w-full px-2 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
            >
              <option value="mean">Average</option>
              <option value="sum">Sum</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
              <option value="median">Median</option>
            </select>
          </div>
        );
      }

      const statA = stats[widget.config.columnA];
      const statB = stats[widget.config.columnB];
      if (!statA || !statB) return <p className="text-xs text-[var(--text-muted)]">Select two numeric columns</p>;

      const agg = widget.config.aggregation || 'mean';
      const valA = statA[agg] ?? 0;
      const valB = statB[agg] ?? 0;
      const total = Math.abs(valA) + Math.abs(valB);
      const pctA = total > 0 ? (Math.abs(valA) / total) * 100 : 50;

      return (
        <div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
            {agg} comparison
          </p>
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-[10px] text-[var(--text-muted)]">{widget.config.columnA}</p>
              <p className="text-lg font-semibold font-mono" style={{ color: CHART_COLORS[0] }}>{formatNumber(valA)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--text-muted)]">{widget.config.columnB}</p>
              <p className="text-lg font-semibold font-mono" style={{ color: CHART_COLORS[1] }}>{formatNumber(valB)}</p>
            </div>
          </div>
          {/* Comparison bar */}
          <div className="h-3 rounded-full overflow-hidden flex" style={{ background: 'var(--bg-secondary)' }}>
            <div
              className="h-full rounded-l-full transition-all"
              style={{ width: `${pctA}%`, background: CHART_COLORS[0] }}
            />
            <div
              className="h-full rounded-r-full transition-all"
              style={{ width: `${100 - pctA}%`, background: CHART_COLORS[1] }}
            />
          </div>
        </div>
      );
    }

    default:
      return <p className="text-xs text-[var(--text-muted)]">Unknown widget type</p>;
  }
}

// ---------------------------------------------------------------------------
// Debounce helper
// ---------------------------------------------------------------------------

function useDebouncedEffect(callback, deps, delay) {
  useEffect(() => {
    const timer = setTimeout(callback, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DashboardBuilder({ metrics, charts, stats, columns, data }) {
  const [widgets, setWidgets] = useState([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [dragItem, setDragItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasSavedLayout, setHasSavedLayout] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const gridRef = useRef(null);

  // Check for saved layouts on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const layouts = JSON.parse(raw);
        if (Array.isArray(layouts) && layouts.length > 0) {
          setHasSavedLayout(true);
        }
      }
    } catch {
      // ignore parse errors
    }
    setInitialLoadDone(true);
  }, []);

  // Auto-save debounced whenever widgets change (skip initial empty state)
  useDebouncedEffect(() => {
    if (!initialLoadDone) return;
    if (widgets.length === 0) return;
    try {
      const layouts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      // Update or append a special auto-save entry
      const autoIdx = layouts.findIndex(l => l.autoSave);
      const entry = { id: Date.now(), widgets, savedAt: new Date().toISOString(), autoSave: true };
      if (autoIdx >= 0) {
        layouts[autoIdx] = entry;
      } else {
        layouts.push(entry);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts.slice(-10)));
    } catch {
      // ignore
    }
  }, [widgets, initialLoadDone], 1000);

  const templates = useMemo(
    () => buildTemplates(metrics, charts, stats, columns, data),
    [metrics, charts, stats, columns, data]
  );

  const addWidget = useCallback((type) => {
    const typeInfo = WIDGET_TYPES.find(t => t.id === type);
    const newWidget = {
      id: `widget-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      position: widgets.length,
      size: typeInfo?.defaultSize || { w: 1, h: 1 },
      config: getDefaultConfig(type, metrics, charts, stats, columns),
    };
    setWidgets(prev => [...prev, newWidget]);
    setShowAddMenu(false);
  }, [widgets.length, metrics, charts, stats, columns]);

  const removeWidget = useCallback((id) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  }, []);

  const toggleWidgetSize = useCallback((id) => {
    setWidgets(prev => prev.map(w => {
      if (w.id !== id) return w;
      return { ...w, size: { w: w.size.w === 2 ? 1 : 2, h: w.size.h } };
    }));
  }, []);

  const moveWidget = useCallback((fromIdx, toIdx) => {
    setWidgets(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      return updated;
    });
  }, []);

  const handleDragStart = useCallback((e, index) => {
    setDragItem(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    if (dragItem === null || dragItem === index) return;
    moveWidget(dragItem, index);
    setDragItem(index);
  }, [dragItem, moveWidget]);

  const handleDragEnd = useCallback(() => {
    setDragItem(null);
  }, []);

  const updateWidgetConfig = useCallback((id, key, value) => {
    setWidgets(prev => prev.map(w => {
      if (w.id !== id) return w;
      return { ...w, config: { ...w.config, [key]: value } };
    }));
  }, []);

  const saveLayout = useCallback(() => {
    try {
      const layouts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      layouts.push({ id: Date.now(), widgets, savedAt: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts.slice(-10)));
      setHasSavedLayout(true);
    } catch {
      // ignore
    }
  }, [widgets]);

  const loadSavedLayout = useCallback(() => {
    try {
      const layouts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (layouts.length > 0) {
        const latest = layouts[layouts.length - 1];
        if (latest.widgets) {
          setWidgets(latest.widgets);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const applyTemplate = useCallback((template) => {
    // Re-generate IDs to avoid collisions
    const stamped = template.widgets.map((w, i) => ({
      ...w,
      id: `widget-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    }));
    setWidgets(stamped);
  }, []);

  // ---- Render ----

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isEditing
                ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}
          >
            <Settings className="w-3 h-3" />
            {isEditing ? 'Done Editing' : 'Edit Layout'}
          </button>
          {isEditing && (
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-glow)] text-[var(--accent)]"
            >
              <Plus className="w-3 h-3" /> Add Widget
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasSavedLayout && widgets.length === 0 && (
            <button
              onClick={loadSavedLayout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-glow)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg-primary)] transition-all"
            >
              <Clock className="w-3 h-3" /> Load Previous
            </button>
          )}
          {widgets.length > 0 && (
            <button
              onClick={saveLayout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <Save className="w-3 h-3" /> Save Layout
            </button>
          )}
        </div>
      </div>

      {/* Add widget menu */}
      {showAddMenu && (
        <div className="glass-card p-4 animate-fade-in">
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-3">Add Widget</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {WIDGET_TYPES.map(type => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => addWidget(type.id)}
                  className="flex items-center gap-2 p-3 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-active)] hover:bg-[var(--accent-glow)] transition-all"
                >
                  <Icon className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-xs text-[var(--text-primary)]">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Widget grid or empty state */}
      {widgets.length === 0 ? (
        <div className="space-y-6">
          {/* Template cards */}
          <div className="glass-card p-6">
            <div className="text-center mb-6">
              <Sparkles className="w-8 h-8 text-[var(--accent)] mx-auto mb-3 opacity-60" />
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Start with a template</p>
              <p className="text-xs text-[var(--text-muted)]">Pick a pre-built layout to get started quickly, or build your own from scratch.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {templates.map(tpl => {
                const Icon = tpl.icon;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    className="group text-left p-4 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-active)] hover:bg-[var(--accent-glow)] transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: `${tpl.color}18` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: tpl.color }} />
                      </div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">{tpl.name}</p>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{tpl.description}</p>
                    <p className="text-[10px] text-[var(--accent)] mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {tpl.widgets.length} widget{tpl.widgets.length !== 1 ? 's' : ''} &rarr;
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fallback manual start hint */}
          <div className="text-center">
            <p className="text-xs text-[var(--text-muted)]">
              Or click <span className="text-[var(--accent)] font-medium">"Edit Layout"</span> then <span className="text-[var(--accent)] font-medium">"Add Widget"</span> to build from scratch.
            </p>
          </div>
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
              {/* Widget header (edit mode) */}
              {isEditing && (
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <GripVertical className="w-3 h-3 text-[var(--text-muted)]" />
                    <span className="text-[10px] text-[var(--text-muted)] uppercase">{widget.type}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleWidgetSize(widget.id)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    >
                      {widget.size.w === 2 ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => removeWidget(widget.id)}
                      className="p-1 text-[var(--text-muted)] hover:text-rose-400"
                    >
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
                data={data}
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
