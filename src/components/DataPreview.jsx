import React, { useState, useMemo } from 'react';
import { Table, Hash, Type, ArrowUpDown } from 'lucide-react';
import { formatNumber } from '../utils/dataProcessor';

export default function DataPreview({ data, columns, stats }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'stats'
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(0);

  const sortedData = useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortCol];
      const bVal = b[sortCol];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const numA = parseFloat(aVal);
      const numB = parseFloat(bVal);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDir === 'asc' ? numA - numB : numB - numA;
      }
      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      return sortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [data, sortCol, sortDir]);

  const pagedData = sortedData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(data.length / PAGE_SIZE);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  return (
    <div>
      {/* Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setViewMode('table')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            viewMode === 'table'
              ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <span className="flex items-center gap-1.5"><Table className="w-3 h-3" /> Table</span>
        </button>
        <button
          onClick={() => setViewMode('stats')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            viewMode === 'stats'
              ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <span className="flex items-center gap-1.5"><Hash className="w-3 h-3" /> Column Stats</span>
        </button>
      </div>

      {viewMode === 'table' ? (
        <div>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    {columns.map(col => (
                      <th
                        key={col}
                        onClick={() => handleSort(col)}
                        className="text-left px-4 py-3 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--accent)] transition-colors whitespace-nowrap"
                      >
                        <span className="flex items-center gap-1.5">
                          {col}
                          <ArrowUpDown className={`w-3 h-3 ${sortCol === col ? 'text-[var(--accent)]' : 'opacity-30'}`} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedData.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-[var(--border-subtle)] hover:bg-white/[0.02] transition-colors"
                    >
                      {columns.map(col => (
                        <td key={col} className="px-4 py-2.5 text-[var(--text-secondary)] font-mono text-xs whitespace-nowrap max-w-[200px] truncate">
                          {row[col] != null ? String(row[col]) : <span className="text-[var(--text-muted)] italic">null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-[var(--text-muted)] text-xs">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.length)} of {data.length.toLocaleString()} rows
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded-lg text-xs border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-active)] disabled:opacity-30 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 rounded-lg text-xs border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-active)] disabled:opacity-30 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Column Stats View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-in">
          {columns.map(col => {
            const s = stats[col];
            if (!s) return null;
            return (
              <div key={col} className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  {s.type === 'numeric' ? (
                    <Hash className="w-3.5 h-3.5 text-[var(--accent)]" />
                  ) : (
                    <Type className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">{col}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--text-muted)]">
                    {s.type}
                  </span>
                </div>

                {s.type === 'numeric' ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Stat label="Mean" value={formatNumber(s.mean)} />
                    <Stat label="Median" value={formatNumber(s.median)} />
                    <Stat label="Min" value={formatNumber(s.min)} />
                    <Stat label="Max" value={formatNumber(s.max)} />
                    <Stat label="Sum" value={formatNumber(s.sum)} />
                    <Stat label="Missing" value={s.missing} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Unique values</span>
                      <span className="text-[var(--text-secondary)] font-mono">{s.unique}</span>
                    </div>
                    {s.topValues && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-[var(--text-muted)]">Top values:</span>
                        {s.topValues.slice(0, 3).map((tv, j) => (
                          <div key={j} className="flex justify-between text-xs">
                            <span className="text-[var(--text-secondary)] truncate max-w-[120px]">{tv.value}</span>
                            <span className="text-[var(--text-muted)] font-mono">{tv.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-[var(--text-muted)] text-[10px]">{label}</span>
      <span className="text-[var(--text-secondary)] font-mono">{value}</span>
    </div>
  );
}
