import React, { useState, useCallback, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import AnalysisHistory from './components/AnalysisHistory';
import ComparisonMode from './components/ComparisonMode';
import Toast from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import { computeStats, formatDataPreview, parseAIResponse } from './utils/dataProcessor';

export default function App() {
  const [data, setData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [stats, setStats] = useState({});
  const [fileName, setFileName] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);
  const [savedId, setSavedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [comparisonMode, setComparisonMode] = useState(false);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('insightai-theme');
    if (stored) return stored === 'dark';
    return true; // default dark
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('insightai-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Load shared report on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get('report');
    if (reportId) {
      loadFromHistory(reportId);
    }
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  };

  const parseFileContents = (file) => {
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
  };

  const handleFileUpload = useCallback(async (file) => {
    setError(null);
    setFileName(file.name);
    setSavedId(null);
    setComparisonMode(false);

    try {
      const { data: parsedData, columns: cols } = await parseFileContents(file);
      setData(parsedData);
      setColumns(cols);
      const computedStats = computeStats(parsedData, cols);
      setStats(computedStats);

      // Auto-analyze with streaming
      await analyzeDataStreaming(parsedData, cols, computedStats, file.name);
    } catch (err) {
      setError(`Failed to parse file: ${err.message}`);
    }
  }, []);

  const analyzeDataStreaming = async (parsedData, cols, computedStats, name) => {
    setIsAnalyzing(true);
    setIsStreaming(true);
    setError(null);
    setAnalysis('');

    try {
      const response = await fetch('/api/stream', {
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
        // Fallback to non-streaming
        setIsStreaming(false);
        await analyzeData(parsedData, cols, computedStats, name);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') continue;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) {
              setError(parsed.error);
              break;
            }
            if (parsed.content) {
              fullText += parsed.content;
              setAnalysis(fullText);
            }
          } catch (e) {
            // skip malformed
          }
        }
      }

      setIsStreaming(false);
      setIsAnalyzing(false);

      // Save to history
      if (fullText) {
        saveToHistory(name || fileName, parsedData.length, cols.length, cols, computedStats, fullText);
      }
    } catch (err) {
      // Fallback to non-streaming
      setIsStreaming(false);
      console.warn('Streaming failed, falling back:', err.message);
      await analyzeData(parsedData, cols, computedStats, name);
    }
  };

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
        showToast('Saved to history');
      }
    } catch (err) {
      // Silently fail -- history is non-critical
      console.warn('Failed to save to history:', err);
    }
  };

  const loadFromHistory = async (id) => {
    try {
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
      setComparisonMode(false);

      // Clean the URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
    } catch (err) {
      setError('Failed to load analysis from history.');
    }
  };

  const handleQuery = async (query) => {
    if (!query.trim()) return;

    const newEntry = { query, answer: null, loading: true, streaming: false, id: Date.now() };
    setQueryHistory(prev => [...prev, newEntry]);

    try {
      // Try streaming first
      const response = await fetch('/api/stream', {
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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      // Mark as streaming
      setQueryHistory(prev =>
        prev.map(e => e.id === newEntry.id ? { ...e, loading: false, streaming: true, answer: '' } : e)
      );

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') continue;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.content) {
              fullText += parsed.content;
              setQueryHistory(prev =>
                prev.map(e => e.id === newEntry.id ? { ...e, answer: fullText } : e)
              );
            }
          } catch (e) {}
        }
      }

      setQueryHistory(prev =>
        prev.map(e => e.id === newEntry.id ? { ...e, streaming: false, answer: fullText || 'No response received.' } : e)
      );
    } catch (err) {
      // Fallback to non-streaming
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
            e.id === newEntry.id ? { ...e, answer: result.analysis, loading: false, streaming: false } : e
          )
        );
      } catch (fallbackErr) {
        setQueryHistory(prev =>
          prev.map(e =>
            e.id === newEntry.id
              ? { ...e, answer: 'Sorry, I couldn\'t process that query. Please try again.', loading: false, streaming: false }
              : e
          )
        );
      }
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
    setComparisonMode(false);
    setIsStreaming(false);
  };

  const handleShare = () => {
    if (!savedId) return;
    const url = `${window.location.origin}${window.location.pathname}?report=${savedId}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Shareable link copied to clipboard!', 'info');
    }).catch(() => {
      // Fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showToast('Shareable link copied to clipboard!', 'info');
    });
  };

  const hasAnalysis = !!analysis;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Header
        fileName={fileName}
        onReset={(data || hasAnalysis || comparisonMode) ? handleReset : null}
        rowCount={data?.length}
        colCount={columns.length}
        hasAnalysis={hasAnalysis}
        savedId={savedId}
        onShare={handleShare}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(d => !d)}
      />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {comparisonMode ? (
          <ComparisonMode onBack={() => setComparisonMode(false)} />
        ) : !data && !hasAnalysis ? (
          <div className="space-y-8">
            <FileUpload
              onUpload={handleFileUpload}
              error={error}
              onCompareMode={() => setComparisonMode(true)}
            />
            <div className="max-w-2xl mx-auto">
              <AnalysisHistory onLoad={loadFromHistory} />
            </div>
          </div>
        ) : (
          <>
            {savedId && !toast && (
              <div className="flex items-center gap-2 text-xs text-[var(--success)] mt-2 mb-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                Saved to history
              </div>
            )}
            <ErrorBoundary fallbackMessage="Dashboard encountered an error. Please try uploading your data again.">
              <Dashboard
                data={data}
                columns={columns}
                stats={stats}
                analysis={analysis}
                isAnalyzing={isAnalyzing}
                isStreaming={isStreaming}
                error={error}
                queryHistory={queryHistory}
                onQuery={handleQuery}
              />
            </ErrorBoundary>
          </>
        )}
      </main>

      {/* Toast notifications */}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
