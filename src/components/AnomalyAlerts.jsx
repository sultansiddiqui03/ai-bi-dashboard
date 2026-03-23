import React, { useState, useMemo, useEffect } from 'react';
import { Bell, BellRing, Plus, X, AlertTriangle, Check, TrendingUp, TrendingDown, Eye, EyeOff, Trash2 } from 'lucide-react';

export default function AnomalyAlerts({ data, columns, stats }) {
  const [alerts, setAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('askdata-alerts') || '[]'); } catch { return []; }
  });
  const [showPanel, setShowPanel] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formCol, setFormCol] = useState('');
  const [formCondition, setFormCondition] = useState('above');
  const [formThreshold, setFormThreshold] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);

  const numericCols = columns.filter(c => stats[c]?.type === 'numeric');

  // Save alerts to localStorage
  useEffect(() => {
    localStorage.setItem('askdata-alerts', JSON.stringify(alerts));
  }, [alerts]);

  // Auto-detect anomalies using IQR method
  const anomalies = useMemo(() => {
    if (!data || !columns.length) return [];
    const detected = [];

    numericCols.forEach(col => {
      const values = data.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
      if (values.length < 4) return;

      const sorted = [...values].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      const outlierCount = values.filter(v => v < lowerBound || v > upperBound).length;
      if (outlierCount > 0) {
        detected.push({
          column: col,
          outlierCount,
          totalCount: values.length,
          pct: ((outlierCount / values.length) * 100).toFixed(1),
          lowerBound: Math.round(lowerBound * 100) / 100,
          upperBound: Math.round(upperBound * 100) / 100,
          severity: outlierCount / values.length > 0.1 ? 'high' : outlierCount / values.length > 0.05 ? 'medium' : 'low',
        });
      }

      // Check for sudden spikes (>2x std deviation from moving average)
      if (values.length >= 5) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
        const lastValue = values[values.length - 1];
        const prevAvg = values.slice(-6, -1).reduce((a, b) => a + b, 0) / Math.min(5, values.length - 1);

        if (std > 0 && Math.abs(lastValue - prevAvg) > 2 * std) {
          detected.push({
            column: col,
            type: 'spike',
            lastValue: Math.round(lastValue * 100) / 100,
            prevAvg: Math.round(prevAvg * 100) / 100,
            direction: lastValue > prevAvg ? 'up' : 'down',
            severity: Math.abs(lastValue - prevAvg) > 3 * std ? 'high' : 'medium',
          });
        }
      }
    });

    return detected;
  }, [data, columns, stats]);

  // Evaluate user-defined alerts
  useEffect(() => {
    if (!stats) return;
    const triggered = alerts.map(alert => {
      const stat = stats[alert.column];
      if (!stat || stat.type !== 'numeric') return { ...alert, status: 'unknown' };

      const currentValue = stat.mean;
      let isTriggered = false;

      switch (alert.condition) {
        case 'above': isTriggered = currentValue > alert.threshold; break;
        case 'below': isTriggered = currentValue < alert.threshold; break;
        case 'change_above': isTriggered = Math.abs(currentValue - alert.threshold) / (alert.threshold || 1) > 0.2; break;
        default: isTriggered = false;
      }

      return { ...alert, status: isTriggered ? 'triggered' : 'ok', currentValue: Math.round(currentValue * 100) / 100 };
    });
    setTriggeredAlerts(triggered);
  }, [alerts, stats]);

  const addAlert = () => {
    if (!formCol || !formThreshold) return;
    setAlerts(prev => [...prev, {
      id: Date.now(),
      column: formCol,
      condition: formCondition,
      threshold: parseFloat(formThreshold),
      label: formLabel || `${formCol} ${formCondition} ${formThreshold}`,
      enabled: true,
      createdAt: new Date().toISOString(),
    }]);
    setFormCol(''); setFormThreshold(''); setFormLabel('');
    setShowForm(false);
  };

  const removeAlert = (id) => setAlerts(prev => prev.filter(a => a.id !== id));
  const toggleAlert = (id) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));

  const activeTriggered = triggeredAlerts.filter(a => a.enabled && a.status === 'triggered');
  const severityOrder = { high: 0, medium: 1, low: 2 };
  const sortedAnomalies = [...anomalies].sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));

  return (
    <div className="glass-card p-5">
      <button onClick={() => setShowPanel(!showPanel)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          {activeTriggered.length > 0 || anomalies.length > 0 ? (
            <BellRing className="w-4 h-4 text-amber-400 animate-pulse" />
          ) : (
            <Bell className="w-4 h-4 text-[var(--accent)]" />
          )}
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Anomaly Detection & Alerts</h3>
          {(anomalies.length > 0 || activeTriggered.length > 0) && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
              {anomalies.length + activeTriggered.length} issue{anomalies.length + activeTriggered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </button>

      {showPanel && (
        <div className="mt-4 space-y-4 animate-fade-in">
          {/* Auto-detected anomalies */}
          {sortedAnomalies.length > 0 && (
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">Auto-Detected Anomalies</p>
              <div className="space-y-2">
                {sortedAnomalies.map((a, i) => (
                  <div key={i} className={`rounded-xl p-3 border ${
                    a.severity === 'high' ? 'border-rose-500/20 bg-rose-500/5' :
                    a.severity === 'medium' ? 'border-amber-500/20 bg-amber-500/5' :
                    'border-sky-500/20 bg-sky-500/5'
                  }`}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-3.5 h-3.5 ${
                        a.severity === 'high' ? 'text-rose-400' : a.severity === 'medium' ? 'text-amber-400' : 'text-sky-400'
                      }`} />
                      <span className="text-xs font-medium text-[var(--text-primary)]">{a.column}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        a.severity === 'high' ? 'bg-rose-500/20 text-rose-400' :
                        a.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-sky-500/20 text-sky-400'
                      }`}>{a.severity}</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      {a.type === 'spike' ? (
                        <>Sudden {a.direction === 'up' ? 'spike' : 'drop'}: latest value {a.lastValue} vs recent avg {a.prevAvg}</>
                      ) : (
                        <>{a.outlierCount} outliers ({a.pct}%) detected outside [{a.lowerBound}, {a.upperBound}]</>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {anomalies.length === 0 && (
            <div className="text-center py-3">
              <Check className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-xs text-[var(--text-muted)]">No anomalies detected in your data.</p>
            </div>
          )}

          {/* User-defined alerts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Custom Alerts ({alerts.length})</p>
              <button onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-[var(--accent)] bg-[var(--accent-glow)] hover:brightness-110">
                <Plus className="w-3 h-3" /> Add Alert
              </button>
            </div>

            {showForm && (
              <div className="p-3 rounded-xl bg-[var(--bg-secondary)] space-y-2 mb-3 animate-fade-in">
                <input type="text" value={formLabel} onChange={e => setFormLabel(e.target.value)} placeholder="Alert name (optional)"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)]" />
                <div className="flex gap-2">
                  <select value={formCol} onChange={e => setFormCol(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]">
                    <option value="">Column</option>
                    {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={formCondition} onChange={e => setFormCondition(e.target.value)}
                    className="w-32 px-2 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]">
                    <option value="above">Mean above</option>
                    <option value="below">Mean below</option>
                    <option value="change_above">{"Change > 20%"}</option>
                  </select>
                  <input type="number" value={formThreshold} onChange={e => setFormThreshold(e.target.value)} placeholder="Value"
                    className="w-24 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)]" />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowForm(false)} className="px-3 py-1 text-[10px] text-[var(--text-muted)]">Cancel</button>
                  <button onClick={addAlert} disabled={!formCol || !formThreshold}
                    className="px-3 py-1 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] text-[10px] font-medium disabled:opacity-30">Add</button>
                </div>
              </div>
            )}

            {triggeredAlerts.length === 0 && !showForm && (
              <p className="text-xs text-[var(--text-muted)] text-center py-2">No custom alerts configured.</p>
            )}

            {triggeredAlerts.length > 0 && (
              <div className="space-y-1.5">
                {triggeredAlerts.map(alert => (
                  <div key={alert.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                    !alert.enabled ? 'opacity-40 border-[var(--border-subtle)]' :
                    alert.status === 'triggered' ? 'border-rose-500/20 bg-rose-500/5' :
                    'border-emerald-500/20 bg-emerald-500/5'
                  }`}>
                    {alert.status === 'triggered' && alert.enabled ? (
                      <BellRing className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">{alert.label}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Current: {alert.currentValue} · Target: {alert.condition} {alert.threshold}
                      </p>
                    </div>
                    <button onClick={() => toggleAlert(alert.id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                      {alert.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                    <button onClick={() => removeAlert(alert.id)} className="p-1 text-[var(--text-muted)] hover:text-rose-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
