import React, { useMemo } from 'react';
import { X, ArrowLeft, Table } from 'lucide-react';
import { formatNumber } from '../utils/dataProcessor';

export default function DrillDownModal({ data, columns, stats, filterCol, filterValue, onClose }) {
  const filteredData = useMemo(() => {
    if (!data || !filterCol) return [];
    return data.filter(row => String(row[filterCol]) === String(filterValue));
  }, [data, filterCol, filterValue]);

  const filteredStats = useMemo(() => {
    if (!filteredData.length) return {};
    const numericCols = columns.filter(c => stats[c]?.type === 'numeric');
    const result = {};
    numericCols.forEach(col => {
      const values = filteredData.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
      if (values.length === 0) return;
      const sum = values.reduce((a, b) => a + b, 0);
      result[col] = {
        count: values.length,
        sum: Math.round(sum * 100) / 100,
        mean: Math.round((sum / values.length) * 100) / 100,
        min: Math.min(...values),
        max: Math.max(...values),
      };
    });
    return result;
  }, [filteredData, columns, stats]);

  const numericCols = columns.filter(c => stats[c]?.type === 'numeric');

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-card w-full max-w-4xl max-h-[85vh] overflow-hidden m-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Drill-down: {filterCol} = "{filterValue}"
              </h3>
              <p className="text-xs text-[var(--text-muted)]">{filteredData.length} matching rows</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-60px)] p-6 space-y-6">
          {/* Summary stats */}
          {numericCols.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Summary Statistics</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {numericCols.map(col => {
                  const s = filteredStats[col];
                  if (!s) return null;
                  return (
                    <div key={col} className="glass-card p-3">
                      <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1 truncate">{col.replace(/_/g, ' ')}</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)] font-mono">{formatNumber(s.mean)}</p>
                      <p className="text-[9px] text-[var(--text-muted)] mt-0.5">
                        sum: {formatNumber(s.sum)} | range: {formatNumber(s.min)}-{formatNumber(s.max)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Data table */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Table className="w-4 h-4 text-[var(--accent)]" />
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Data ({Math.min(filteredData.length, 50)} of {filteredData.length} rows)</p>
            </div>
            <div className="overflow-x-auto glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    {columns.map(col => (
                      <th key={col} className="text-left px-3 py-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-white/[0.02]">
                      {columns.map(col => (
                        <td key={col} className="px-3 py-2 text-[var(--text-secondary)] font-mono text-xs whitespace-nowrap max-w-[180px] truncate">
                          {row[col] != null ? String(row[col]) : <span className="text-[var(--text-muted)] italic">null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
