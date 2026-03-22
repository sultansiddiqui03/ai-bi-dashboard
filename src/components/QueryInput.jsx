import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Bot, User, Loader2 } from 'lucide-react';

const SUGGESTED_QUERIES = [
  "What are the top 5 trends in this data?",
  "Which category has the highest revenue?",
  "Are there any outliers or anomalies?",
  "What's the correlation between the numeric columns?",
  "Summarize the key takeaways for an executive presentation",
  "What would you recommend we focus on next quarter?",
];

export default function QueryInput({ onQuery, queryHistory, isDataLoaded }) {
  const [query, setQuery] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [queryHistory]);

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (!query.trim() || !isDataLoaded) return;
    onQuery(query.trim());
    setQuery('');
  };

  const handleSuggestion = (q) => {
    onQuery(q);
  };

  return (
    <div className="max-w-3xl">
      {/* Chat history */}
      {queryHistory.length > 0 && (
        <div className="space-y-4 mb-6">
          {queryHistory.map((entry) => (
            <div key={entry.id} className="space-y-3">
              {/* User message */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </div>
                <div className="glass-card px-4 py-3 max-w-[85%]">
                  <p className="text-sm text-[var(--text-primary)]">{entry.query}</p>
                </div>
              </div>

              {/* AI response */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[var(--accent-glow)] flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-[var(--accent)]" />
                </div>
                <div className="glass-card gradient-border px-4 py-3 max-w-[85%]">
                  {entry.loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 text-[var(--accent)] animate-spin" />
                      <span className="text-sm text-[var(--text-muted)]">Analyzing...</span>
                    </div>
                  ) : (
                    <div className={`text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap ${entry.streaming ? 'streaming-cursor' : ''}`}>
                      <FormattedResponse text={entry.answer} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Suggestions - show when no history */}
      {queryHistory.length === 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-[var(--accent)]" />
            <p className="text-sm font-medium text-[var(--text-primary)]">Ask anything about your data</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUGGESTED_QUERIES.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSuggestion(q)}
                className="text-left px-4 py-3 rounded-xl bg-white/[0.02] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--border-active)] hover:bg-[var(--accent-glow)] transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Ask a question about your data..."
            className="flex-1 px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)] focus:ring-1 focus:ring-[var(--accent)]/20 transition-all"
          />
          <button
            onClick={handleSubmit}
            disabled={!query.trim()}
            className="px-4 py-3 rounded-xl bg-[var(--accent)] text-[var(--bg-primary)] font-medium text-sm hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5 text-center">
          Press Enter to send
        </p>
      </div>
    </div>
  );
}

function FormattedResponse({ text }) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <span key={i} className="font-semibold text-[var(--text-primary)]">{part.replace(/\*\*/g, '')}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
