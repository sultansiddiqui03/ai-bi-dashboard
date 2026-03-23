import React, { useState } from 'react';
import { Search, Sparkles, Loader2, X, Filter } from 'lucide-react';

function parseNLQuery(query, columns, stats) {
  const lower = query.toLowerCase().trim();
  const filters = {};

  // Pattern: "where <column> is <value>" or "<column> = <value>"
  for (const col of columns) {
    const colLower = col.toLowerCase();
    const colPattern = colLower.replace(/_/g, '[_ ]?');

    // Exact match: "column is value" or "column = value"
    const exactMatch = lower.match(new RegExp(`${colPattern}\\s*(?:is|=|equals?)\\s*['"]?([^'"]+?)['"]?(?:\\s+and|\\s+or|$)`, 'i'));
    if (exactMatch) {
      if (stats[col]?.type === 'categorical') {
        filters[col] = { type: 'categorical', values: [exactMatch[1].trim()] };
      }
    }

    // Greater than: "column > value" or "column above/over/more than value"
    const gtMatch = lower.match(new RegExp(`${colPattern}\\s*(?:>|above|over|more than|greater than|at least)\\s*(\\d+\\.?\\d*)`, 'i'));
    if (gtMatch) {
      filters[col] = { type: 'numeric', min: parseFloat(gtMatch[1]) };
    }

    // Less than: "column < value" or "column below/under/less than value"
    const ltMatch = lower.match(new RegExp(`${colPattern}\\s*(?:<|below|under|less than|at most)\\s*(\\d+\\.?\\d*)`, 'i'));
    if (ltMatch) {
      filters[col] = { type: 'numeric', max: parseFloat(ltMatch[1]) };
    }

    // Between: "column between X and Y"
    const betweenMatch = lower.match(new RegExp(`${colPattern}\\s*(?:between)\\s*(\\d+\\.?\\d*)\\s*(?:and|-)\\s*(\\d+\\.?\\d*)`, 'i'));
    if (betweenMatch) {
      filters[col] = { type: 'numeric', min: parseFloat(betweenMatch[1]), max: parseFloat(betweenMatch[2]) };
    }
  }

  // Pattern: "top N" - sort and limit
  const topMatch = lower.match(/top\s+(\d+)/);
  const bottomMatch = lower.match(/bottom\s+(\d+)/);

  // Pattern: "only <value>" for categorical columns
  for (const col of columns) {
    if (stats[col]?.type === 'categorical' && stats[col].topValues) {
      for (const tv of stats[col].topValues) {
        if (lower.includes(tv.value.toLowerCase())) {
          if (!filters[col]) {
            filters[col] = { type: 'categorical', values: [tv.value] };
          }
        }
      }
    }
  }

  return {
    filters,
    hasResults: Object.keys(filters).length > 0,
    topN: topMatch ? parseInt(topMatch[1]) : null,
    bottomN: bottomMatch ? parseInt(bottomMatch[1]) : null,
  };
}

export default function NLFilter({ columns, stats, onApplyFilters }) {
  const [query, setQuery] = useState('');
  const [parsing, setParsing] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (!query.trim()) return;

    setParsing(true);
    // Small delay for UX feel
    setTimeout(() => {
      const result = parseNLQuery(query, columns, stats);
      setLastResult(result);
      if (result.hasResults) {
        onApplyFilters(result.filters);
      }
      setParsing(false);
    }, 300);
  };

  const handleClear = () => {
    setQuery('');
    setLastResult(null);
    onApplyFilters({});
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span className="text-xs font-medium text-[var(--text-primary)]">Natural Language Filter</span>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder='Try: "Revenue above 100000" or "Region is North"'
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)]"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!query.trim() || parsing}
          className="px-3 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-medium hover:brightness-110 disabled:opacity-30 transition-all flex items-center gap-1"
        >
          {parsing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Filter className="w-3 h-3" />}
          Apply
        </button>
        {lastResult && (
          <button onClick={handleClear} className="px-2 py-2 rounded-lg text-[var(--text-muted)] hover:text-rose-400 transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {lastResult && !lastResult.hasResults && (
        <p className="text-[10px] text-amber-400 mt-2">
          Couldn't parse filters from that query. Try referencing column names directly, e.g., "{columns[0]} above 50".
        </p>
      )}
      {lastResult && lastResult.hasResults && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {Object.entries(lastResult.filters).map(([col, f]) => (
            <span key={col} className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--accent)]/10 text-[var(--accent)]">
              {col}: {f.type === 'categorical' ? f.values?.join(', ') : `${f.min !== undefined ? `≥${f.min}` : ''} ${f.max !== undefined ? `≤${f.max}` : ''}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
