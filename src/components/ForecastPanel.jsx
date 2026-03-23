import React, { useState, useMemo } from 'react';
import { TrendingUp, Activity, ChevronDown, Info } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, AreaChart
} from 'recharts';

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#f1f5f9',
    padding: '8px 12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  labelStyle: { color: '#94a3b8', fontSize: '11px', marginBottom: '4px' },
};

const AXIS_STYLE = { fontSize: 11, fill: '#64748b', fontFamily: '"JetBrains Mono", monospace' };
const GRID_STYLE = { strokeDasharray: '3 3', stroke: 'rgba(148, 163, 184, 0.06)' };

function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  points.forEach((p, i) => {
    sumX += i;
    sumY += p;
    sumXY += i * p;
    sumXX += i * i;
  });
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function movingAverage(values, window = 3) {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

function detectSeasonality(values) {
  if (values.length < 6) return { period: 0, strength: 0 };
  // Simple autocorrelation check for periods 2-6
  let bestPeriod = 0, bestCorr = 0;
  for (let p = 2; p <= Math.min(6, Math.floor(values.length / 2)); p++) {
    let corr = 0, count = 0;
    for (let i = p; i < values.length; i++) {
      corr += (values[i] - values[i - p]) ** 2;
      count++;
    }
    const avgDiff = count > 0 ? corr / count : Infinity;
    const invCorr = 1 / (1 + avgDiff);
    if (invCorr > bestCorr) {
      bestCorr = invCorr;
      bestPeriod = p;
    }
  }
  return { period: bestPeriod, strength: bestCorr };
}

export default function ForecastPanel({ data, columns, stats }) {
  const numericCols = columns.filter(c => stats[c]?.type === 'numeric');
  const categoricalCols = columns.filter(c => stats[c]?.type === 'categorical');

  const [selectedCol, setSelectedCol] = useState(numericCols[0] || '');
  const [groupBy, setGroupBy] = useState(categoricalCols[0] || '');
  const [forecastSteps, setForecastSteps] = useState(5);

  const forecast = useMemo(() => {
    if (!data || !selectedCol) return null;

    let seriesData;
    if (groupBy) {
      // Group by categorical column and aggregate
      const groups = {};
      data.forEach(row => {
        const key = row[groupBy] || 'Other';
        if (!groups[key]) groups[key] = [];
        const val = parseFloat(row[selectedCol]);
        if (!isNaN(val)) groups[key].push(val);
      });
      // Use aggregated means as series
      seriesData = Object.entries(groups)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, vals]) => ({
          name,
          value: vals.reduce((a, b) => a + b, 0) / vals.length,
        }));
    } else {
      // Use raw values in order
      seriesData = data
        .map((row, i) => ({ name: `${i + 1}`, value: parseFloat(row[selectedCol]) }))
        .filter(d => !isNaN(d.value))
        .slice(0, 100); // Cap for performance
    }

    if (seriesData.length < 3) return null;

    const values = seriesData.map(d => d.value);
    const ma = movingAverage(values, Math.min(3, values.length));
    const { slope, intercept } = linearRegression(values);
    const seasonality = detectSeasonality(values);

    // Generate trend line
    const trendLine = values.map((_, i) => Math.round((intercept + slope * i) * 100) / 100);

    // Generate forecast points
    const forecastPoints = [];
    for (let i = 0; i < forecastSteps; i++) {
      const idx = values.length + i;
      let predicted = intercept + slope * idx;
      // Add seasonal component if detected
      if (seasonality.period > 0 && seasonality.strength > 0.3) {
        const seasonalIdx = (values.length - seasonality.period + (i % seasonality.period)) % values.length;
        if (seasonalIdx >= 0 && seasonalIdx < values.length) {
          const seasonalEffect = values[seasonalIdx] - trendLine[seasonalIdx];
          predicted += seasonalEffect * 0.5;
        }
      }
      forecastPoints.push({
        name: `F${i + 1}`,
        forecast: Math.round(predicted * 100) / 100,
      });
    }

    // Combine chart data
    const chartData = seriesData.map((d, i) => ({
      name: d.name,
      actual: Math.round(d.value * 100) / 100,
      trend: trendLine[i],
      ma: Math.round(ma[i] * 100) / 100,
    }));

    forecastPoints.forEach(fp => {
      chartData.push({
        name: fp.name,
        forecast: fp.forecast,
        trend: fp.forecast,
      });
    });

    const trendDirection = slope > 0 ? 'upward' : slope < 0 ? 'downward' : 'flat';
    const trendStrength = Math.abs(slope) / (Math.max(...values) - Math.min(...values) || 1);

    return {
      chartData,
      trendDirection,
      trendStrength: Math.min(1, trendStrength * 10),
      slope: Math.round(slope * 100) / 100,
      seasonality,
      forecastValues: forecastPoints,
      stats: {
        min: Math.round(Math.min(...values) * 100) / 100,
        max: Math.round(Math.max(...values) * 100) / 100,
        avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
      },
    };
  }, [data, selectedCol, groupBy, forecastSteps]);

  if (numericCols.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <Activity className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-sm text-[var(--text-muted)]">No numeric columns available for forecasting.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Predictive Analytics</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Metric</label>
            <select
              value={selectedCol}
              onChange={(e) => setSelectedCol(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]"
            >
              {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]"
            >
              <option value="">None (raw order)</option>
              {categoricalCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Forecast Steps</label>
            <select
              value={forecastSteps}
              onChange={(e) => setForecastSteps(parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]"
            >
              {[3, 5, 7, 10].map(n => <option key={n} value={n}>{n} steps</option>)}
            </select>
          </div>
        </div>
      </div>

      {forecast && (
        <>
          {/* Trend indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-card p-4">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Trend</p>
              <div className="flex items-center gap-2">
                <TrendingUp className={`w-4 h-4 ${forecast.trendDirection === 'upward' ? 'text-emerald-400' : forecast.trendDirection === 'downward' ? 'text-rose-400 rotate-180' : 'text-amber-400'}`} />
                <span className={`text-sm font-medium capitalize ${forecast.trendDirection === 'upward' ? 'text-emerald-400' : forecast.trendDirection === 'downward' ? 'text-rose-400' : 'text-amber-400'}`}>
                  {forecast.trendDirection}
                </span>
              </div>
            </div>
            <div className="glass-card p-4">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Slope</p>
              <p className="text-sm font-mono font-semibold text-[var(--text-primary)]">{forecast.slope > 0 ? '+' : ''}{forecast.slope}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Seasonality</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {forecast.seasonality.strength > 0.3 ? `Period: ${forecast.seasonality.period}` : 'None detected'}
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Avg Value</p>
              <p className="text-sm font-mono font-semibold text-[var(--text-primary)]">{forecast.stats.avg.toLocaleString()}</p>
            </div>
          </div>

          {/* Forecast chart */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                {selectedCol} — Trend & Forecast
              </h4>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#38bdf8] rounded" /> Actual</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#fbbf24] rounded" style={{ opacity: 0.6 }} /> Trend</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#34d399] rounded" style={{ strokeDasharray: '4 2' }} /> Forecast</span>
              </div>
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecast.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={60} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="actual" stroke="#38bdf8" strokeWidth={2} dot={{ fill: '#38bdf8', r: 2 }} connectNulls={false} />
                  <Line type="monotone" dataKey="trend" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="6 3" dot={false} strokeOpacity={0.6} />
                  <Line type="monotone" dataKey="ma" stroke="#a78bfa" strokeWidth={1.5} dot={false} strokeOpacity={0.4} />
                  <Line type="monotone" dataKey="forecast" stroke="#34d399" strokeWidth={2} strokeDasharray="4 2" dot={{ fill: '#34d399', r: 3 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Forecast table */}
          <div className="glass-card p-5">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Forecast Values</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {forecast.forecastValues.map((fp, i) => (
                <div key={i} className="rounded-lg bg-[var(--bg-secondary)] p-3 text-center">
                  <p className="text-[10px] text-[var(--text-muted)]">{fp.name}</p>
                  <p className="text-sm font-mono font-semibold text-emerald-400">{fp.forecast.toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-3 text-[10px] text-[var(--text-muted)]">
              <Info className="w-3 h-3" />
              Forecasts are based on linear regression with seasonal adjustment. Use for directional guidance only.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
