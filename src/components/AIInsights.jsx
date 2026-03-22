import React from 'react';
import { Sparkles } from 'lucide-react';

export default function AIInsights({ analysis, isLoading, isStreaming }) {
  if (isLoading && !isStreaming) {
    return (
      <div className="glass-card p-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-glow)] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[var(--accent)] animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Analyzing your data...</p>
            <p className="text-xs text-[var(--text-muted)]">This usually takes 10-15 seconds</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="shimmer h-4 w-full rounded" />
          <div className="shimmer h-4 w-5/6 rounded" />
          <div className="shimmer h-4 w-4/6 rounded" />
          <div className="shimmer h-4 w-full rounded mt-6" />
          <div className="shimmer h-4 w-3/4 rounded" />
          <div className="shimmer h-4 w-5/6 rounded" />
        </div>
      </div>
    );
  }

  if (!analysis && !isStreaming) {
    return (
      <div className="glass-card p-8 text-center max-w-xl mx-auto">
        <Sparkles className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-sm text-[var(--text-muted)]">
          AI analysis will appear here once your data is processed. If you&apos;re running locally, make sure your API key is configured.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 sm:p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent-glow)] flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">AI Analysis</p>
          <div className="flex items-center gap-1.5">
            <div className="pulse-dot" />
            <p className="text-[11px] text-emerald-400">Powered by GPT-4o-mini</p>
          </div>
        </div>
      </div>

      <div className="prose-custom">
        <FormattedAnalysis text={analysis} isStreaming={isStreaming} />
      </div>
    </div>
  );
}

function FormattedAnalysis({ text, isStreaming }) {
  // Simple markdown-like rendering
  const lines = text.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        const isLastLine = i === lines.length - 1;
        const showCursor = isStreaming && isLastLine;

        // Headers
        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
          return (
            <h3 key={i} className={`text-sm font-semibold text-[var(--accent)] mt-5 mb-2 uppercase tracking-wide ${showCursor ? 'streaming-cursor' : ''}`}>
              {trimmed.replace(/\*\*/g, '')}
            </h3>
          );
        }

        // Headers with ##
        if (trimmed.startsWith('#')) {
          return (
            <h3 key={i} className={`text-sm font-semibold text-[var(--accent)] mt-5 mb-2 ${showCursor ? 'streaming-cursor' : ''}`}>
              {trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '')}
            </h3>
          );
        }

        // Numbered lists
        if (/^\d+[\.\)]/.test(trimmed)) {
          return (
            <div key={i} className="flex gap-3 py-1">
              <span className="text-[var(--accent)] font-mono text-xs mt-0.5 shrink-0 w-5">
                {trimmed.match(/^\d+/)[0]}.
              </span>
              <p className={`text-sm text-[var(--text-secondary)] leading-relaxed ${showCursor ? 'streaming-cursor' : ''}`}>
                <InlineFormat text={trimmed.replace(/^\d+[\.\)]\s*/, '')} />
              </p>
            </div>
          );
        }

        // Bullet points
        if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
          return (
            <div key={i} className="flex gap-3 py-0.5 pl-2">
              <span className="text-[var(--accent)] mt-1.5 shrink-0">•</span>
              <p className={`text-sm text-[var(--text-secondary)] leading-relaxed ${showCursor ? 'streaming-cursor' : ''}`}>
                <InlineFormat text={trimmed.replace(/^[-•]\s*/, '')} />
              </p>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={i} className={`text-sm text-[var(--text-secondary)] leading-relaxed ${showCursor ? 'streaming-cursor' : ''}`}>
            <InlineFormat text={trimmed} />
          </p>
        );
      })}
    </div>
  );
}

function InlineFormat({ text }) {
  // Handle **bold** and other inline formatting
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <span key={i} className="font-semibold text-[var(--text-primary)]">
              {part.replace(/\*\*/g, '')}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
