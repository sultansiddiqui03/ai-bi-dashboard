import React, { useState, useMemo } from 'react';
import { parseAIResponse, prepareChartData, CHART_COLORS, formatNumber } from '../utils/dataProcessor';
import KPICards from './KPICards';
import ChartPanel from './ChartPanel';
import AIInsights from './AIInsights';
import QueryInput from './QueryInput';
import DataPreview from './DataPreview';

export default function Dashboard({ data, columns, stats, analysis, isAnalyzing, error, queryHistory, onQuery }) {
  const [activeTab, setActiveTab] = useState('insights');

  // Parse AI analysis
  const parsed = useMemo(() => {
    if (!analysis) return { metrics: [], chartRecommendations: [], cleanText: '' };
    return parseAIResponse(analysis);
  }, [analysis]);

  // Prepare chart data
  const charts = useMemo(() => {
    if (!parsed.chartRecommendations.length || !data) return [];
    return parsed.chartRecommendations.map((config, i) => ({
      ...config,
      data: prepareChartData(data, config),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [parsed.chartRecommendations, data]);

  // Auto-generate basic charts if AI didn't provide any
  const autoCharts = useMemo(() => {
    if (charts.length > 0 || !data || !columns.length) return [];

    const numericCols = columns.filter(c => stats[c]?.type === 'numeric');
    const categoricalCols = columns.filter(c => stats[c]?.type === 'categorical');
    const generated = [];

    // If we have categorical + numeric, make a bar chart
    if (categoricalCols.length > 0 && numericCols.length > 0) {
      const cat = categoricalCols[0];
      const num = numericCols[0];
      generated.push({
        type: 'bar',
        x: cat,
        y: num,
        title: `${num} by ${cat}`,
        data: prepareChartData(data, { type: 'bar', x: cat, y: num }),
        color: CHART_COLORS[0],
      });
    }

    // If we have multiple numeric cols, scatter
    if (numericCols.length >= 2) {
      generated.push({
        type: 'scatter',
        x: numericCols[0],
        y: numericCols[1],
        title: `${numericCols[1]} vs ${numericCols[0]}`,
        data: prepareChartData(data, { type: 'scatter', x: numericCols[0], y: numericCols[1] }),
        color: CHART_COLORS[1],
      });
    }

    // Pie chart if categorical
    if (categoricalCols.length > 0) {
      const cat = categoricalCols[0];
      generated.push({
        type: 'pie',
        x: cat,
        y: null,
        title: `Distribution by ${cat}`,
        data: prepareChartData(data, { type: 'pie', x: cat }),
        color: CHART_COLORS[2],
      });
    }

    return generated;
  }, [charts, data, columns, stats]);

  const displayCharts = charts.length > 0 ? charts : autoCharts;

  const tabs = [
    { id: 'insights', label: 'AI Insights' },
    { id: 'charts', label: 'Visualizations' },
    { id: 'data', label: 'Data Preview' },
    { id: 'query', label: 'Ask AI' },
  ];

  return (
    <div className="space-y-6 pt-6 animate-fade-in">
      {/* Error banner */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <KPICards metrics={parsed.metrics} stats={stats} columns={columns} isLoading={isAnalyzing} />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--border-subtle)] pb-px overflow-x-auto">
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
          <AIInsights analysis={parsed.cleanText} isLoading={isAnalyzing} />
        )}

        {activeTab === 'charts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger-in">
            {displayCharts.map((chart, i) => (
              <ChartPanel key={i} chart={chart} index={i} />
            ))}
            {displayCharts.length === 0 && !isAnalyzing && (
              <div className="col-span-2 text-center py-20 text-[var(--text-muted)]">
                <p>No chart recommendations yet. The AI is still analyzing your data.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'data' && (
          <DataPreview data={data} columns={columns} stats={stats} />
        )}

        {activeTab === 'query' && (
          <QueryInput
            onQuery={onQuery}
            queryHistory={queryHistory}
            isDataLoaded={!!data}
          />
        )}
      </div>
    </div>
  );
}
