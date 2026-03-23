import React, { useState, useEffect } from 'react';
import { Languages, Check, ChevronDown } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'es', label: 'Español', flag: 'ES' },
  { code: 'fr', label: 'Français', flag: 'FR' },
  { code: 'de', label: 'Deutsch', flag: 'DE' },
  { code: 'pt', label: 'Português', flag: 'PT' },
  { code: 'ja', label: '日本語', flag: 'JA' },
  { code: 'zh', label: '中文', flag: 'ZH' },
  { code: 'ar', label: 'العربية', flag: 'AR' },
  { code: 'hi', label: 'हिन्दी', flag: 'HI' },
  { code: 'ko', label: '한국어', flag: 'KO' },
  { code: 'ru', label: 'Русский', flag: 'RU' },
  { code: 'it', label: 'Italiano', flag: 'IT' },
];

export default function LanguageSelector({ language, onLanguageChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const current = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
        title="AI output language"
      >
        <Languages className="w-3.5 h-3.5" />
        <span className="font-medium">{current.flag}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 rounded-xl glass-card border border-[var(--border-subtle)] p-1 shadow-xl z-50 animate-fade-in max-h-[300px] overflow-y-auto">
            <p className="px-3 py-1.5 text-[10px] text-[var(--text-muted)] uppercase tracking-wider">AI Output Language</p>
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => { onLanguageChange(lang.code); setIsOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                  language === lang.code
                    ? 'bg-[var(--accent-glow)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-white/5'
                }`}
              >
                <span className="font-mono text-[10px] w-5">{lang.flag}</span>
                <span>{lang.label}</span>
                {language === lang.code && <Check className="w-3 h-3 ml-auto" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Helper to build language instruction for AI prompts
export function getLanguageInstruction(langCode) {
  if (!langCode || langCode === 'en') return '';
  const lang = LANGUAGES.find(l => l.code === langCode);
  if (!lang) return '';
  return `\n\nIMPORTANT: Respond entirely in ${lang.label}. All text, headers, and explanations must be in ${lang.label}.`;
}
