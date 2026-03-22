import React, { useMemo } from 'react';
import { Rows3, Columns3, Hash, Type, Calendar, HardDrive } from 'lucide-react';

export default function DatasetSummary({ data, columns, stats }) {
  const summary = useMemo(() => {
    if (!columns || columns.length === 0) return null;

    const numericCols = columns.filter(c => stats[c]?.type === 'numeric');
    const categoricalCols = columns.filter(c => stats[c]?.type === 'categorical');
    const rowCount = data ? data.length : (stats[columns[0]]?.count || 0);

    // Estimate file size (rough: ~50 bytes per cell)
    const estimatedSize = rowCount * columns.length * 50;
    let sizeStr;
    if (estimatedSize >= 1_000_000) {
      sizeStr = (estimatedSize / 1_000_000).toFixed(1) + ' MB';
    } else {
      sizeStr = Math.round(estimatedSize / 1_000) + ' KB';
    }

    // Detect date columns (look for columns with date-like names or values)
    let dateRange = null;
    if (data && data.length > 0) {
      const dateKeywords = ['date', 'time', 'created', 'updated', 'timestamp', 'day', 'month', 'year'];
      const dateCols = columns.filter(c =>
        dateKeywords.some(kw => c.toLowerCase().includes(kw))
      );
      if (dateCols.length > 0) {
        const dateCol = dateCols[0];
        const dateValues = data
          .map(row => new Date(row[dateCol]))
          .filter(d => !isNaN(d.getTime()))
          .sort((a, b) => a - b);
        if (dateValues.length > 1) {
          const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          dateRange = `${fmt(dateValues[0])} - ${fmt(dateValues[dateValues.length - 1])}`;
        }
      }
    }

    return {
      rowCount,
      colCount: columns.length,
      numericCount: numericCols.length,
      categoricalCount: categoricalCols.length,
      sizeStr,
      dateRange,
    };
  }, [data, columns, stats]);

  if (!summary) return null;

  const items = [
    { icon: Rows3, label: 'Rows', value: summary.rowCount.toLocaleString() },
    { icon: Columns3, label: 'Columns', value: summary.colCount },
    { icon: Hash, label: 'Numeric', value: summary.numericCount },
    { icon: Type, label: 'Categorical', value: summary.categoricalCount },
    { icon: HardDrive, label: 'Est. Size', value: summary.sizeStr },
  ];

  if (summary.dateRange) {
    items.push({ icon: Calendar, label: 'Date Range', value: summary.dateRange });
  }

  return (
    <div className="glass-card px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <item.icon className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
          <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">{item.label}</span>
          <span className="text-xs font-semibold text-[var(--text-primary)] font-mono">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
