import React, { useState, useEffect } from 'react';
import { Clock, Trash2, FileText, ChevronRight, Database, Loader2 } from 'lucide-react';

export default function AnalysisHistory({ onLoad }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/history');
      if (!res.ok) throw new Error('Failed to load history');
      const data = await res.json();
      setHistory(data.analyses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setHistory(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
        <Loader2 className="w-6 h-6 animate-spin mb-3" />
        <p className="text-sm">Loading history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <Database className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)] opacity-50" />
        <p className="text-[var(--text-muted)] text-sm">Database not connected</p>
        <p className="text-[var(--text-muted)] text-xs mt-1 opacity-60">Configure Supabase to enable history</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-16">
        <Clock className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)] opacity-50" />
        <p className="text-[var(--text-muted)] text-sm">No analyses yet</p>
        <p className="text-[var(--text-muted)] text-xs mt-1 opacity-60">Upload a CSV to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Recent Analyses
        </h3>
        <span className="text-xs text-[var(--text-muted)]">{history.length} saved</span>
      </div>

      {history.map((item) => (
        <button
          key={item.id}
          onClick={() => onLoad(item.id)}
          className="w-full glass-card p-4 flex items-center gap-4 group cursor-pointer text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-glow)] flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-[var(--accent)]" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {item.file_name}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {item.row_count?.toLocaleString()} rows · {item.col_count} columns · {formatDate(item.created_at)}
            </p>
          </div>

          <button
            onClick={(e) => handleDelete(item.id, e)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[var(--danger)]/10 text-[var(--text-muted)] hover:text-[var(--danger)] transition-all"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}
    </div>
  );
}
