import React, { useMemo, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

function detectOutliers(values) {
  if (values.length < 4) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  return values.filter(v => v < lower || v > upper);
}

function findDuplicateRows(data) {
  const seen = new Set();
  let dupes = 0;
  data.forEach(row => {
    const key = JSON.stringify(row);
    if (seen.has(key)) dupes++;
    else seen.add(key);
  });
  return dupes;
}

export default function DataProfiler({ data, columns, stats }) {
  const [expanded, setExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const profile = useMemo(() => {
    if (!data || !columns.length) return null;

    const totalCells = data.length * columns.length;
    let missingCells = 0;
    let totalOutliers = 0;
    const columnProfiles = {};

    columns.forEach(col => {
      const values = data.map(r => r[col]);
      const missing = values.filter(v => v === null || v === undefined || v === '').length;
      missingCells += missing;
      const missingPct = (missing / data.length) * 100;

      let outliers = [];
      let typeMismatches = 0;
      if (stats[col]?.type === 'numeric') {
        const nums = values.map(Number).filter(v => !isNaN(v));
        outliers = detectOutliers(nums);
        totalOutliers += outliers.length;
        typeMismatches = values.filter(v => v !== null && v !== undefined && v !== '' && isNaN(Number(v))).length;
      }

      columnProfiles[col] = {
        missing,
        missingPct: Math.round(missingPct * 10) / 10,
        outlierCount: outliers.length,
        typeMismatches,
        completeness: Math.round(((data.length - missing) / data.length) * 100),
      };
    });

    const duplicateRows = findDuplicateRows(data);
    const completeness = Math.round(((totalCells - missingCells) / totalCells) * 100);
    const duplicatePct = Math.round((duplicateRows / data.length) * 100);
    const outlierPct = Math.round((totalOutliers / totalCells) * 100);

    // Score: 100 - penalties
    let score = 100;
    score -= Math.min(30, (100 - completeness) * 0.6); // missing data penalty
    score -= Math.min(20, duplicatePct * 0.5); // duplicate penalty
    score -= Math.min(20, outlierPct * 2); // outlier penalty
    // Type consistency penalty
    const typeIssues = Object.values(columnProfiles).reduce((s, p) => s + p.typeMismatches, 0);
    score -= Math.min(15, (typeIssues / totalCells) * 100);
    score = Math.max(0, Math.round(score));

    return {
      score,
      completeness,
      missingCells,
      totalCells,
      duplicateRows,
      duplicatePct,
      totalOutliers,
      outlierPct,
      columnProfiles,
    };
  }, [data, columns, stats]);

  if (!profile) return null;

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-emerald-400';
    if (score >= 65) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getScoreBg = (score) => {
    if (score >= 85) return 'bg-emerald-500/15';
    if (score >= 65) return 'bg-amber-500/15';
    return 'bg-rose-500/15';
  };

  const getScoreLabel = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Attention';
  };

  const getScoreIcon = (score) => {
    if (score >= 85) return CheckCircle;
    if (score >= 65) return AlertTriangle;
    return XCircle;
  };

  const ScoreIcon = getScoreIcon(profile.score);

  const issues = [];
  if (profile.completeness < 95) issues.push({ label: `${profile.missingCells} missing values (${100 - profile.completeness}%)`, severity: profile.completeness < 80 ? 'high' : 'medium' });
  if (profile.duplicateRows > 0) issues.push({ label: `${profile.duplicateRows} duplicate rows (${profile.duplicatePct}%)`, severity: profile.duplicatePct > 10 ? 'high' : 'medium' });
  if (profile.totalOutliers > 0) issues.push({ label: `${profile.totalOutliers} potential outliers detected`, severity: profile.outlierPct > 5 ? 'high' : 'low' });
  const typeIssueCount = Object.values(profile.columnProfiles).reduce((s, p) => s + p.typeMismatches, 0);
  if (typeIssueCount > 0) issues.push({ label: `${typeIssueCount} type mismatches in numeric columns`, severity: 'medium' });

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${getScoreBg(profile.score)} flex items-center justify-center`}>
            <Shield className={`w-5 h-5 ${getScoreColor(profile.score)}`} />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-[var(--text-primary)]">Data Quality Score</p>
            <p className="text-xs text-[var(--text-muted)]">{getScoreLabel(profile.score)} — {issues.length === 0 ? 'No issues found' : `${issues.length} issue${issues.length > 1 ? 's' : ''} detected`}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-bold font-mono ${getScoreColor(profile.score)}`}>
            {profile.score}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
        </div>
      </button>

      {/* Score bar */}
      <div className="mt-3 h-2 rounded-full bg-[var(--border-subtle)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            profile.score >= 85 ? 'bg-emerald-400' : profile.score >= 65 ? 'bg-amber-400' : 'bg-rose-400'
          }`}
          style={{ width: `${profile.score}%` }}
        />
      </div>

      {expanded && (
        <div className="mt-5 space-y-4 animate-fade-in">
          {/* Summary metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-[var(--bg-secondary)] p-3">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Completeness</p>
              <p className={`text-lg font-mono font-semibold ${profile.completeness >= 95 ? 'text-emerald-400' : profile.completeness >= 80 ? 'text-amber-400' : 'text-rose-400'}`}>
                {profile.completeness}%
              </p>
            </div>
            <div className="rounded-xl bg-[var(--bg-secondary)] p-3">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Duplicates</p>
              <p className={`text-lg font-mono font-semibold ${profile.duplicateRows === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {profile.duplicateRows}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--bg-secondary)] p-3">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Outliers</p>
              <p className={`text-lg font-mono font-semibold ${profile.totalOutliers === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {profile.totalOutliers}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--bg-secondary)] p-3">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Total Cells</p>
              <p className="text-lg font-mono font-semibold text-[var(--text-primary)]">
                {profile.totalCells.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Issues list */}
          {issues.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Issues</p>
              {issues.map((issue, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    issue.severity === 'high' ? 'bg-rose-400' : issue.severity === 'medium' ? 'bg-amber-400' : 'bg-sky-400'
                  }`} />
                  <span className="text-[var(--text-secondary)]">{issue.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Column-level details toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-xs text-[var(--accent)] hover:underline"
          >
            {showDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showDetails ? 'Hide' : 'Show'} column details
          </button>

          {showDetails && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                    <th className="text-left py-2 pr-4 font-medium">Column</th>
                    <th className="text-left py-2 pr-4 font-medium">Type</th>
                    <th className="text-right py-2 pr-4 font-medium">Complete</th>
                    <th className="text-right py-2 pr-4 font-medium">Missing</th>
                    <th className="text-right py-2 pr-4 font-medium">Outliers</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map(col => {
                    const cp = profile.columnProfiles[col];
                    return (
                      <tr key={col} className="border-b border-[var(--border-subtle)]/50">
                        <td className="py-2 pr-4 text-[var(--text-primary)] font-mono">{col}</td>
                        <td className="py-2 pr-4">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            stats[col]?.type === 'numeric' ? 'bg-sky-500/10 text-sky-400' : 'bg-violet-500/10 text-violet-400'
                          }`}>
                            {stats[col]?.type || 'unknown'}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">
                          <span className={cp.completeness >= 95 ? 'text-emerald-400' : cp.completeness >= 80 ? 'text-amber-400' : 'text-rose-400'}>
                            {cp.completeness}%
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-right font-mono text-[var(--text-muted)]">{cp.missing}</td>
                        <td className="py-2 pr-4 text-right font-mono text-[var(--text-muted)]">{cp.outlierCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
