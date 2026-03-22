import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Sparkles, BarChart3, MessageSquare, Zap, ArrowLeftRight } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function FileUpload({ onUpload, error, onCompareMode }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [sizeError, setSizeError] = useState(null);
  const fileInputRef = useRef(null);

  const validateAndUpload = (file) => {
    setSizeError(null);
    if (file.size > MAX_FILE_SIZE) {
      setSizeError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`);
      return;
    }
    const validExtensions = ['.csv', '.tsv', '.xlsx', '.xls'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setSizeError('Unsupported file type. Please upload a CSV, TSV, or Excel file.');
      return;
    }
    onUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndUpload(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) validateAndUpload(file);
  };

  const handleDemoData = async () => {
    try {
      const response = await fetch('/sample-data.csv');
      const text = await response.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const file = new File([blob], 'sample-sales-data.csv', { type: 'text/csv' });
      onUpload(file);
    } catch {
      // Generate demo data inline
      const headers = 'Month,Revenue,Expenses,Profit,Region,Product,Units_Sold,Customer_Satisfaction';
      const regions = ['North', 'South', 'East', 'West'];
      const products = ['Widget A', 'Widget B', 'Service X', 'Service Y', 'Platform Z'];
      const months = ['Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024', 'Jun 2024',
                       'Jul 2024', 'Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024'];
      const rows = [];
      months.forEach(month => {
        regions.forEach(region => {
          products.forEach(product => {
            const revenue = Math.round(50000 + Math.random() * 150000);
            const expenses = Math.round(revenue * (0.55 + Math.random() * 0.25));
            const profit = revenue - expenses;
            const units = Math.round(100 + Math.random() * 900);
            const satisfaction = (3.5 + Math.random() * 1.5).toFixed(1);
            rows.push(`${month},${revenue},${expenses},${profit},${region},${product},${units},${satisfaction}`);
          });
        });
      });
      const csv = [headers, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const file = new File([blob], 'sample-sales-data.csv', { type: 'text/csv' });
      onUpload(file);
    }
  };

  const features = [
    { icon: Sparkles, label: 'AI-Powered Insights', desc: 'Instant analysis of patterns and anomalies' },
    { icon: BarChart3, label: 'Auto-Generated Charts', desc: 'Smart visualizations matched to your data' },
    { icon: MessageSquare, label: 'Natural Language Queries', desc: 'Ask questions about your data in plain English' },
    { icon: Zap, label: 'Actionable Recommendations', desc: 'Business-focused insights ranked by impact' },
  ];

  const displayError = sizeError || error;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] py-12">
      {/* Hero */}
      <div className="text-center mb-10 animate-fade-in">
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Your data.{' '}
          <span className="bg-gradient-to-r from-[var(--accent)] to-emerald-400 bg-clip-text text-transparent glow-text">
            AI insights.
          </span>
        </h2>
        <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
          Upload any CSV dataset and get instant AI-powered analytics, smart visualizations, and natural language querying.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        className={`upload-zone w-full max-w-2xl rounded-2xl p-12 text-center cursor-pointer transition-all ${
          isDragOver ? 'drag-over' : ''
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-[var(--accent-glow)] flex items-center justify-center mx-auto mb-5">
          {isDragOver ? (
            <FileSpreadsheet className="w-8 h-8 text-[var(--accent)]" />
          ) : (
            <Upload className="w-8 h-8 text-[var(--accent)]" />
          )}
        </div>

        <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
          {isDragOver ? 'Drop your file here' : 'Drag & drop your data file'}
        </p>
        <p className="text-sm text-[var(--text-muted)] mb-2">
          or click to browse — CSV, TSV, and Excel files supported (max 10MB)
        </p>
        <p className="text-[10px] text-[var(--text-muted)] mb-6">
          💡 Best results with headers in the first row · Columns like dates, amounts, categories, and IDs work great
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDemoData();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--border-active)] transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Try with sample data
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onCompareMode?.();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--border-active)] transition-all"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Compare Datasets
          </button>
        </div>
      </div>

      {/* Error */}
      {displayError && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm max-w-2xl w-full">
          {displayError}
        </div>
      )}

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16 w-full max-w-4xl stagger-in">
        {features.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="glass-card p-5">
            <Icon className="w-5 h-5 text-[var(--accent)] mb-3" />
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">{label}</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
