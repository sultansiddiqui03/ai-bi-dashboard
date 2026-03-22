import React from 'react';
import {
  TrendingUp, TrendingDown, Minus,
  DollarSign, Users, ShoppingCart, BarChart3,
  Percent, Hash, Activity, Target, Zap, Package,
  Clock, Star, Layers, PieChart
} from 'lucide-react';
import { formatNumber } from '../utils/dataProcessor';
import AnimatedNumber from './AnimatedNumber';

// Map metric names to icons based on keywords
function getMetricIcon(name) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('revenue') || lower.includes('sales') || lower.includes('price') || lower.includes('cost') || lower.includes('profit') || lower.includes('income'))
    return DollarSign;
  if (lower.includes('user') || lower.includes('customer') || lower.includes('employee') || lower.includes('member') || lower.includes('people'))
    return Users;
  if (lower.includes('order') || lower.includes('purchase') || lower.includes('transaction') || lower.includes('cart'))
    return ShoppingCart;
  if (lower.includes('rate') || lower.includes('ratio') || lower.includes('percent') || lower.includes('conversion'))
    return Percent;
  if (lower.includes('count') || lower.includes('total') || lower.includes('number') || lower.includes('quantity'))
    return Hash;
  if (lower.includes('growth') || lower.includes('trend') || lower.includes('change'))
    return Activity;
  if (lower.includes('target') || lower.includes('goal') || lower.includes('benchmark'))
    return Target;
  if (lower.includes('performance') || lower.includes('efficiency') || lower.includes('speed'))
    return Zap;
  if (lower.includes('product') || lower.includes('item') || lower.includes('inventory') || lower.includes('stock'))
    return Package;
  if (lower.includes('time') || lower.includes('duration') || lower.includes('period'))
    return Clock;
  if (lower.includes('rating') || lower.includes('score') || lower.includes('satisfaction'))
    return Star;
  if (lower.includes('category') || lower.includes('segment') || lower.includes('group'))
    return Layers;
  if (lower.includes('share') || lower.includes('distribution'))
    return PieChart;
  if (lower.includes('average') || lower.includes('mean') || lower.includes('median'))
    return BarChart3;
  return BarChart3;
}

export default function KPICards({ metrics, stats, columns, isLoading }) {
  // If AI provided metrics, use those
  if (metrics && metrics.length > 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-in">
        {metrics.slice(0, 6).map((metric, i) => (
          <MetricCard key={i} metric={metric} index={i} />
        ))}
      </div>
    );
  }

  // Fallback: auto-generate from stats
  const numericCols = columns.filter(c => stats[c]?.type === 'numeric').slice(0, 6);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="shimmer w-10 h-10 rounded-xl" />
              <div className="shimmer h-3 w-24 rounded" />
            </div>
            <div className="shimmer h-7 w-20 rounded mb-2" />
            <div className="shimmer h-2 w-32 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (numericCols.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-in">
      {numericCols.map(col => {
        const Icon = getMetricIcon(col);
        return (
          <div key={col} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-glow)] flex items-center justify-center">
                <Icon className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider truncate">
                {col.replace(/_/g, ' ')}
              </p>
            </div>
            <p className="text-2xl font-semibold text-[var(--text-primary)] font-mono">
              <AnimatedNumber value={formatNumber(stats[col].mean)} duration={1200} />
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--accent)] opacity-60"
                  style={{
                    width: `${Math.min(100, stats[col].max !== 0 ? (stats[col].mean / stats[col].max) * 100 : 0)}%`
                  }}
                />
              </div>
              <p className="text-[10px] text-[var(--text-muted)] shrink-0">
                {formatNumber(stats[col].min)} - {formatNumber(stats[col].max)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MetricCard({ metric, index }) {
  const changeStr = metric.change || '';
  const isPositive = changeStr.includes('+');
  const isNegative = changeStr.includes('-');
  const Icon = getMetricIcon(metric.name);

  // Alternate accent colors for visual variety
  const accentColors = [
    { bg: 'rgba(56, 189, 248, 0.12)', text: '#38bdf8' },   // sky
    { bg: 'rgba(52, 211, 153, 0.12)', text: '#34d399' },    // emerald
    { bg: 'rgba(251, 191, 36, 0.12)', text: '#fbbf24' },    // amber
    { bg: 'rgba(251, 113, 133, 0.12)', text: '#fb7185' },   // rose
    { bg: 'rgba(167, 139, 250, 0.12)', text: '#a78bfa' },   // violet
    { bg: 'rgba(249, 115, 22, 0.12)', text: '#f97316' },    // orange
  ];
  const accent = accentColors[index % accentColors.length];

  return (
    <div className="glass-card gradient-border p-5">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: accent.bg }}
        >
          <Icon className="w-5 h-5" style={{ color: accent.text }} />
        </div>
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider truncate flex-1">
          {metric.name}
        </p>
      </div>
      <p className="text-2xl font-semibold text-[var(--text-primary)] font-mono">
        <AnimatedNumber value={metric.value} duration={1400} />
      </p>
      <div className="flex items-center gap-2 mt-2">
        {changeStr && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono ${
            isPositive ? 'bg-emerald-500/10 text-emerald-400' : isNegative ? 'bg-rose-500/10 text-rose-400' : 'bg-white/5 text-[var(--text-muted)]'
          }`}>
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : isNegative ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            {changeStr}
          </div>
        )}
      </div>
      {metric.interpretation && (
        <p className="text-[11px] text-[var(--text-muted)] mt-2 leading-relaxed line-clamp-2">
          {metric.interpretation}
        </p>
      )}
    </div>
  );
}
