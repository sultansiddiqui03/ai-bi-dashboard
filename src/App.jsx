import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import AnalysisHistory from './components/AnalysisHistory';
import { computeStats, formatDataPreview, parseAIResponse } from './utils/dataProcessor';

export default function App() {
  const [data, setData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [stats, setStats] = useState({});
  const [fileName, setFileName] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);
  const [savedId, setSavedId] = useState(null);

  const handleFileUpload = useCallback((file) => {
    setError(null);
    setFileName(file.name);
    setSavedId(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: async (results) => {
        const parsedData = results.data;
        const cols = results.meta.fields || [];

        setData(parsedData);
        setColumns(cols);
        const computedStats = computeStats(parsedData, cols);
        setStats(computedStats);

        // Auto-analyze
        await analyzeData(parsedData, cols, computedStats, file.name);
      },
      error: (err) => {
        setError(`Failed to parse file: ${err.message}`);
      },
    });
  }, []);

  const analyzeData = async (parsedData, cols, computedStats, name) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataPreview: formatDataPreview(parsedData),
          columns: cols,
          stats: computedStats,
          mode: 'analyze',
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Analysis failed');
      }

      const result = await response.json();
      setAnalysis(result.analysis);

      // Save to history in the background
      saveToHistory(name || fileName, parsedData.length, cols.length, cols, computedStats, result.analysis);
    } catch (err) {
      setError(err.message);
      setAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveToHistory = async (name, rowCount, colCount, cols, computedStats, analysisText) => {
    try {
      const parsed = parseAIResponse(analysisText);
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: name,
          row_count: rowCount,
          col_count: colCount,
          columns: cols,
          stats: computedStats,
          analysis: analysisText,
          kpis: parsed.metrics,
          charts: parsed.chartRecommendations,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedId(data.saved?.id);
      }
    } catch (err) {
      // Silently fail — history is non-critical
      console.warn('Failed to save to history:', err);
    }
  };

  const loadFromHistory = async (id) => {
    try {
      // We need a detail endpoint — for now fetch full record
      const res = await fetch(`/api/history?id=${id}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      const record = data.analyses?.[0];
      if (!record) return;

      setFileName(record.file_name);
      setColumns(record.columns || []);
      setStats(record.stats || {});
      setAnalysis(record.analysis || '');
      setData(null); // No raw data when loading from history
      setSavedId(record.id);
      setQueryHistory([]);
    } catch (err) {
      setError('Failed to load analysis from history.');
    }
  };

  const handleQuery = async (query) => {
    if (!query.trim()) return;

    const newEntry = { query, answer: null, loading: true, id: Date.now() };
    setQueryHistory(prev => [...prev, newEntry]);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataPreview: data ? formatDataPreview(data) : '',
          columns,
          stats,
          query,
          mode: 'query',
        }),
      });

      if (!response.ok) throw new Error('Query failed');

      const result = await response.json();
      setQueryHistory(prev =>
        prev.map(e =>
          e.id === newEntry.id ? { ...e, answer: result.analysis, loading: false } : e
        )
      );
    } catch (err) {
      setQueryHistory(prev =>
        prev.map(e =>
          e.id === newEntry.id
            ? { ...e, answer: 'Sorry, I couldn\'t process that query. Please try again.', loading: false }
            : e
        )
      );
    }
  };

  const handleReset = () => {
    setData(null);
    setColumns([]);
    setStats({});
    setFileName('');
    setAnalysis(null);
    setError(null);
    setQueryHistory([]);
    setSavedId(null);
  };

  const hasAnalysis = !!analysis;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Header fileName={fileName} onReset={(data || hasAnalysis) ? handleReset : null} rowCount={data?.length} colCount={columns.length} />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {!data && !hasAnalysis ? (
          <div className="space-y-8">
            <FileUpload onUpload={handleFileUpload} error={error} />
            <div className="max-w-2xl mx-auto">
              <AnalysisHistory onLoad={loadFromHistory} />
            </div>
          </div>
        ) : (
          <>
            {savedId && (
              <div className="flex items-center gap-2 text-xs text-[var(--success)] mt-2 mb-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                Saved to history
              </div>
            )}
            <Dashboard
              data={data}
              columns={columns}
              stats={stats}
              analysis={analysis}
              isAnalyzing={isAnalyzing}
              error={error}
              queryHistory={queryHistory}
              onQuery={handleQuery}
            />
          </>
        )}
      </main>
    </div>
  );
}
