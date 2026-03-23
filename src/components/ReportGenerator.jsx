import React, { useState } from 'react';
import { FileText, Download, Loader2, CheckCircle } from 'lucide-react';

export default function ReportGenerator({ data, columns, stats, analysis, metrics, charts, fileName }) {
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const generateReport = async () => {
    setGenerating(true);
    setDone(false);

    try {
      const { jsPDF } = await import('jspdf');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      // Helper: add text with word wrap and page overflow
      const addWrappedText = (text, x, startY, maxWidth, lineHeight = 5, fontSize = 10, color = [100, 116, 139]) => {
        pdf.setFontSize(fontSize);
        pdf.setTextColor(...color);
        const lines = pdf.splitTextToSize(text, maxWidth);
        lines.forEach(line => {
          if (startY > 270) {
            pdf.addPage();
            startY = margin;
          }
          pdf.text(line, x, startY);
          startY += lineHeight;
        });
        return startY;
      };

      // --- COVER / HEADER ---
      pdf.setFillColor(5, 9, 18);
      pdf.rect(0, 0, pageWidth, 50, 'F');

      pdf.setTextColor(56, 189, 248);
      pdf.setFontSize(24);
      pdf.setFont(undefined, 'bold');
      pdf.text('AskData Report', margin, 25);

      pdf.setFontSize(10);
      pdf.setTextColor(148, 163, 184);
      pdf.setFont(undefined, 'normal');
      pdf.text(fileName || 'Data Analysis Report', margin, 35);
      pdf.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), margin, 42);

      y = 60;

      // --- DATASET OVERVIEW ---
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Dataset Overview', margin, y);
      y += 8;

      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);

      const overviewItems = [
        `Rows: ${data?.length?.toLocaleString() || 'N/A'}`,
        `Columns: ${columns.length}`,
        `Numeric Columns: ${columns.filter(c => stats[c]?.type === 'numeric').length}`,
        `Categorical Columns: ${columns.filter(c => stats[c]?.type === 'categorical').length}`,
      ];
      overviewItems.forEach(item => {
        pdf.text(`• ${item}`, margin + 2, y);
        y += 6;
      });

      y += 5;

      // --- KPI METRICS ---
      if (metrics && metrics.length > 0) {
        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(15, 23, 42);
        pdf.text('Key Metrics', margin, y);
        y += 8;

        metrics.forEach(m => {
          if (y > 265) { pdf.addPage(); y = margin; }
          pdf.setFont(undefined, 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(56, 189, 248);
          pdf.text(`${m.name}: ${m.value}`, margin + 2, y);
          y += 5;
          if (m.change) {
            pdf.setFont(undefined, 'normal');
            pdf.setFontSize(9);
            pdf.setTextColor(100, 116, 139);
            pdf.text(`Change: ${m.change}`, margin + 4, y);
            y += 5;
          }
          if (m.interpretation) {
            pdf.setFont(undefined, 'normal');
            y = addWrappedText(m.interpretation, margin + 4, y, contentWidth - 4, 4.5, 9, [100, 116, 139]);
          }
          y += 2;
        });
        y += 5;
      }

      // --- COLUMN STATISTICS ---
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(15, 23, 42);
      if (y > 250) { pdf.addPage(); y = margin; }
      pdf.text('Column Statistics', margin, y);
      y += 8;

      columns.forEach(col => {
        if (y > 255) { pdf.addPage(); y = margin; }
        const s = stats[col];
        if (!s) return;

        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(15, 23, 42);
        pdf.text(col, margin + 2, y);
        y += 5;

        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);

        if (s.type === 'numeric') {
          pdf.text(`Type: Numeric | Count: ${s.count} | Missing: ${s.missing} | Mean: ${s.mean} | Median: ${s.median} | Min: ${s.min} | Max: ${s.max}`, margin + 4, y);
        } else {
          pdf.text(`Type: Categorical | Count: ${s.count} | Missing: ${s.missing} | Unique: ${s.unique}`, margin + 4, y);
        }
        y += 6;
      });

      y += 5;

      // --- AI ANALYSIS ---
      if (analysis) {
        if (y > 240) { pdf.addPage(); y = margin; }
        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(15, 23, 42);
        pdf.text('AI Analysis', margin, y);
        y += 8;

        // Clean markdown from analysis text
        const cleanText = analysis
          .replace(/\*\*/g, '')
          .replace(/#{1,6}\s/g, '')
          .replace(/---/g, '')
          .replace(/<[^>]+>/g, '');

        pdf.setFont(undefined, 'normal');
        y = addWrappedText(cleanText, margin + 2, y, contentWidth - 2, 5, 10, [71, 85, 105]);
      }

      // --- FOOTER on all pages ---
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`Generated by AskData — Page ${i} of ${pageCount}`, margin, 290);
      }

      pdf.save(`AskData-Report-${Date.now()}.pdf`);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      console.error('Report generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={generateReport}
      disabled={generating}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-emerald-500 text-[var(--bg-primary)] text-sm font-medium hover:brightness-110 disabled:opacity-50 transition-all"
    >
      {generating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : done ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <FileText className="w-4 h-4" />
      )}
      {generating ? 'Generating...' : done ? 'Downloaded!' : 'Generate Report'}
    </button>
  );
}
