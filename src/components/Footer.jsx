import React from 'react';
import { Github, Zap } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <span>Built by</span>
            <a
              href="https://github.com/sultansiddiqui03"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
            >
              Sultan Siddiqui
            </a>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/sultansiddiqui03/ai-bi-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Source</span>
            </a>

            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Powered by OpenAI GPT-4o-mini</span>
            </div>
          </div>

          <p className="text-xs text-[var(--text-muted)] opacity-60">
            {currentYear} InsightAI
          </p>
        </div>
      </div>
    </footer>
  );
}
