import React, { useState } from 'react';
import { Code, Copy, Check, X } from 'lucide-react';

export default function EmbedChart({ chartTitle, chartIndex }) {
  const [showEmbed, setShowEmbed] = useState(false);
  const [copied, setCopied] = useState(false);

  const embedCode = `<iframe
  src="${window.location.origin}${window.location.pathname}?embed=chart&index=${chartIndex}&title=${encodeURIComponent(chartTitle)}"
  width="600"
  height="400"
  frameborder="0"
  style="border: 1px solid #1e293b; border-radius: 12px;"
  title="${chartTitle}"
></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowEmbed(!showEmbed)}
        className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/5 transition-all"
        title="Embed this chart"
      >
        <Code className="w-3.5 h-3.5" />
      </button>

      {showEmbed && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl glass-card border border-[var(--border-subtle)] p-4 shadow-xl z-50 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-[var(--text-primary)]">Embed Code</p>
            <button onClick={() => setShowEmbed(false)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative">
            <pre className="p-3 rounded-lg bg-[var(--bg-secondary)] text-[10px] font-mono text-[var(--text-muted)] overflow-x-auto whitespace-pre-wrap break-all max-h-[120px]">
              {embedCode}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-all"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <p className="text-[9px] text-[var(--text-muted)] mt-2">
            Copy this code to embed the chart in any webpage.
          </p>
        </div>
      )}
    </div>
  );
}
