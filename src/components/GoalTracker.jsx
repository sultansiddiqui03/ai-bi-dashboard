import React, { useState } from 'react';
import { Target, Plus, X, Check, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

export default function GoalTracker({ stats, columns }) {
  const [goals, setGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formCol, setFormCol] = useState('');
  const [formOp, setFormOp] = useState('>=');
  const [formValue, setFormValue] = useState('');
  const [formLabel, setFormLabel] = useState('');

  const numericCols = columns.filter(c => stats[c]?.type === 'numeric');

  const addGoal = () => {
    if (!formCol || !formValue) return;
    setGoals(prev => [...prev, {
      id: Date.now(),
      column: formCol,
      operator: formOp,
      target: parseFloat(formValue),
      label: formLabel || `${formCol} ${formOp} ${formValue}`,
    }]);
    setFormCol('');
    setFormValue('');
    setFormLabel('');
    setShowForm(false);
  };

  const removeGoal = (id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const evaluateGoal = (goal) => {
    const stat = stats[goal.column];
    if (!stat) return { met: false, actual: 'N/A', pct: 0 };
    const actual = stat.mean;
    let met = false;
    switch (goal.operator) {
      case '>=': met = actual >= goal.target; break;
      case '<=': met = actual <= goal.target; break;
      case '>': met = actual > goal.target; break;
      case '<': met = actual < goal.target; break;
      case '=': met = Math.abs(actual - goal.target) < 0.01; break;
      default: met = false;
    }
    const pct = goal.target !== 0 ? Math.round((actual / goal.target) * 100) : 0;
    return { met, actual, pct };
  };

  if (numericCols.length === 0) return null;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Goal Tracking</h3>
          {goals.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)]">
              {goals.filter(g => evaluateGoal(g).met).length}/{goals.length} met
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-[var(--accent)] bg-[var(--accent-glow)] hover:brightness-110 transition-all"
        >
          <Plus className="w-3 h-3" />
          Add Goal
        </button>
      </div>

      {/* Add goal form */}
      {showForm && (
        <div className="mb-4 p-3 rounded-xl bg-[var(--bg-secondary)] space-y-3 animate-fade-in">
          <input
            type="text"
            value={formLabel}
            onChange={(e) => setFormLabel(e.target.value)}
            placeholder="Goal name (optional)"
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)]"
          />
          <div className="flex gap-2">
            <select
              value={formCol}
              onChange={(e) => setFormCol(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]"
            >
              <option value="">Select column</option>
              {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={formOp}
              onChange={(e) => setFormOp(e.target.value)}
              className="w-16 px-2 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]"
            >
              <option value=">=">≥</option>
              <option value="<=">≤</option>
              <option value=">">{'>'}</option>
              <option value="<">{'<'}</option>
              <option value="=">=</option>
            </select>
            <input
              type="number"
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              placeholder="Target"
              className="w-28 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Cancel</button>
            <button onClick={addGoal} disabled={!formCol || !formValue} className="px-4 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-medium disabled:opacity-30">Add</button>
          </div>
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] text-center py-4">No goals set yet. Add KPI targets to track progress.</p>
      ) : (
        <div className="space-y-2">
          {goals.map(goal => {
            const result = evaluateGoal(goal);
            return (
              <div key={goal.id} className={`rounded-xl p-3 border ${result.met ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {result.met ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="text-sm font-medium text-[var(--text-primary)]">{goal.label}</span>
                  </div>
                  <button onClick={() => removeGoal(goal.id)} className="text-[var(--text-muted)] hover:text-rose-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${result.met ? 'bg-emerald-400' : 'bg-rose-400'}`}
                      style={{ width: `${Math.min(100, result.pct)}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-mono shrink-0">
                    <span className={result.met ? 'text-emerald-400' : 'text-rose-400'}>
                      {typeof result.actual === 'number' ? result.actual.toLocaleString(undefined, { maximumFractionDigits: 1 }) : result.actual}
                    </span>
                    <span className="text-[var(--text-muted)]">/</span>
                    <span className="text-[var(--text-muted)]">{goal.target.toLocaleString()}</span>
                    <span className={`ml-1 ${result.met ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ({result.pct}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
