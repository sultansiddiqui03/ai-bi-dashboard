import React, { useState, useMemo } from 'react';
import { Wand2, Check, X, ChevronRight, Tag } from 'lucide-react';

const SEMANTIC_TYPES = [
  { id: 'date', label: 'Date / Time', color: 'text-sky-400 bg-sky-500/10' },
  { id: 'currency', label: 'Currency / Amount', color: 'text-emerald-400 bg-emerald-500/10' },
  { id: 'percentage', label: 'Percentage', color: 'text-amber-400 bg-amber-500/10' },
  { id: 'count', label: 'Count / Quantity', color: 'text-violet-400 bg-violet-500/10' },
  { id: 'id', label: 'ID / Key', color: 'text-rose-400 bg-rose-500/10' },
  { id: 'category', label: 'Category', color: 'text-fuchsia-400 bg-fuchsia-500/10' },
  { id: 'name', label: 'Name / Label', color: 'text-teal-400 bg-teal-500/10' },
  { id: 'location', label: 'Location / Region', color: 'text-orange-400 bg-orange-500/10' },
  { id: 'metric', label: 'Numeric Metric', color: 'text-blue-400 bg-blue-500/10' },
  { id: 'text', label: 'Free Text', color: 'text-gray-400 bg-gray-500/10' },
];

function inferSemanticType(colName, values, statInfo) {
  const lower = colName.toLowerCase();
  const sampleVals = values.slice(0, 20).filter(v => v !== null && v !== undefined && v !== '');

  // Date detection
  if (lower.includes('date') || lower.includes('time') || lower.includes('created') || lower.includes('updated') || lower.includes('timestamp')) return 'date';
  if (sampleVals.some(v => /^\d{4}[-/]\d{2}[-/]\d{2}/.test(String(v)) || /^\d{2}[-/]\d{2}[-/]\d{4}/.test(String(v)))) return 'date';
  if (lower.includes('month') || lower.includes('year') || lower.includes('quarter') || lower.includes('week')) return 'date';

  // ID detection
  if (lower.includes('id') || lower === 'key' || lower.includes('_id') || lower.includes('code')) return 'id';

  // Currency detection
  if (lower.includes('price') || lower.includes('cost') || lower.includes('revenue') || lower.includes('amount') || lower.includes('salary') || lower.includes('income') || lower.includes('profit') || lower.includes('expense') || lower.includes('payment') || lower.includes('budget')) return 'currency';
  if (sampleVals.some(v => /^\$[\d,.]+$/.test(String(v)))) return 'currency';

  // Percentage detection
  if (lower.includes('rate') || lower.includes('ratio') || lower.includes('percent') || lower.includes('pct') || lower.includes('satisfaction') || lower.includes('conversion')) return 'percentage';
  if (sampleVals.some(v => /^[\d.]+%$/.test(String(v)))) return 'percentage';

  // Count/quantity
  if (lower.includes('count') || lower.includes('quantity') || lower.includes('units') || lower.includes('number') || lower.includes('total') || lower.includes('sold')) return 'count';

  // Location
  if (lower.includes('country') || lower.includes('city') || lower.includes('state') || lower.includes('region') || lower.includes('location') || lower.includes('address') || lower.includes('zip')) return 'location';

  // Name/label
  if (lower.includes('name') || lower.includes('title') || lower.includes('label')) return 'name';

  // Category (categorical with limited unique values)
  if (statInfo?.type === 'categorical' && statInfo.unique < 20) return 'category';

  // Numeric metric
  if (statInfo?.type === 'numeric') return 'metric';

  // Free text
  if (statInfo?.type === 'categorical' && statInfo.unique > 50) return 'text';

  return 'category';
}

export default function ColumnMappingWizard({ data, columns, stats, onConfirm, onSkip }) {
  const inferred = useMemo(() => {
    const result = {};
    columns.forEach(col => {
      const values = data.slice(0, 50).map(r => r[col]);
      result[col] = inferSemanticType(col, values, stats[col]);
    });
    return result;
  }, [data, columns, stats]);

  const [mappings, setMappings] = useState(inferred);
  const [editingCol, setEditingCol] = useState(null);

  const handleTypeChange = (col, type) => {
    setMappings(prev => ({ ...prev, [col]: type }));
    setEditingCol(null);
  };

  const getTypeInfo = (typeId) => SEMANTIC_TYPES.find(t => t.id === typeId) || SEMANTIC_TYPES[SEMANTIC_TYPES.length - 1];

  return (
    <div className="glass-card p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-glow)] flex items-center justify-center">
          <Wand2 className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Column Type Detection</h3>
          <p className="text-xs text-[var(--text-muted)]">AI detected these column types. Click to adjust if needed.</p>
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {columns.map(col => {
          const typeInfo = getTypeInfo(mappings[col]);
          const isEditing = editingCol === col;
          const sampleVal = data.find(r => r[col] !== null && r[col] !== undefined && r[col] !== '')?.[col];

          return (
            <div key={col} className="rounded-xl bg-[var(--bg-secondary)] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-[var(--text-primary)] truncate">{col}</p>
                  {sampleVal !== undefined && (
                    <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">e.g., {String(sampleVal)}</p>
                  )}
                </div>
                <button
                  onClick={() => setEditingCol(isEditing ? null : col)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${typeInfo.color}`}
                >
                  <Tag className="w-3 h-3" />
                  {typeInfo.label}
                </button>
              </div>

              {isEditing && (
                <div className="mt-2 flex flex-wrap gap-1.5 animate-fade-in">
                  {SEMANTIC_TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleTypeChange(col, t.id)}
                      className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                        mappings[col] === t.id
                          ? `${t.color} ring-1 ring-current`
                          : 'text-[var(--text-muted)] bg-[var(--bg-card)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-5 pt-4 border-t border-[var(--border-subtle)]">
        <button
          onClick={onSkip}
          className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <X className="w-4 h-4" />
          Skip
        </button>
        <button
          onClick={() => onConfirm(mappings)}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-primary)] text-sm font-medium hover:brightness-110 transition-all"
        >
          <Check className="w-4 h-4" />
          Confirm & Analyze
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
