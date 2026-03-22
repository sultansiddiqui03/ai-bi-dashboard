import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatNumber } from '../utils/dataProcessor';

export default function KPICards({ metrics, stats, columns, isLoading }) {
  // If AI provided metrics, use those
  if (metrics && metrics.length > 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 stagger-in">
        {metrics.slice(0, 6).map((metric, i) => (
          <MetricCard key={i} metric={metric} />
        ))}
      </div>
    );
  }

  // Fallback: auto-generate from stats
  const numericCols = columns.filter(c => stats[c]?.type === 'numeric').slice(0, 6);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="glass-card p-4">
            <div className="shimmer h-3 w-20 rounded mb-3" />
            <div className="shimmer h-6 w-16 rounded mb-2" />
            <div className="shimmer h-2 w-24 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (numericCols.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 stagger-in">
      {numericCols.map(col => (
        <div key={col} className="glass-card p-4">
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5 truncate">
            {col.replace(/_/g, ' ')}
          </p>
          <p className="text-xl font-semibold text-[var(--text-primary)] font-mono">
            {formatNumber(stats[col].mean)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            avg • range: {formatNumber(stats[col].min)}–{formatNumber(stats[col].max)}
          </p>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ metric }) {
  const changeStr = metric.change || '';
  const isPositive = changeStr.includes('+');
  const isNegative = changeStr.includes('-');

  return (
    <div className="glass-card gradient-border p-4">
      <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5 truncate">
        {metric.name}
      </p>
      <p className="text-xl font-semibold text-[var(--text-primary)] font-mono">
        {metric.value}
      </p>
      <div className="flex items-center gap-1.5 mt-1.5">
        {changeStr && (
          <>
            {isPositive ? (
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            ) : isNegative ? (
              <TrendingDown className="w-3 h-3 text-rose-400" />
            ) : (
              <Minus className="w-3 h-3 text-[var(--text-muted)]" />
            )}
            <span className={`text-[11px] font-mono ${
              isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-[var(--text-muted)]'
            }`}>
              {changeStr}
            </span>
          </>
        )}
      </div>
      {metric.interpretation && (
        <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-relaxed line-clamp-2">
          {metric.interpretation}
        </p>
      )}
    </div>
  );
}
