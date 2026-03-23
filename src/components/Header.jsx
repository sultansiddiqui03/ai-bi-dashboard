import React, { useState } from 'react';
import { Brain, RotateCcw, Database, Sun, Moon, Share2, Menu, X } from 'lucide-react';
import ExportButton from './ExportButton';
import LanguageSelector from './LanguageSelector';
import ShareWithPassword from './ShareWithPassword';

export default function Header({ fileName, onReset, rowCount, colCount, hasAnalysis, savedId, onShare, darkMode, onToggleTheme, language, onLanguageChange }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/80 backdrop-blur-xl">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[var(--accent)] to-emerald-400 flex items-center justify-center">
            <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--bg-primary)]" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              Insight<span className="text-[var(--accent)]">AI</span>
            </h1>
          </div>
        </div>

        {/* Dataset info - desktop */}
        {fileName && (
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Database className="w-3.5 h-3.5" />
              <span className="font-mono text-xs max-w-[200px] truncate">{fileName}</span>
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

        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-2">
          <LanguageSelector language={language} onLanguageChange={onLanguageChange} />

          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {hasAnalysis && <ShareWithPassword />}

          {hasAnalysis && savedId && (
            <button
              onClick={onShare}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-white/5 transition-colors"
              title="Copy shareable link"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}

          {hasAnalysis && <ExportButton />}

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
            href="https://github.com/sultansiddiqui03/ai-bi-dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            by Sultan Siddiqui
          </a>
        </div>

        {/* Mobile Actions */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {(onReset || hasAnalysis) && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 backdrop-blur-xl animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {fileName && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-2">
                <Database className="w-3.5 h-3.5" />
                <span className="font-mono truncate">{fileName}</span>
                {rowCount && <span>• {rowCount.toLocaleString()} rows</span>}
              </div>
            )}
            <div className="px-3 py-1">
              <LanguageSelector language={language} onLanguageChange={onLanguageChange} />
            </div>
            {hasAnalysis && <div className="px-3 py-1"><ShareWithPassword /></div>}
            {hasAnalysis && savedId && (
              <button
                onClick={() => { onShare(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--text-secondary)] rounded-lg hover:bg-white/5"
              >
                <Share2 className="w-4 h-4" />
                Share report
              </button>
            )}
            {hasAnalysis && (
              <div className="px-3 py-1">
                <ExportButton />
              </div>
            )}
            {onReset && (
              <button
                onClick={() => { onReset(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--text-secondary)] rounded-lg hover:bg-white/5"
              >
                <RotateCcw className="w-4 h-4" />
                New dataset
              </button>
            )}
            <a
              href="https://github.com/sultansiddiqui03/ai-bi-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2.5 text-xs text-[var(--text-muted)]"
            >
              by Sultan Siddiqui
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
