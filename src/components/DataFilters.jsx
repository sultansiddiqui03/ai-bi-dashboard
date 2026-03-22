import React, { useState, useMemo } from 'react';
import { Filter, ChevronDown, ChevronUp, X } from 'lucide-react';

export default function DataFilters({ data, columns, stats, filters, onFiltersChange }) {
  const [expanded, setExpanded] = useState(false);

  const categoricalCols = useMemo(() => {
    return columns.filter(c => stats[c]?.type === 'categorical');
  }, [columns, stats]);

  const numericCols = useMemo(() => {
    return columns.filter(c => stats[c]?.type === 'numeric');
  }, [columns, stats]);

  const categoricalOptions = useMemo(() => {
    const opts = {};
    categoricalCols.forEach(col => {
      const uniqueVals = [...new Set(data.map(r => r[col]).filter(v => v != null && v !== ''))];
      opts[col] = uniqueVals.sort();
    });
    return opts;
  }, [data, categoricalCols]);

  const activeFilterCount = Object.keys(filters).filter(k => {
    const f = filters[k];
    if (f.type === 'categorical') return f.values && f.values.length > 0;
    if (f.type === 'numeric') return f.min !== undefined || f.max !== undefined;
    return false;
  }).length;

  const handleCategoricalChange = (col, value) => {
    const current = filters[col]?.values || [];
    const newValues = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];

    onFiltersChange({
      ...filters,
      [col]: { type: 'categorical', values: newValues },
    });
  };

  const handleNumericChange = (col, field, val) => {
    const current = filters[col] || { type: 'numeric' };
    const numVal = val === '' ? undefined : parseFloat(val);
    onFiltersChange({
      ...filters,
      [col]: { ...current, type: 'numeric', [field]: isNaN(numVal) ? undefined : numVal },
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const clearFilter = (col) => {
    const newFilters = { ...filters };
    delete newFilters[col];
    onFiltersChange(newFilters);
  };

  if (categoricalCols.length === 0 && numericCols.length === 0) return null;

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--accent)]" />
          <span className="font-medium text-[var(--text-primary)]">Data Filters</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] rounded-full bg-[var(--accent)]/20 text-[var(--accent)] font-mono">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); clearFilters(); }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)] flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Clear all
            </button>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          )}
        </div>
      </button>

      {/* Filter content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[var(--border-subtle)] pt-4">
          {/* Categorical filters */}
          {categoricalCols.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2 font-semibold">Categorical</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoricalCols.slice(0, 6).map(col => {
                  const options = categoricalOptions[col] || [];
                  const selected = filters[col]?.values || [];
                  return (
                    <div key={col} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-[var(--text-secondary)] truncate">{col}</label>
                        {selected.length > 0 && (
                          <button onClick={() => clearFilter(col)} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--danger)]">
                            clear
                          </button>
                        )}
                      </div>
                      <select
                        multiple
                        value={selected}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleCategoricalChange(col, val);
                        }}
                        className="hidden"
                      />
                      <div className="max-h-28 overflow-y-auto rounded-lg bg-[var(--bg-primary)]/50 border border-[var(--border-subtle)] p-1.5 space-y-0.5">
                        {options.slice(0, 20).map(opt => (
                          <label
                            key={opt}
                            className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selected.includes(opt)}
                              onChange={() => handleCategoricalChange(col, opt)}
                              className="w-3 h-3 rounded accent-[var(--accent)]"
                            />
                            <span className="text-xs text-[var(--text-secondary)] truncate">{String(opt)}</span>
                          </label>
                        ))}
                        {options.length > 20 && (
                          <p className="text-[10px] text-[var(--text-muted)] px-2 py-1">+{options.length - 20} more</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Numeric filters */}
          {numericCols.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2 font-semibold">Numeric Range</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {numericCols.slice(0, 6).map(col => {
                  const s = stats[col];
                  const f = filters[col] || {};
                  return (
                    <div key={col} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-[var(--text-secondary)] truncate">{col}</label>
                        {(f.min !== undefined || f.max !== undefined) && (
                          <button onClick={() => clearFilter(col)} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--danger)]">
                            clear
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder={`Min (${s?.min ?? ''})`}
                          value={f.min ?? ''}
                          onChange={(e) => handleNumericChange(col, 'min', e.target.value)}
                          className="flex-1 px-2 py-1.5 rounded-lg bg-[var(--bg-primary)]/50 border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)] font-mono w-0"
                        />
                        <span className="text-[var(--text-muted)] text-xs">-</span>
                        <input
                          type="number"
                          placeholder={`Max (${s?.max ?? ''})`}
                          value={f.max ?? ''}
                          onChange={(e) => handleNumericChange(col, 'max', e.target.value)}
                          className="flex-1 px-2 py-1.5 rounded-lg bg-[var(--bg-primary)]/50 border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)] font-mono w-0"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Apply filters to a data array and return filtered results.
 */
export function applyFilters(data, filters) {
  if (!data || !filters || Object.keys(filters).length === 0) return data;

  return data.filter(row => {
    return Object.entries(filters).every(([col, filter]) => {
      if (filter.type === 'categorical' && filter.values && filter.values.length > 0) {
        return filter.values.includes(row[col]);
      }
      if (filter.type === 'numeric') {
        const val = parseFloat(row[col]);
        if (isNaN(val)) return true; // keep rows with non-numeric values
        if (filter.min !== undefined && val < filter.min) return false;
        if (filter.max !== undefined && val > filter.max) return false;
      }
      return true;
    });
  });
}
