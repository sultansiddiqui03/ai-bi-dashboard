import React, { useState, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Merge, Upload, ChevronRight, AlertTriangle, CheckCircle, X, FileSpreadsheet } from 'lucide-react';

export default function DatasetJoiner({ primaryData, primaryColumns, onJoinComplete }) {
  const [secondaryFile, setSecondaryFile] = useState(null);
  const [secondaryData, setSecondaryData] = useState(null);
  const [secondaryCols, setSecondaryCols] = useState([]);
  const [joinType, setJoinType] = useState('inner');
  const [leftKey, setLeftKey] = useState('');
  const [rightKey, setRightKey] = useState('');
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSecondaryFile(file);
    setError(null);
    setPreview(null);

    const isExcel = /\.xlsx?$/i.test(file.name);
    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });
          const cols = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
          setSecondaryData(jsonData);
          setSecondaryCols(cols);
        } catch (err) {
          setError('Failed to parse Excel file');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          setSecondaryData(results.data);
          setSecondaryCols(results.meta.fields || []);
        },
        error: () => setError('Failed to parse CSV file'),
      });
    }
  };

  // Find common columns for auto-suggest
  const commonCols = useMemo(() => {
    if (!secondaryCols.length) return [];
    return primaryColumns.filter(c => secondaryCols.includes(c));
  }, [primaryColumns, secondaryCols]);

  const performJoin = () => {
    if (!leftKey || !rightKey || !secondaryData) {
      setError('Please select join keys for both datasets');
      return;
    }

    try {
      const rightIndex = {};
      secondaryData.forEach(row => {
        const key = String(row[rightKey] || '');
        if (!rightIndex[key]) rightIndex[key] = [];
        rightIndex[key].push(row);
      });

      let joined = [];
      const rightCols = secondaryCols.filter(c => c !== rightKey);

      if (joinType === 'inner') {
        primaryData.forEach(leftRow => {
          const key = String(leftRow[leftKey] || '');
          const matches = rightIndex[key];
          if (matches) {
            matches.forEach(rightRow => {
              const merged = { ...leftRow };
              rightCols.forEach(c => {
                const colName = primaryColumns.includes(c) ? `${c}_2` : c;
                merged[colName] = rightRow[c];
              });
              joined.push(merged);
            });
          }
        });
      } else if (joinType === 'left') {
        primaryData.forEach(leftRow => {
          const key = String(leftRow[leftKey] || '');
          const matches = rightIndex[key];
          if (matches) {
            matches.forEach(rightRow => {
              const merged = { ...leftRow };
              rightCols.forEach(c => {
                const colName = primaryColumns.includes(c) ? `${c}_2` : c;
                merged[colName] = rightRow[c];
              });
              joined.push(merged);
            });
          } else {
            const merged = { ...leftRow };
            rightCols.forEach(c => {
              const colName = primaryColumns.includes(c) ? `${c}_2` : c;
              merged[colName] = null;
            });
            joined.push(merged);
          }
        });
      } else if (joinType === 'full') {
        const usedRightKeys = new Set();
        primaryData.forEach(leftRow => {
          const key = String(leftRow[leftKey] || '');
          const matches = rightIndex[key];
          if (matches) {
            usedRightKeys.add(key);
            matches.forEach(rightRow => {
              const merged = { ...leftRow };
              rightCols.forEach(c => {
                const colName = primaryColumns.includes(c) ? `${c}_2` : c;
                merged[colName] = rightRow[c];
              });
              joined.push(merged);
            });
          } else {
            const merged = { ...leftRow };
            rightCols.forEach(c => {
              const colName = primaryColumns.includes(c) ? `${c}_2` : c;
              merged[colName] = null;
            });
            joined.push(merged);
          }
        });
        // Add unmatched right rows
        secondaryData.forEach(rightRow => {
          const key = String(rightRow[rightKey] || '');
          if (!usedRightKeys.has(key)) {
            const merged = {};
            primaryColumns.forEach(c => { merged[c] = null; });
            merged[leftKey] = rightRow[rightKey];
            rightCols.forEach(c => {
              const colName = primaryColumns.includes(c) ? `${c}_2` : c;
              merged[colName] = rightRow[c];
            });
            joined.push(merged);
          }
        });
      }

      if (joined.length === 0) {
        setError('Join produced 0 rows. Check that the key columns have matching values.');
        return;
      }

      setPreview({ count: joined.length, sample: joined.slice(0, 5) });
      const newCols = joined.length > 0 ? Object.keys(joined[0]) : [];
      onJoinComplete(joined, newCols);
    } catch (err) {
      setError(`Join failed: ${err.message}`);
    }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Merge className="w-4 h-4 text-[var(--accent)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Join Datasets</h3>
      </div>

      {/* Primary dataset info */}
      <div className="rounded-xl bg-[var(--bg-secondary)] p-3">
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[var(--text-primary)] font-medium">Primary Dataset</span>
          <span className="text-[var(--text-muted)]">— {primaryData.length} rows, {primaryColumns.length} columns</span>
        </div>
      </div>

      {/* Upload secondary */}
      {!secondaryData ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="rounded-xl border-2 border-dashed border-[var(--border-subtle)] p-6 text-center cursor-pointer hover:border-[var(--accent)] transition-all"
        >
          <input ref={fileRef} type="file" accept=".csv,.tsv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          <Upload className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-sm text-[var(--text-secondary)]">Upload second dataset to join</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">CSV, TSV, or Excel</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-[var(--bg-secondary)] p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[var(--text-primary)] font-medium">{secondaryFile?.name}</span>
                <span className="text-[var(--text-muted)]">— {secondaryData.length} rows, {secondaryCols.length} columns</span>
              </div>
              <button onClick={() => { setSecondaryData(null); setSecondaryCols([]); setSecondaryFile(null); setPreview(null); }} className="text-[var(--text-muted)] hover:text-rose-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {commonCols.length > 0 && (
            <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Common columns: {commonCols.join(', ')}
            </div>
          )}

          {/* Join config */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Left Key</label>
              <select
                value={leftKey}
                onChange={(e) => setLeftKey(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]"
              >
                <option value="">Select column</option>
                {primaryColumns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Join Type</label>
              <select
                value={joinType}
                onChange={(e) => setJoinType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]"
              >
                <option value="inner">Inner Join</option>
                <option value="left">Left Join</option>
                <option value="full">Full Outer Join</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Right Key</label>
              <select
                value={rightKey}
                onChange={(e) => setRightKey(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]"
              >
                <option value="">Select column</option>
                {secondaryCols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={performJoin}
            disabled={!leftKey || !rightKey}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--bg-primary)] text-sm font-medium hover:brightness-110 disabled:opacity-30 transition-all"
          >
            <Merge className="w-4 h-4" />
            Join Datasets
            <ChevronRight className="w-4 h-4" />
          </button>

          {preview && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Joined successfully! {preview.count} rows produced. Data is now loaded in the dashboard.
            </div>
          )}
        </>
      )}

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}
