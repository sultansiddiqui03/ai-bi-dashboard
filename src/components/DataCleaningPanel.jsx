import React, { useState, useCallback } from 'react';
import { Eraser, Copy, ArrowUpDown, Type, Hash, Trash2, CheckCircle2, AlertTriangle, Wrench, Undo2, Redo2 } from 'lucide-react';

export default function DataCleaningPanel({ data, columns, stats, onDataUpdate }) {
  const [operations, setOperations] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [history, setHistory] = useState([]); // undo stack
  const [future, setFuture] = useState([]);   // redo stack

  if (!data || !columns.length) return null;

  // Save state for undo before any operation
  const pushUndo = useCallback((currentData) => {
    setHistory(prev => [...prev.slice(-20), currentData]); // Keep last 20 states
    setFuture([]); // Clear redo stack on new action
  }, []);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prevData = history[history.length - 1];
    setFuture(prev => [data, ...prev]);
    setHistory(prev => prev.slice(0, -1));
    onDataUpdate(prevData);
    setOperations(prev => [...prev, { action: 'Undo', detail: 'Reverted last operation', time: new Date().toLocaleTimeString() }]);
  }, [history, data, onDataUpdate]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const nextData = future[0];
    setHistory(prev => [...prev, data]);
    setFuture(prev => prev.slice(1));
    onDataUpdate(nextData);
    setOperations(prev => [...prev, { action: 'Redo', detail: 'Re-applied operation', time: new Date().toLocaleTimeString() }]);
  }, [future, data, onDataUpdate]);

  // Calculate data quality metrics
  const totalCells = data.length * columns.length;
  const missingCells = columns.reduce((acc, col) => {
    return acc + data.filter(row => row[col] === null || row[col] === undefined || row[col] === '').length;
  }, 0);
  const missingPercent = totalCells > 0 ? ((missingCells / totalCells) * 100).toFixed(1) : 0;

  const seen = new Set();
  let duplicateCount = 0;
  data.forEach(row => {
    const key = JSON.stringify(row);
    if (seen.has(key)) duplicateCount++;
    else seen.add(key);
  });

  const removeDuplicates = () => {
    pushUndo(data);
    const seen = new Set();
    const cleaned = data.filter(row => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const removed = data.length - cleaned.length;
    if (removed > 0) {
      onDataUpdate(cleaned);
      setOperations(prev => [...prev, { action: 'Remove duplicates', detail: `${removed} rows removed`, time: new Date().toLocaleTimeString() }]);
    }
  };

  const fillMissingValues = (col, method) => {
    pushUndo(data);
    const stat = stats[col];
    let fillValue;

    if (method === 'mean' && stat?.type === 'numeric') fillValue = stat.mean;
    else if (method === 'median' && stat?.type === 'numeric') fillValue = stat.median;
    else if (method === 'mode') {
      fillValue = stat?.type === 'categorical' && stat.topValues?.length > 0 ? stat.topValues[0].value : 0;
    } else if (method === 'zero') fillValue = stat?.type === 'numeric' ? 0 : '';
    else return;

    let filled = 0;
    const cleaned = data.map(row => {
      if (row[col] === null || row[col] === undefined || row[col] === '') {
        filled++;
        return { ...row, [col]: fillValue };
      }
      return row;
    });

    if (filled > 0) {
      onDataUpdate(cleaned);
      setOperations(prev => [...prev, {
        action: `Fill missing in "${col}"`,
        detail: `${filled} cells filled with ${method} (${fillValue})`,
        time: new Date().toLocaleTimeString(),
      }]);
    }
  };

  const removeRowsWithMissing = (col) => {
    pushUndo(data);
    const cleaned = data.filter(row => row[col] !== null && row[col] !== undefined && row[col] !== '');
    const removed = data.length - cleaned.length;
    if (removed > 0) {
      onDataUpdate(cleaned);
      setOperations(prev => [...prev, {
        action: `Remove rows missing "${col}"`,
        detail: `${removed} rows removed`,
        time: new Date().toLocaleTimeString(),
      }]);
    }
  };

  const convertColumnType = (col, toType) => {
    pushUndo(data);
    const cleaned = data.map(row => {
      const val = row[col];
      if (toType === 'number') {
        const num = parseFloat(val);
        return { ...row, [col]: isNaN(num) ? null : num };
      }
      return { ...row, [col]: val != null ? String(val) : '' };
    });
    onDataUpdate(cleaned);
    setOperations(prev => [...prev, {
      action: `Convert "${col}" to ${toType}`,
      detail: `Column type changed`,
      time: new Date().toLocaleTimeString(),
    }]);
  };

  const trimWhitespace = () => {
    pushUndo(data);
    let trimmed = 0;
    const cleaned = data.map(row => {
      const newRow = { ...row };
      columns.forEach(col => {
        if (typeof newRow[col] === 'string' && newRow[col] !== newRow[col].trim()) {
          newRow[col] = newRow[col].trim();
          trimmed++;
        }
      });
      return newRow;
    });
    if (trimmed > 0) {
      onDataUpdate(cleaned);
      setOperations(prev => [...prev, { action: 'Trim whitespace', detail: `${trimmed} cells trimmed`, time: new Date().toLocaleTimeString() }]);
    } else {
      setOperations(prev => [...prev, { action: 'Trim whitespace', detail: 'No whitespace found', time: new Date().toLocaleTimeString() }]);
    }
  };

  const columnsWithMissing = columns.filter(col =>
    data.some(row => row[col] === null || row[col] === undefined || row[col] === '')
  );

  return (
    <div className="space-y-3">
      <button onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors">
        <Wrench className="w-4 h-4" />
        <span className="font-medium">Data Cleaning</span>
        {missingPercent > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400">{missingPercent}% missing</span>
        )}
        {duplicateCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400">{duplicateCount} duplicates</span>
        )}
      </button>

      {showPanel && (
        <div className="glass-card p-5 space-y-5 animate-fade-in">
          {/* Data Quality Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/[0.02] rounded-xl p-3">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Rows</p>
              <p className="text-lg font-semibold text-[var(--text-primary)] font-mono">{data.length.toLocaleString()}</p>
            </div>
            <div className="bg-white/[0.02] rounded-xl p-3">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Missing Cells</p>
              <p className={`text-lg font-semibold font-mono ${missingCells > 0 ? 'text-amber-400' : 'text-[var(--success)]'}`}>
                {missingCells.toLocaleString()}
              </p>
            </div>
            <div className="bg-white/[0.02] rounded-xl p-3">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Duplicates</p>
              <p className={`text-lg font-semibold font-mono ${duplicateCount > 0 ? 'text-rose-400' : 'text-[var(--success)]'}`}>
                {duplicateCount.toLocaleString()}
              </p>
            </div>
            <div className="bg-white/[0.02] rounded-xl p-3">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Quality</p>
              <p className={`text-lg font-semibold font-mono ${missingPercent < 5 ? 'text-[var(--success)]' : 'text-amber-400'}`}>
                {(100 - missingPercent).toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Quick Actions with Undo/Redo */}
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleUndo} disabled={history.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Undo last operation">
                <Undo2 className="w-3.5 h-3.5" />
                Undo {history.length > 0 && `(${history.length})`}
              </button>
              <button onClick={handleRedo} disabled={future.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Redo operation">
                <Redo2 className="w-3.5 h-3.5" />
                Redo {future.length > 0 && `(${future.length})`}
              </button>
              <div className="w-px h-8 bg-[var(--border-subtle)]" />
              <button onClick={removeDuplicates} disabled={duplicateCount === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <Copy className="w-3.5 h-3.5" />
                Remove Duplicates ({duplicateCount})
              </button>
              <button onClick={trimWhitespace}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-all">
                <Eraser className="w-3.5 h-3.5" />
                Trim Whitespace
              </button>
            </div>
          </div>

          {/* Column-level cleaning */}
          {columnsWithMissing.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                <AlertTriangle className="w-3 h-3 inline mr-1 text-amber-400" />
                Columns with Missing Values
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {columnsWithMissing.map(col => {
                  const missingCount = data.filter(row => row[col] === null || row[col] === undefined || row[col] === '').length;
                  const isNumeric = stats[col]?.type === 'numeric';
                  return (
                    <div key={col} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-[var(--border-subtle)]">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)] font-medium truncate">{col}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {missingCount} missing ({((missingCount / data.length) * 100).toFixed(1)}%) · {isNumeric ? 'numeric' : 'categorical'}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {isNumeric && (
                          <>
                            <button onClick={() => fillMissingValues(col, 'mean')}
                              className="px-2 py-1 rounded text-[10px] font-medium bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-all">Mean</button>
                            <button onClick={() => fillMissingValues(col, 'median')}
                              className="px-2 py-1 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">Median</button>
                          </>
                        )}
                        <button onClick={() => fillMissingValues(col, 'mode')}
                          className="px-2 py-1 rounded text-[10px] font-medium bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all">Mode</button>
                        <button onClick={() => removeRowsWithMissing(col)}
                          className="px-2 py-1 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Type Conversion */}
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">Type Conversion</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {columns.slice(0, 12).map(col => {
                const isNumeric = stats[col]?.type === 'numeric';
                return (
                  <button key={col} onClick={() => convertColumnType(col, isNumeric ? 'string' : 'number')}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] text-xs text-[var(--text-secondary)] hover:bg-white/5 transition-all text-left">
                    {isNumeric ? <Hash className="w-3 h-3 text-sky-400 shrink-0" /> : <Type className="w-3 h-3 text-emerald-400 shrink-0" />}
                    <span className="truncate">{col}</span>
                    <ArrowUpDown className="w-3 h-3 text-[var(--text-muted)] ml-auto shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Operation History */}
          {operations.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">History</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {operations.slice().reverse().map((op, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-3 h-3 text-[var(--success)] shrink-0" />
                    <span className="text-[var(--text-secondary)]">{op.action}</span>
                    <span className="text-[var(--text-muted)]">— {op.detail}</span>
                    <span className="text-[var(--text-muted)] ml-auto shrink-0">{op.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
