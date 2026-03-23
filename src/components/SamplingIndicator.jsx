import React from 'react';
import { Database, AlertCircle } from 'lucide-react';

export default function SamplingIndicator({ totalRows, analyzedRows, maxRows = 10000 }) {
  if (!totalRows || totalRows <= maxRows) return null;

  const isSampled = totalRows > maxRows;
  const displayedRows = analyzedRows || Math.min(totalRows, maxRows);
  const pct = ((displayedRows / totalRows) * 100).toFixed(1);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <div className="flex items-center gap-1.5 text-xs text-amber-400">
        <Database className="w-3 h-3" />
        <span className="font-medium">
          Analyzing {displayedRows.toLocaleString()} of {totalRows.toLocaleString()} rows
        </span>
        <span className="text-amber-400/60">({pct}% sampled)</span>
      </div>
      <div className="flex-1 h-1.5 rounded-full bg-amber-500/20 max-w-[100px] ml-auto">
        <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${Math.min(100, parseFloat(pct))}%` }} />
      </div>
    </div>
  );
}
