import React, { useState, useMemo } from 'react';
import { TrendingUp, Activity, Info, Sliders, BarChart3 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, ComposedChart, ReferenceLine
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
    sumX += i; sumY += p; sumXY += i * p; sumXX += i * i;
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

function exponentialSmoothing(values, alpha = 0.3) {
  const result = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

function weightedMovingAverage(values, window = 3) {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    let weightSum = 0, valSum = 0;
    slice.forEach((v, j) => {
      const w = j + 1;
      valSum += v * w;
      weightSum += w;
    });
    return valSum / weightSum;
  });
}

function detectSeasonality(values) {
  if (values.length < 6) return { period: 0, strength: 0 };
  let bestPeriod = 0, bestCorr = 0;
  for (let p = 2; p <= Math.min(6, Math.floor(values.length / 2)); p++) {
    let corr = 0, count = 0;
    for (let i = p; i < values.length; i++) {
      corr += (values[i] - values[i - p]) ** 2;
      count++;
    }
    const avgDiff = count > 0 ? corr / count : Infinity;
    const invCorr = 1 / (1 + avgDiff);
    if (invCorr > bestCorr) { bestCorr = invCorr; bestPeriod = p; }
  }
  return { period: bestPeriod, strength: bestCorr };
}

function computeResidualStd(values, predicted) {
  const residuals = values.map((v, i) => v - predicted[i]);
  const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const variance = residuals.reduce((a, b) => a + (b - mean) ** 2, 0) / residuals.length;
  return Math.sqrt(variance);
}

const MODELS = [
  { id: 'linear', label: 'Linear Regression', color: '#fbbf24' },
  { id: 'ema', label: 'Exponential Smoothing', color: '#a78bfa' },
  { id: 'wma', label: 'Weighted Moving Avg', color: '#f97316' },
];

