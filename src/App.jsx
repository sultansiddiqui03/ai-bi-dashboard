import React, { useState, useCallback, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import AnalysisHistory from './components/AnalysisHistory';
import ComparisonMode from './components/ComparisonMode';
import Footer from './components/Footer';
import Toast from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import ColumnMappingWizard from './components/ColumnMappingWizard';
import CommandPalette from './components/CommandPalette';
import OnboardingTour from './components/OnboardingTour';
import DataConnectors from './components/DataConnectors';
import LanguageSelector, { getLanguageInstruction } from './components/LanguageSelector';
import ShareWithPassword from './components/ShareWithPassword';
import SamplingIndicator from './components/SamplingIndicator';
import { computeStats, formatDataPreview, parseAIResponse } from './utils/dataProcessor';

export default function App() {
  const [data, setData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [stats, setStats] = useState({});
  const [fileName, setFileName] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [aiMetrics, setAiMetrics] = useState([]);
  const [aiCharts, setAiCharts] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);
  const [savedId, setSavedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [activeTab, setActiveTab] = useState('insights');
  const [showColumnWizard, setShowColumnWizard] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState(null);
  const [chartColors, setChartColors] = useState(null);

  // Language for AI output
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('askdata-language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('askdata-language', language);
  }, [language]);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('askdata-theme');
    if (stored) return stored === 'dark';
    return true;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('askdata-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Load shared report on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get('report');
    const expiryStr = params.get('expires');

    // Check expiry
    if (expiryStr) {
      const expiryDate = new Date(expiryStr);
      if (expiryDate < new Date()) {
        setError('This shared link has expired.');
        return;
      }
    }

    if (reportId) {
      loadFromHistory(reportId);
    }
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  };

  // Command palette + keyboard shortcut handler
  const handleAction = useCallback((action) => {
    switch (action) {
      case 'search':
      case 'tab-query':
        setActiveTab('query');
        break;
      case 'tab-insights':
        setActiveTab('insights');
        break;
      case 'tab-charts':
        setActiveTab('charts');
        break;
      case 'tab-data':
        setActiveTab('data');
        break;
      case 'tab-builder':
        setActiveTab('builder');
        break;
      case 'tab-templates':
        setActiveTab('templates');
        break;
      case 'tab-forecast':
        setActiveTab('forecast');
        break;
      case 'tab-dashboard-builder':
        setActiveTab('dashboard-builder');
        break;
      case 'theme':
        setDarkMode(d => !d);
        break;
      case 'export':
        document.querySelector('[data-export-btn]')?.click();
        break;
      case 'share':
        handleShare();
        break;
      case 'reset':
        handleReset();
        break;
      case 'run-analysis':
        handleRunAnalysis();
        break;
      case 'generate-story':
        setActiveTab('insights');
        break;
      case 'generate-code':
        setActiveTab('insights');
        break;
      case 'show-tour':
        window.dispatchEvent(new Event('askdata-show-tour'));
        break;
    }
  }, []);

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
    setAiMetrics([]);
    setAiCharts([]);
    setActiveTab('insights');
    setShowColumnWizard(false);

    try {
      const { data: parsedData, columns: cols } = await parseFileContents(file);
      setData(parsedData);
      setColumns(cols);
      const computedStats = computeStats(parsedData, cols);
      setStats(computedStats);

      setPendingAnalysis({ data: parsedData, cols, stats: computedStats, name: file.name });
      setShowColumnWizard(true);
    } catch (err) {
      setError(`Failed to parse file: ${err.message}`);
    }
  }, []);

  // Handle data loaded from connectors (CSV URL, JSON API, Google Sheets)
  const handleConnectorData = useCallback((parsedData, cols, name) => {
    setError(null);
    setFileName(name);
    setSavedId(null);
    setComparisonMode(false);
    setAiMetrics([]);
    setAiCharts([]);
    setActiveTab('insights');

    setData(parsedData);
    setColumns(cols);
    const computedStats = computeStats(parsedData, cols);
    setStats(computedStats);

    setPendingAnalysis({ data: parsedData, cols, stats: computedStats, name });
    setShowColumnWizard(true);
  }, []);

  const handleColumnMappingConfirm = useCallback(async (mappings) => {
    setShowColumnWizard(false);
    if (pendingAnalysis) {
      const { data: parsedData, cols, stats: computedStats, name } = pendingAnalysis;
      setPendingAnalysis(null);
      await analyzeDataStreaming(parsedData, cols, computedStats, name);
    }
  }, [pendingAnalysis]);

  const handleColumnMappingSkip = useCallback(async () => {
    setShowColumnWizard(false);
    if (pendingAnalysis) {
      const { data: parsedData, cols, stats: computedStats, name } = pendingAnalysis;
      setPendingAnalysis(null);
      await analyzeDataStreaming(parsedData, cols, computedStats, name);
    }
  }, [pendingAnalysis]);

  const handleJoinComplete = useCallback((joinedData, newCols) => {
    setData(joinedData);
    setColumns(newCols);
    const newStats = computeStats(joinedData, newCols);
    setStats(newStats);
    showToast(`Datasets joined! ${joinedData.length} rows, ${newCols.length} columns.`);
  }, []);

  const handleRunAnalysis = useCallback(() => {
    if (data && columns.length) {
      analyzeDataStreaming(data, columns, stats, fileName);
    }
  }, [data, columns, stats, fileName]);

  const analyzeDataStreaming = async (parsedData, cols, computedStats, name) => {
    setIsAnalyzing(true);
    setIsStreaming(true);
    setError(null);
    setAnalysis('');
    setAiMetrics([]);
    setAiCharts([]);

    const langInstruction = getLanguageInstruction(language);

    try {
      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataPreview: formatDataPreview(parsedData),
          columns: cols,
          stats: computedStats,
          mode: 'analyze',
          language: language,
          languageInstruction: langInstruction,
        }),
      });

      if (!response.ok) {
        setIsStreaming(false);
        await analyzeData(parsedData, cols, computedStats, name);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';
      let receivedMetrics = [];
      let receivedCharts = [];

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
            if (parsed.error) { setError(parsed.error); break; }
            if (parsed.type === 'structured') {
              receivedMetrics = parsed.metrics || [];
              receivedCharts = parsed.charts || [];
              setAiMetrics(receivedMetrics);
              setAiCharts(receivedCharts);
              continue;
            }
            if (parsed.content) {
              fullText += parsed.content;
              setAnalysis(fullText);
            }
          } catch (e) {}
        }
      }

      setIsStreaming(false);
      setIsAnalyzing(false);

      if (fullText) {
        saveToHistory(name || fileName, parsedData.length, cols.length, cols, computedStats, fullText, receivedMetrics, receivedCharts);
      }
    } catch (err) {
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
          language: language,
          languageInstruction: getLanguageInstruction(language),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Analysis failed');
      }

      const result = await response.json();
      setAnalysis(result.analysis);

      const metrics = result.metrics || [];
      const charts = result.charts || [];
      setAiMetrics(metrics);
      setAiCharts(charts);

      saveToHistory(name || fileName, parsedData.length, cols.length, cols, computedStats, result.analysis, metrics, charts);
    } catch (err) {
      setError(err.message);
      setAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveToHistory = async (name, rowCount, colCount, cols, computedStats, analysisText, metrics, charts) => {
    try {
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
          kpis: metrics || [],
          charts: charts || [],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedId(data.saved?.id);
        showToast('Saved to history');
      }
    } catch (err) {
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
      setData(null);
      setSavedId(record.id);
      setQueryHistory([]);
      setComparisonMode(false);

      if (record.kpis && Array.isArray(record.kpis) && record.kpis.length > 0) {
        setAiMetrics(record.kpis);
      } else {
        const parsed = parseAIResponse(record.analysis || '');
        setAiMetrics(parsed.metrics);
      }
      if (record.charts && Array.isArray(record.charts) && record.charts.length > 0) {
        setAiCharts(record.charts);
      } else {
        const parsed = parseAIResponse(record.analysis || '');
        setAiCharts(parsed.chartRecommendations);
      }

      window.history.replaceState({}, '', window.location.pathname);
    } catch (err) {
      setError('Failed to load analysis from history.');
    }
  };

  const handleQuery = async (query) => {
    if (!query.trim()) return;

    const newEntry = { query, answer: null, loading: true, streaming: false, id: Date.now() };
    setQueryHistory(prev => [...prev, newEntry]);

    const recentHistory = queryHistory
      .filter(e => e.answer && !e.loading)
      .slice(-5)
      .map(e => `Q: ${e.query}\nA: ${e.answer}`)
      .join('\n\n');

    const langInstruction = getLanguageInstruction(language);
    const queryWithContext = recentHistory
      ? `Previous conversation:\n${recentHistory}\n\nNew question: ${query}${langInstruction}`
      : `${query}${langInstruction}`;

    try {
      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataPreview: data ? formatDataPreview(data) : '',
          columns,
          stats,
          query: queryWithContext,
          mode: 'query',
        }),
      });

      if (!response.ok) throw new Error('Query failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

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
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataPreview: data ? formatDataPreview(data) : '',
            columns, stats,
            query: queryWithContext,
            mode: 'query',
          }),
        });

        if (!response.ok) throw new Error('Query failed');
        const result = await response.json();
        setQueryHistory(prev =>
          prev.map(e => e.id === newEntry.id ? { ...e, answer: result.analysis, loading: false, streaming: false } : e)
        );
      } catch (fallbackErr) {
        setQueryHistory(prev =>
          prev.map(e => e.id === newEntry.id
            ? { ...e, answer: 'Sorry, I couldn\'t process that query. Please try again.', loading: false, streaming: false }
            : e
          )
        );
      }
    }
  };

  const handleDataUpdate = useCallback((newData) => {
    setData(newData);
    const newStats = computeStats(newData, columns);
    setStats(newStats);
    showToast('Data updated successfully');
  }, [columns]);

  const handleReset = () => {
    setData(null);
    setColumns([]);
    setStats({});
    setFileName('');
    setAnalysis(null);
    setAiMetrics([]);
    setAiCharts([]);
    setError(null);
    setQueryHistory([]);
    setSavedId(null);
    setComparisonMode(false);
    setIsStreaming(false);
    setActiveTab('insights');
  };

  const handleShare = () => {
    if (!savedId) return;
    const url = `${window.location.origin}${window.location.pathname}?report=${savedId}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Shareable link copied to clipboard!', 'info');
    }).catch(() => {
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
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
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
        language={language}
        onLanguageChange={setLanguage}
      />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-20 flex-1 w-full">
        {showColumnWizard && data && columns.length > 0 ? (
          <div className="py-12">
            <ColumnMappingWizard
              data={data}
              columns={columns}
              stats={stats}
              onConfirm={handleColumnMappingConfirm}
              onSkip={handleColumnMappingSkip}
            />
          </div>
        ) : comparisonMode ? (
          <ComparisonMode onBack={() => setComparisonMode(false)} />
        ) : !data && !hasAnalysis ? (
          <div className="space-y-8">
            <FileUpload
              onUpload={handleFileUpload}
              error={error}
              onCompareMode={() => setComparisonMode(true)}
            />
            {/* Data Connectors */}
            <div className="max-w-2xl mx-auto">
              <DataConnectors onDataLoaded={handleConnectorData} />
            </div>
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

            {/* Sampling indicator */}
            {data && data.length > 10000 && (
              <div className="mt-2">
                <SamplingIndicator totalRows={data.length} analyzedRows={Math.min(data.length, 10000)} />
              </div>
            )}

            <ErrorBoundary fallbackMessage="Dashboard encountered an error. Please try uploading your data again.">
              <Dashboard
                data={data}
                columns={columns}
                stats={stats}
                analysis={analysis}
                metrics={aiMetrics}
                charts={aiCharts}
                isAnalyzing={isAnalyzing}
                isStreaming={isStreaming}
                error={error}
                queryHistory={queryHistory}
                onQuery={handleQuery}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onDataUpdate={data ? handleDataUpdate : undefined}
                fileName={fileName}
                onJoinComplete={data ? handleJoinComplete : undefined}
                onRunAnalysis={handleRunAnalysis}
                chartColors={chartColors}
                onChartColorsChange={setChartColors}
                language={language}
              />
            </ErrorBoundary>
          </>
        )}
      </main>

      <Footer />

      {/* Keyboard shortcuts */}
      {(data || hasAnalysis) && (
        <KeyboardShortcuts onAction={handleAction} />
      )}

      {/* Command Palette — always available */}
      <CommandPalette onAction={handleAction} isVisible={data || hasAnalysis} />

      {/* Onboarding Tour */}
      <OnboardingTour />

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
