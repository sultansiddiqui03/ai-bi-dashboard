import React, { useState, useEffect } from 'react';
import { Clock, Plus, X, Play, Pause, Bell, Calendar } from 'lucide-react';

const INTERVALS = [
  { label: 'Every hour', value: 3600000 },
  { label: 'Every 6 hours', value: 21600000 },
  { label: 'Every 12 hours', value: 43200000 },
  { label: 'Daily', value: 86400000 },
  { label: 'Weekly', value: 604800000 },
];

export default function ScheduledAnalysis({ onRunAnalysis, fileName }) {
  const [schedules, setSchedules] = useState(() => {
    try {
      const stored = localStorage.getItem('insightai-schedules');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [interval, setInterval] = useState(86400000);
  const [label, setLabel] = useState('');

  const save = (updated) => {
    setSchedules(updated);
    localStorage.setItem('insightai-schedules', JSON.stringify(updated));
  };

  const addSchedule = () => {
    const intervalInfo = INTERVALS.find(i => i.value === interval);
    const newSchedule = {
      id: Date.now(),
      label: label.trim() || `${fileName || 'Dataset'} analysis`,
      interval,
      intervalLabel: intervalInfo?.label || 'Custom',
      active: true,
      createdAt: new Date().toISOString(),
      lastRun: null,
      nextRun: new Date(Date.now() + interval).toISOString(),
    };
    save([...schedules, newSchedule]);
    setLabel('');
    setShowForm(false);
  };

  const toggleSchedule = (id) => {
    save(schedules.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const removeSchedule = (id) => {
    save(schedules.filter(s => s.id !== id));
  };

  const runNow = (id) => {
    save(schedules.map(s => s.id === id ? {
      ...s,
      lastRun: new Date().toISOString(),
      nextRun: new Date(Date.now() + s.interval).toISOString(),
    } : s));
    onRunAnalysis?.();
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Scheduled Analysis</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">Client-side</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-[var(--accent)] bg-[var(--accent-glow)] hover:brightness-110 transition-all"
        >
          <Plus className="w-3 h-3" />
          Schedule
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-3 rounded-xl bg-[var(--bg-secondary)] space-y-3 animate-fade-in">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Schedule name (optional)"
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)]"
          />
          <select
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]"
          >
            {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-[var(--text-muted)]">Cancel</button>
            <button onClick={addSchedule} className="px-4 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-medium">Create</button>
          </div>
          <p className="text-[9px] text-[var(--text-muted)]">
            Schedules run client-side while the browser tab is open. For server-side scheduling, deploy with Vercel Cron Jobs.
          </p>
        </div>
      )}

      {schedules.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] text-center py-4">
          No schedules set. Create one to get periodic re-analysis notifications.
        </p>
      ) : (
        <div className="space-y-2">
          {schedules.map(s => (
            <div key={s.id} className={`rounded-xl p-3 border ${s.active ? 'border-[var(--border-subtle)] bg-[var(--bg-secondary)]' : 'border-[var(--border-subtle)]/50 bg-[var(--bg-secondary)]/50 opacity-60'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-[var(--text-primary)]">{s.label}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => runNow(s.id)} className="p-1 rounded text-[var(--accent)] hover:bg-[var(--accent-glow)]" title="Run now">
                    <Play className="w-3 h-3" />
                  </button>
                  <button onClick={() => toggleSchedule(s.id)} className="p-1 rounded text-[var(--text-muted)] hover:text-amber-400" title={s.active ? 'Pause' : 'Resume'}>
                    {s.active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>
                  <button onClick={() => removeSchedule(s.id)} className="p-1 rounded text-[var(--text-muted)] hover:text-rose-400" title="Delete">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" />
                  {s.intervalLabel}
                </span>
                {s.lastRun && (
                  <span>Last: {new Date(s.lastRun).toLocaleString()}</span>
                )}
                {s.nextRun && s.active && (
                  <span className="text-[var(--accent)]">Next: {new Date(s.nextRun).toLocaleString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
