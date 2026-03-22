import React, { useState, useMemo, useCallback } from 'react';
import { Download } from 'lucide-react';
import { parseAIResponse, prepareChartData, CHART_COLORS, formatNumber, computeStats } from '../utils/dataProcessor';
import KPICards from './KPICards';
import ChartPanel from './ChartPanel';
import AIInsights from './AIInsights';
import QueryInput from './QueryInput';
import DataPreview from './DataPreview';
import DatasetSummary from './DatasetSummary';
import DataFilters, { applyFilters } from './DataFilters';
import DataCleaningPanel from './DataCleaningPanel';
import ChartBuilder from './ChartBuilder';
import AnalysisTemplates from './AnalysisTemplates';
import DrillDownModal from './DrillDownModal';
import MobileNav from './MobileNav';
import ErrorBoundary from './ErrorBoundary';

export default function Dashboard({ data, columns, stats, analysis, metrics: propMetrics, charts: propCharts, isAnalyzing, isStreaming, error, queryHistory, onQuery, activeTab: externalTab, onTabChange, onDataUpdate }) {
  const [internalTab, setInternalTab] = useState('insights');
  const [filters, setFilters] = useState({});
  const [drillDown, setDrillDown] = useState(null);

  // Support external tab control (from keyboard shortcuts / mobile nav)
  const activeTab = externalTab || internalTab;
  const setActiveTab = onTabChange || setInternalTab;

  // Apply filters to data
  const filteredData = useMemo(() => {
    if (!data) return data;
    return applyFilters(data, filters);
  }, [data, filters]);

  // Recompute stats for filtered data
  const displayStats = useMemo(() => {
    if (!filteredData || !columns.length) return stats;
    const hasActiveFilters = Object.keys(filters).some(k => {
      const f = filters[k];
      if (f.type === 'categorical') return f.values && f.values.length > 0;
      if (f.type === 'numeric') return f.min !== undefined || f.max !== undefined;
      return false;
    });
    if (!hasActiveFilters) return stats;
    return computeStats(filteredData, columns);
  }, [filteredData, columns, stats, filters]);

  // Use metrics/charts from props (two-call architecture) with fallback to parsing
  const displayMetrics = useMemo(() => {
    if (propMetrics && propMetrics.length > 0) return propMetrics;
    if (!analysis) return [];
    const parsed = parseAIResponse(analysis);
    return parsed.metrics;
  }, [propMetrics, analysis]);

  const chartRecommendations = useMemo(() => {
    if (propCharts && propCharts.length > 0) return propCharts;
    if (!analysis) return [];
    const parsed = parseAIResponse(analysis);
    return parsed.chartRecommendations;
  }, [propCharts, analysis]);

  // Clean text for display
  const cleanAnalysisText = useMemo(() => {
    if (!analysis) return '';
    if (propMetrics && propMetrics.length > 0) return analysis;
    const parsed = parseAIResponse(analysis);
    return parsed.cleanText;
  }, [analysis, propMetrics]);

  // Prepare chart data using filtered data
  const charts = useMemo(() => {
    if (!chartRecommendations.length || !filteredData) return [];
    return chartRecommendations.map((config, i) => ({
      ...config,
      data: prepareChartData(filteredData, config),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [chartRecommendations, filteredData]);

  // Auto-generate basic charts if AI didn't provide any
  const autoCharts = useMemo(() => {
    if (charts.length > 0 || !filteredData || !columns.length) return [];
    const numericCols = columns.filter(c => displayStats[c]?.type === 'numeric');
    const categoricalCols = columns.filter(c => displayStats[c]?.type === 'categorical');
    const generated = [];

    if (categoricalCols.length > 0 && numericCols.length > 0) {
      const cat = categoricalCols[0];
      const num = numericCols[0];
      generated.push({
        type: 'bar', x: cat, y: num,
        title: `${num} by ${cat}`,
        data: prepareChartData(filteredData, { type: 'bar', x: cat, y: num }),
        color: CHART_COLORS[0],
      });
    }

    if (numericCols.length >= 2) {
      generated.push({
        type: 'scatter', x: numericCols[0], y: numericCols[1],
        title: `${numericCols[1]} vs ${numericCols[0]}`,
        data: prepareChartData(filteredData, { type: 'scatter', x: numericCols[0], y: numericCols[1] }),
        color: CHART_COLORS[1],
      });
    }

    if (categoricalCols.length > 0) {
      const cat = categoricalCols[0];
      generated.push({
        type: 'pie', x: cat, y: null,
        title: `Distribution by ${cat}`,
        data: prepareChartData(filteredData, { type: 'pie', x: cat }),
        color: CHART_COLORS[2],
      });
    }

    return generated;
  }, [charts, filteredData, columns, displayStats]);

  const displayCharts = charts.length > 0 ? charts : autoCharts;

  const tabs = [
    { id: 'insights', label: 'AI Insights' },
    { id: 'charts', label: 'Visualizations' },
    { id: 'data', label: 'Data Preview' },
    { id: 'query', label: 'Ask AI' },
    { id: 'builder', label: 'Chart Builder' },
    { id: 'templates', label: 'Templates' },
  ];

  const handleDrillDown = (col, value) => {
    if (!filteredData) return;
    setDrillDown({ filterCol: col, filterValue: value });
  };

  // Export filtered data as CSV
  const exportFilteredCSV = useCallback(() => {
    if (!filteredData || !columns.length) return;
    const header = columns.join(',');
    const rows = filteredData.map(row =>
      columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `filtered-data-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredData, columns]);

  return (
    <div className="space-y-6 pt-6 pb-20 sm:pb-6 animate-fade-in">
      {/* Error banner */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Dataset Summary Bar */}
      <DatasetSummary data={data} columns={columns} stats={displayStats} />

      {/* KPI Cards */}
      <ErrorBoundary fallbackMessage="Failed to render KPI cards.">
        <KPICards metrics={displayMetrics} stats={displayStats} columns={columns} isLoading={isAnalyzing && !isStreaming} />
      </ErrorBoundary>

      {/* Data Filters + Cleaning */}
      {data && columns.length > 0 && (
        <div className="space-y-3">
          <DataFilters
            data={data}
            columns={columns}
            stats={stats}
            filters={filters}
            onFiltersChange={setFilters}
          />
          {onDataUpdate && (
            <DataCleaningPanel
              data={data}
              columns={columns}
              stats={stats}
              onDataUpdate={onDataUpdate}
            />
          )}
        </div>
      )}

      {/* Filter info + export */}
      {filteredData && data && filteredData.length !== data.length && (
        <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
          Showing {filteredData.length.toLocaleString()} of {data.length.toLocaleString()} rows (filtered)
          <button
            onClick={exportFilteredCSV}
            className="ml-2 flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-all"
            title="Export filtered data as CSV"
          >
            <Download className="w-3 h-3" />
            Export CSV
          </button>
        </div>
      )}

      {/* Desktop Tabs - hidden on mobile (mobile nav shown at bottom) */}
      <div className="hidden sm:flex items-center gap-1 border-b border-[var(--border-subtle)] pb-px overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--accent-glow)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {tab.label}
            {tab.id === 'query' && queryHistory.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] rounded-full bg-[var(--accent)]/20 text-[var(--accent)]">
                {queryHistory.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'insights' && (
          <AIInsights analysis={cleanAnalysisText} isLoading={isAnalyzing} isStreaming={isStreaming} />
        )}

        {activeTab === 'charts' && (
          <ErrorBoundary fallbackMessage="Failed to render charts.">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger-in">
              {displayCharts.map((chart, i) => (
                <ChartPanel
                  key={i}
                  chart={chart}
                  index={i}
                  data={filteredData}
                  columns={columns}
                  stats={displayStats}
                  onDrillDown={filteredData ? handleDrillDown : undefined}
                />
              ))}
              {displayCharts.length === 0 && !isAnalyzing && (
                <div className="col-span-2 text-center py-20 text-[var(--text-muted)]">
                  <p>No chart recommendations yet. The AI is still analyzing your data.</p>
                </div>
              )}
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'data' && (
          <ErrorBoundary fallbackMessage="Failed to render data preview.">
            <DataPreview data={filteredData} columns={columns} stats={displayStats} />
          </ErrorBoundary>
        )}

        {activeTab === 'query' && (
          <QueryInput
            onQuery={onQuery}
            queryHistory={queryHistory}
            isDataLoaded={!!data}
          />
        )}

        {activeTab === 'builder' && (
          <ErrorBoundary fallbackMessage="Failed to render chart builder.">
            <ChartBuilder data={filteredData} columns={columns} stats={displayStats} />
          </ErrorBoundary>
        )}

        {activeTab === 'templates' && (
          <AnalysisTemplates onSelectTemplate={onQuery} isDataLoaded={!!data} />
        )}
      </div>

      {/* Mobile bottom nav */}
      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Drill-down modal */}
      {drillDown && filteredData && (
        <DrillDownModal
          data={filteredData}
          columns={columns}
          stats={displayStats}
          filterCol={drillDown.filterCol}
          filterValue={drillDown.filterValue}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  );
}
