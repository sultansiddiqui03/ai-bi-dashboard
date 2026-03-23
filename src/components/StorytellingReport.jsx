import React, { useState } from 'react';
import { BookOpen, Loader2, Download, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

export default function StorytellingReport({ data, columns, stats, analysis, metrics, fileName, onQuery }) {
  const [story, setStory] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateStory = async () => {
    setGenerating(true);
    setShowStory(true);
    setStory('');

    try {
      const numericCols = columns.filter(c => stats[c]?.type === 'numeric');
      const categoricalCols = columns.filter(c => stats[c]?.type === 'categorical');

      const context = {
        fileName,
        rowCount: data?.length || 0,
        columnCount: columns.length,
        numericSummary: numericCols.slice(0, 5).map(c => ({
          name: c, ...stats[c]
        })),
        categoricalSummary: categoricalCols.slice(0, 3).map(c => ({
          name: c, unique: stats[c]?.unique, top: stats[c]?.topValues?.slice(0, 3)
        })),
        kpis: metrics?.slice(0, 6),
        existingAnalysis: analysis?.substring(0, 500),
      };

      const prompt = `Based on this dataset analysis, write a compelling business narrative report.

Dataset: ${fileName || 'Dataset'} (${context.rowCount} rows, ${context.columnCount} columns)

Key Metrics:
${context.kpis?.map(m => `- ${m.name}: ${m.value} (${m.change || 'no change'}) — ${m.interpretation || ''}`).join('\n') || 'None available'}

Numeric Columns:
${context.numericSummary.map(c => `- ${c.name}: avg=${c.mean}, min=${c.min}, max=${c.max}`).join('\n')}

Categorical Columns:
${context.categoricalSummary.map(c => `- ${c.name}: ${c.unique} unique values, top: ${c.top?.map(t => t.value).join(', ') || 'N/A'}`).join('\n')}

AI Analysis Excerpt:
${context.existingAnalysis || 'Not available'}

Write a professional narrative report with these sections:
1. **Executive Summary** — 2-3 paragraphs telling the story of this data
2. **Key Findings** — The 3-5 most important discoveries, written as a narrative (not bullet points)
3. **Trends & Patterns** — What patterns emerge and what they mean for the business
4. **Risk Factors** — Any concerns or anomalies that need attention
5. **Recommendations** — Specific, actionable next steps
6. **Conclusion** — A forward-looking closing paragraph

Write in a professional but engaging tone. Use specific numbers from the data. Make it feel like a real consulting report, not a data dump.`;

      // Use the query handler to get AI response
      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataPreview: JSON.stringify(data?.slice(0, 10)),
          columns,
          stats,
          query: prompt,
          mode: 'query',
        }),
      });

      if (!response.ok) throw new Error('Failed to generate story');

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
            if (parsed.content) {
              fullText += parsed.content;
              setStory(fullText);
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      setStory('Failed to generate narrative report. Please ensure your API key is configured and try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(story).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadAsText = () => {
    const blob = new Blob([story], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `InsightAI-Narrative-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Data Story</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400">AI Narrative</span>
        </div>
        <button onClick={story ? () => setShowStory(!showStory) : generateStory} disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-violet-500 to-[var(--accent)] text-white hover:brightness-110 disabled:opacity-50 transition-all">
          {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookOpen className="w-3 h-3" />}
          {generating ? 'Writing...' : story ? (showStory ? 'Hide Story' : 'Show Story') : 'Generate Story'}
        </button>
      </div>

      {showStory && story && (
        <div className="mt-4 animate-fade-in">
          {/* Actions */}
          <div className="flex items-center gap-2 mb-3">
            <button onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-all">
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={downloadAsText}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-all">
              <Download className="w-3 h-3" /> Download
            </button>
            <button onClick={generateStory} disabled={generating}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-all disabled:opacity-30">
              Regenerate
            </button>
          </div>

          {/* Story content */}
          <div className={`prose-sm max-w-none ${generating ? 'streaming-cursor' : ''}`}>
            <div className="rounded-xl bg-[var(--bg-secondary)] p-6 border border-[var(--border-subtle)] max-h-[600px] overflow-y-auto">
              <FormattedStory text={story} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormattedStory({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        // Headers
        if (trimmed.startsWith('# ')) {
          return <h2 key={i} className="text-lg font-bold text-[var(--text-primary)] mt-4 mb-2">{trimmed.slice(2)}</h2>;
        }
        if (trimmed.startsWith('## ')) {
          return <h3 key={i} className="text-base font-semibold text-[var(--text-primary)] mt-3 mb-1">{trimmed.slice(3)}</h3>;
        }
        if (trimmed.startsWith('### ')) {
          return <h4 key={i} className="text-sm font-semibold text-[var(--accent)] mt-2 mb-1">{trimmed.slice(4)}</h4>;
        }

        // Bold sections
        const parts = trimmed.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={i} className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <span key={j} className="font-semibold text-[var(--text-primary)]">{part.replace(/\*\*/g, '')}</span>;
              }
              return <span key={j}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}
