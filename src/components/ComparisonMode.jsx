import React, { useState, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, ArrowLeftRight, Loader2, X, Sparkles } from 'lucide-react';
import { computeStats, formatDataPreview, parseAIResponse, prepareChartData, CHART_COLORS, formatNumber } from '../utils/dataProcessor';
import KPICards from './KPICards';
import ChartPanel from './ChartPanel';
import AIInsights from './AIInsights';

function parseFile(file) {
  return new Promise((resolve, reject) => {
    const isExcel = /\.xlsx?$/i.test(file.name);
    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });
          const cols = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
          resolve({ data: jsonData, columns: cols });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          resolve({ data: results.data, columns: results.meta.fields || [] });
        },
        error: reject,
      });
    }
  });
}

export default function ComparisonMode({ onBack }) {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [dataA, setDataA] = useState(null);
  const [dataB, setDataB] = useState(null);
  const [columnsA, setColumnsA] = useState([]);
  const [columnsB, setColumnsB] = useState([]);
  const [statsA, setStatsA] = useState({});
  const [statsB, setStatsB] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const handleFileA = useCallback(async (file) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('File A exceeds 10MB limit.');
      return;
    }
    setError(null);
    setFileA(file);
    try {
      const { data, columns } = await parseFile(file);
      setDataA(data);
      setColumnsA(columns);
      setStatsA(computeStats(data, columns));
    } catch (err) {
      setError(`Failed to parse ${file.name}: ${err.message}`);
    }
  }, []);

  const handleFileB = useCallback(async (file) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('File B exceeds 10MB limit.');
      return;
    }
    setError(null);
    setFileB(file);
    try {
      const { data, columns } = await parseFile(file);
      setDataB(data);
      setColumnsB(columns);
      setStatsB(computeStats(data, columns));
    } catch (err) {
      setError(`Failed to parse ${file.name}: ${err.message}`);
    }
  }, []);

  const handleCompare = async () => {
    if (!dataA || !dataB) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataPreview: `--- DATASET A (${fileA.name}) ---\n${formatDataPreview(dataA)}\n\n--- DATASET B (${fileB.name}) ---\n${formatDataPreview(dataB)}`,
          columns: [...new Set([...columnsA, ...columnsB])],
          stats: { datasetA: statsA, datasetB: statsB },
          mode: 'compare',
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Comparison failed');
      }

      const result = await response.json();
      setAnalysis(result.analysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const autoChartsA = useMemo(() => {
    if (!dataA || !columnsA.length) return [];
    const numericCols = columnsA.filter(c => statsA[c]?.type === 'numeric');
    const categoricalCols = columnsA.filter(c => statsA[c]?.type === 'categorical');
    const charts = [];
    if (categoricalCols.length > 0 && numericCols.length > 0) {
      charts.push({
        type: 'bar', x: categoricalCols[0], y: numericCols[0],
        title: `${numericCols[0]} by ${categoricalCols[0]}`,
        data: prepareChartData(dataA, { type: 'bar', x: categoricalCols[0], y: numericCols[0] }),
        color: CHART_COLORS[0],
      });
    }
    return charts;
  }, [dataA, columnsA, statsA]);

  const autoChartsB = useMemo(() => {
    if (!dataB || !columnsB.length) return [];
    const numericCols = columnsB.filter(c => statsB[c]?.type === 'numeric');
    const categoricalCols = columnsB.filter(c => statsB[c]?.type === 'categorical');
    const charts = [];
    if (categoricalCols.length > 0 && numericCols.length > 0) {
      charts.push({
        type: 'bar', x: categoricalCols[0], y: numericCols[0],
        title: `${numericCols[0]} by ${categoricalCols[0]}`,
        data: prepareChartData(dataB, { type: 'bar', x: categoricalCols[0], y: numericCols[0] }),
        color: CHART_COLORS[1],
      });
    }
    return charts;
  }, [dataB, columnsB, statsB]);

  const numericColsA = columnsA.filter(c => statsA[c]?.type === 'numeric').slice(0, 6);
  const numericColsB = columnsB.filter(c => statsB[c]?.type === 'numeric').slice(0, 6);

  return (
    <div className="space-y-6 pt-6 animate-fade-in">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <X className="w-4 h-4" /> Back to single upload
      </button>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center justify-center gap-3">
          <ArrowLeftRight className="w-6 h-6 text-[var(--accent)]" />
          Compare Datasets
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">Upload two files to compare side by side</p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Upload zones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DropZone
          label="Dataset A"
          file={fileA}
          hasData={!!dataA}
          rowCount={dataA?.length}
          colCount={columnsA.length}
          onFile={handleFileA}
        />
        <DropZone
          label="Dataset B"
          file={fileB}
          hasData={!!dataB}
          rowCount={dataB?.length}
          colCount={columnsB.length}
          onFile={handleFileB}
        />
      </div>

      {/* Compare button */}
      {dataA && dataB && !analysis && (
        <div className="text-center">
          <button
            onClick={handleCompare}
            disabled={isAnalyzing}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-[var(--bg-primary)] font-medium text-sm hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Comparing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Compare with AI
              </>
            )}
          </button>
        </div>
      )}

      {/* Side-by-side KPIs */}
      {dataA && dataB && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              {fileA?.name} — KPIs
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {numericColsA.map(col => (
                <div key={col} className="glass-card p-3">
                  <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1 truncate">{col.replace(/_/g, ' ')}</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)] font-mono">{formatNumber(statsA[col].mean)}</p>
                  <p className="text-[9px] text-[var(--text-muted)] mt-0.5">avg</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              {fileB?.name} — KPIs
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {numericColsB.map(col => (
                <div key={col} className="glass-card p-3">
                  <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1 truncate">{col.replace(/_/g, ' ')}</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)] font-mono">{formatNumber(statsB[col].mean)}</p>
                  <p className="text-[9px] text-[var(--text-muted)] mt-0.5">avg</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Side-by-side charts */}
      {autoChartsA.length > 0 && autoChartsB.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {autoChartsA.map((chart, i) => (
            <ChartPanel key={`a-${i}`} chart={chart} index={0} />
          ))}
          {autoChartsB.map((chart, i) => (
            <ChartPanel key={`b-${i}`} chart={chart} index={1} />
          ))}
        </div>
      )}

      {/* AI comparison analysis */}
      {(analysis || isAnalyzing) && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">AI Comparison Analysis</h3>
          <AIInsights analysis={analysis || ''} isLoading={isAnalyzing} />
        </div>
      )}
    </div>
  );
}

function DropZone({ label, file, hasData, rowCount, colCount, onFile }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = React.useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div
      className={`upload-zone rounded-xl p-8 text-center cursor-pointer transition-all ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.xlsx,.xls"
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
        className="hidden"
      />
      {hasData ? (
        <div>
          <FileSpreadsheet className="w-8 h-8 text-[var(--success)] mx-auto mb-2" />
          <p className="text-sm font-medium text-[var(--text-primary)]">{file.name}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">{rowCount?.toLocaleString()} rows, {colCount} columns</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-2">Click to replace</p>
        </div>
      ) : (
        <div>
          <Upload className="w-8 h-8 text-[var(--accent)] mx-auto mb-2" />
          <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Drop a file here or click to browse</p>
        </div>
      )}
    </div>
  );
}
