import React, { useState } from 'react';
import { Sparkles, TrendingUp, Target, DollarSign, Users, BarChart3, ShoppingCart, FileText } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'sales',
    name: 'Sales Analysis',
    icon: DollarSign,
    color: '#34d399',
    description: 'Revenue trends, top products, seasonal patterns, and growth opportunities.',
    prompt: 'Perform a comprehensive sales analysis: identify revenue trends over time, top-performing products or categories, seasonal patterns, average order value trends, and growth opportunities. Suggest which segments to focus on for maximum revenue impact.',
  },
  {
    id: 'marketing',
    name: 'Marketing Funnel',
    icon: Target,
    color: '#38bdf8',
    description: 'Conversion rates, channel performance, CAC, and campaign effectiveness.',
    prompt: 'Analyze this data from a marketing perspective: identify conversion rates at each funnel stage, channel performance comparison, customer acquisition cost trends, campaign effectiveness metrics, and ROI analysis. Recommend which channels to invest in and which to cut.',
  },
  {
    id: 'customer',
    name: 'Customer Segmentation',
    icon: Users,
    color: '#a78bfa',
    description: 'Customer segments, behavior patterns, retention, and lifetime value.',
    prompt: 'Perform customer segmentation analysis: identify distinct customer segments based on behavior patterns, analyze retention rates across segments, calculate customer lifetime value indicators, find churn risk factors, and recommend targeted strategies for each segment.',
  },
  {
    id: 'financial',
    name: 'Financial Report',
    icon: BarChart3,
    color: '#fbbf24',
    description: 'P&L overview, expense analysis, margin trends, and forecasting.',
    prompt: 'Create a financial analysis: calculate key financial ratios, analyze profit margins and trends, identify cost drivers, compare budget vs actual performance, assess financial health indicators, and provide a brief financial forecast based on observed trends.',
  },
  {
    id: 'inventory',
    name: 'Inventory Analysis',
    icon: ShoppingCart,
    color: '#fb7185',
    description: 'Stock levels, turnover rates, demand forecasting, and optimization.',
    prompt: 'Analyze inventory data: identify stock turnover rates, flag slow-moving items, detect stockout risks, analyze demand patterns and seasonality, calculate reorder points, and recommend inventory optimization strategies to reduce carrying costs.',
  },
  {
    id: 'executive',
    name: 'Executive Summary',
    icon: FileText,
    color: '#f97316',
    description: 'High-level KPIs, trends, risks, and strategic recommendations.',
    prompt: 'Create an executive-level summary: identify the 5 most important KPIs and their current values, highlight key trends (positive and negative), flag critical risks or anomalies, compare performance against benchmarks if possible, and provide 3 strategic recommendations for leadership.',
  },
];

export default function AnalysisTemplates({ onSelectTemplate, isDataLoaded }) {
  const [selectedId, setSelectedId] = useState(null);

  const handleSelect = (template) => {
    if (!isDataLoaded) return;
    setSelectedId(template.id);
    onSelectTemplate(template.prompt);
    // Reset selection after brief delay
    setTimeout(() => setSelectedId(null), 1500);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[var(--accent)]" />
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Analysis Templates</h3>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Choose a template to get a specialized analysis of your data.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATES.map((template) => {
          const Icon = template.icon;
          const isSelected = selectedId === template.id;
          return (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              disabled={!isDataLoaded || isSelected}
              className={`text-left p-4 rounded-xl border transition-all group ${
                isSelected
                  ? 'border-[var(--accent)] bg-[var(--accent-glow)]'
                  : 'border-[var(--border-subtle)] hover:border-[var(--border-active)] bg-white/[0.02] hover:bg-white/5'
              } ${!isDataLoaded ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${template.color}18` }}
                >
                  <Icon className="w-4 h-4" style={{ color: template.color }} />
                </div>
                <h4 className="text-sm font-medium text-[var(--text-primary)]">{template.name}</h4>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                {template.description}
              </p>
              {isSelected && (
                <p className="text-[10px] text-[var(--accent)] mt-2 font-medium">Analyzing...</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
