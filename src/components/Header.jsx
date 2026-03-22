import React from 'react';
import { Brain, RotateCcw, Database, Columns } from 'lucide-react';

export default function Header({ fileName, onReset, rowCount, colCount }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/80 backdrop-blur-xl">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent)] to-emerald-400 flex items-center justify-center">
            <Brain className="w-5 h-5 text-[var(--bg-primary)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              Insight<span className="text-[var(--accent)]">AI</span>
            </h1>
          </div>
        </div>

        {/* Dataset info */}
        {fileName && (
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Database className="w-3.5 h-3.5" />
              <span className="font-mono text-xs">{fileName}</span>
            </div>
            {rowCount && (
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <span>{rowCount.toLocaleString()} rows</span>
                <span>•</span>
                <span>{colCount} columns</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          {onReset && (
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-white/5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New dataset
            </button>
          )}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            by Sultan Siddiqui
          </a>
        </div>
      </div>
    </header>
  );
}