export default function ForecastPanel({ data, columns, stats }) {
  const numericCols = columns.filter(c => stats[c]?.type === 'numeric');
  const categoricalCols = columns.filter(c => stats[c]?.type === 'categorical');

  const [selectedCol, setSelectedCol] = useState(numericCols[0] || '');
  const [groupBy, setGroupBy] = useState(categoricalCols[0] || '');
  const [forecastSteps, setForecastSteps] = useState(5);
  const [selectedModel, setSelectedModel] = useState('linear');
  const [showConfidence, setShowConfidence] = useState(true);
  const [whatIfGrowth, setWhatIfGrowth] = useState(0); // percentage adjustment

  const forecast = useMemo(() => {
    if (!data || !selectedCol) return null;

    let seriesData;
    if (groupBy) {
      const groups = {};
      data.forEach(row => {
        const key = row[groupBy] || 'Other';
        if (!groups[key]) groups[key] = [];
        const val = parseFloat(row[selectedCol]);
        if (!isNaN(val)) groups[key].push(val);
      });
      seriesData = Object.entries(groups)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, vals]) => ({
          name,
          value: vals.reduce((a, b) => a + b, 0) / vals.length,
        }));
    } else {
      seriesData = data
        .map((row, i) => ({ name: `${i + 1}`, value: parseFloat(row[selectedCol]) }))
        .filter(d => !isNaN(d.value))
        .slice(0, 100);
    }

    if (seriesData.length < 3) return null;

    const values = seriesData.map(d => d.value);
    const ma = movingAverage(values, Math.min(3, values.length));
    const ema = exponentialSmoothing(values, 0.3);
    const wma = weightedMovingAverage(values, 3);
    const { slope, intercept } = linearRegression(values);
    const seasonality = detectSeasonality(values);

    // Trend lines for each model
    const linearTrend = values.map((_, i) => intercept + slope * i);

    // Pick model predictions for residual std
    const modelPredictions = selectedModel === 'linear' ? linearTrend : selectedModel === 'ema' ? ema : wma;
    const residualStd = computeResidualStd(values, modelPredictions);

    // Generate forecast points
    const forecastPoints = [];
    const growthMultiplier = 1 + (whatIfGrowth / 100);

    for (let i = 0; i < forecastSteps; i++) {
      const idx = values.length + i;
      let predicted;

      if (selectedModel === 'linear') {
        predicted = intercept + slope * idx;
      } else if (selectedModel === 'ema') {
        const lastEma = ema[ema.length - 1];
        predicted = lastEma + slope * (i + 1) * 0.5;
      } else {
        const lastWma = wma[wma.length - 1];
        predicted = lastWma + slope * (i + 1) * 0.5;
      }

      // Add seasonal component
      if (seasonality.period > 0 && seasonality.strength > 0.3) {
        const seasonalIdx = (values.length - seasonality.period + (i % seasonality.period)) % values.length;
        if (seasonalIdx >= 0 && seasonalIdx < values.length) {
          const seasonalEffect = values[seasonalIdx] - linearTrend[seasonalIdx];
          predicted += seasonalEffect * 0.5;
        }
      }

      // Apply what-if growth
      predicted *= growthMultiplier;

      // Confidence intervals (widening with distance)
      const ci = 1.96 * residualStd * Math.sqrt(1 + (i + 1) / values.length);

      forecastPoints.push({
        name: `F${i + 1}`,
        forecast: Math.round(predicted * 100) / 100,
        upper: Math.round((predicted + ci) * 100) / 100,
        lower: Math.round((predicted - ci) * 100) / 100,
      });
    }

    // Combine chart data
    const chartData = seriesData.map((d, i) => ({
      name: d.name,
      actual: Math.round(d.value * 100) / 100,
      linear: Math.round(linearTrend[i] * 100) / 100,
      ema: Math.round(ema[i] * 100) / 100,
      wma: Math.round(wma[i] * 100) / 100,
      ma: Math.round(ma[i] * 100) / 100,
    }));

    forecastPoints.forEach(fp => {
      chartData.push({
        name: fp.name,
        forecast: fp.forecast,
        upper: showConfidence ? fp.upper : undefined,
        lower: showConfidence ? fp.lower : undefined,
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
      residualStd: Math.round(residualStd * 100) / 100,
      stats: {
        min: Math.round(Math.min(...values) * 100) / 100,
        max: Math.round(Math.max(...values) * 100) / 100,
        avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
      },
    };
  }, [data, selectedCol, groupBy, forecastSteps, selectedModel, showConfidence, whatIfGrowth]);

  if (numericCols.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <Activity className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-sm text-[var(--text-muted)]">No numeric columns available for forecasting.</p>
      </div>
    );
  }

  const modelInfo = MODELS.find(m => m.id === selectedModel);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Predictive Analytics</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Metric</label>
            <select value={selectedCol} onChange={(e) => setSelectedCol(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]">
              {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Group By</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]">
              <option value="">None (raw order)</option>
              {categoricalCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Forecast Steps</label>
            <select value={forecastSteps} onChange={(e) => setForecastSteps(parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]">
              {[3, 5, 7, 10, 15].map(n => <option key={n} value={n}>{n} steps</option>)}
            </select>
          </div>
        </div>

        {/* Model Selection */}
        <div className="mb-4">
          <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Forecasting Model</label>
          <div className="flex flex-wrap gap-2">
            {MODELS.map(model => (
              <button key={model.id} onClick={() => setSelectedModel(model.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedModel === model.id
                    ? 'text-[var(--bg-primary)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                style={selectedModel === model.id ? { background: model.color } : undefined}>
                <BarChart3 className="w-3 h-3" />
                {model.label}
              </button>
            ))}
          </div>
        </div>

        {/* What-If Slider */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
              <Sliders className="w-3 h-3" />
              What-If Growth Adjustment
            </label>
            <span className={`text-xs font-mono font-semibold ${whatIfGrowth > 0 ? 'text-emerald-400' : whatIfGrowth < 0 ? 'text-rose-400' : 'text-[var(--text-muted)]'}`}>
              {whatIfGrowth > 0 ? '+' : ''}{whatIfGrowth}%
            </span>
          </div>
          <input type="range" min="-50" max="50" value={whatIfGrowth} onChange={(e) => setWhatIfGrowth(parseInt(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-[var(--border-subtle)] cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--accent)] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0" />
          <div className="flex justify-between text-[9px] text-[var(--text-muted)] mt-0.5">
            <span>-50%</span><span>0%</span><span>+50%</span>
          </div>
        </div>

        {/* Toggle confidence */}
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
          <input type="checkbox" checked={showConfidence} onChange={(e) => setShowConfidence(e.target.checked)}
            className="rounded border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--accent)]" />
          Show 95% confidence interval
        </label>
      </div>

      {forecast && (
        <>
          {/* Trend indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
            <div className="glass-card p-4">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Error (Std)</p>
              <p className="text-sm font-mono font-semibold text-[var(--text-primary)]">±{forecast.residualStd}</p>
            </div>
          </div>

          {/* Forecast chart with confidence bands */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                {selectedCol} — {modelInfo?.label} Forecast
                {whatIfGrowth !== 0 && <span className="text-xs ml-2 text-amber-400">(what-if: {whatIfGrowth > 0 ? '+' : ''}{whatIfGrowth}%)</span>}
              </h4>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#38bdf8] rounded" /> Actual</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded" style={{ background: modelInfo?.color, opacity: 0.6 }} /> Model</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#34d399] rounded" /> Forecast</span>
                {showConfidence && <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-400/20 rounded" /> 95% CI</span>}
              </div>
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecast.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={60} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  {/* Confidence interval band */}
                  {showConfidence && (
                    <Area type="monotone" dataKey="upper" stroke="none" fill="#34d399" fillOpacity={0.1} connectNulls={false} />
                  )}
                  {showConfidence && (
                    <Area type="monotone" dataKey="lower" stroke="none" fill="#050912" fillOpacity={0.8} connectNulls={false} />
                  )}
                  {/* Actual values */}
                  <Line type="monotone" dataKey="actual" stroke="#38bdf8" strokeWidth={2} dot={{ fill: '#38bdf8', r: 2 }} connectNulls={false} />
                  {/* Selected model line */}
                  <Line type="monotone" dataKey={selectedModel} stroke={modelInfo?.color} strokeWidth={1.5} strokeDasharray="6 3" dot={false} strokeOpacity={0.6} connectNulls={false} />
                  {/* Forecast */}
                  <Line type="monotone" dataKey="forecast" stroke="#34d399" strokeWidth={2.5} strokeDasharray="4 2" dot={{ fill: '#34d399', r: 3, strokeWidth: 2, stroke: '#34d399' }} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Forecast table */}
          <div className="glass-card p-5">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Forecast Values</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[var(--text-muted)] text-left">
                    <th className="pb-2 pr-4">Step</th>
                    <th className="pb-2 pr-4">Predicted</th>
                    {showConfidence && <th className="pb-2 pr-4">Lower (95%)</th>}
                    {showConfidence && <th className="pb-2">Upper (95%)</th>}
                  </tr>
                </thead>
                <tbody>
                  {forecast.forecastValues.map((fp, i) => (
                    <tr key={i} className="border-t border-[var(--border-subtle)]">
                      <td className="py-2 pr-4 text-[var(--text-muted)]">{fp.name}</td>
                      <td className="py-2 pr-4 font-mono font-semibold text-emerald-400">{fp.forecast.toLocaleString()}</td>
                      {showConfidence && <td className="py-2 pr-4 font-mono text-[var(--text-muted)]">{fp.lower.toLocaleString()}</td>}
                      {showConfidence && <td className="py-2 font-mono text-[var(--text-muted)]">{fp.upper.toLocaleString()}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-1 mt-3 text-[10px] text-[var(--text-muted)]">
              <Info className="w-3 h-3" />
              {selectedModel === 'linear' ? 'Linear regression' : selectedModel === 'ema' ? 'Exponential smoothing (α=0.3)' : 'Weighted moving average'} with seasonal adjustment.
              {showConfidence && ' 95% confidence intervals shown.'} Use for directional guidance only.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
