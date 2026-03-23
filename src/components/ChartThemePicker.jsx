import React, { useState, useEffect } from 'react';
import { Palette, Check, ChevronDown, ChevronUp } from 'lucide-react';

const PRESET_THEMES = [
  { id: 'default', name: 'Ocean', colors: ['#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#f97316', '#2dd4bf', '#e879f9', '#60a5fa', '#4ade80'] },
  { id: 'sunset', name: 'Sunset', colors: ['#f97316', '#ef4444', '#f59e0b', '#ec4899', '#f43f5e', '#d946ef', '#fb923c', '#fbbf24', '#e11d48', '#a855f7'] },
  { id: 'forest', name: 'Forest', colors: ['#22c55e', '#10b981', '#059669', '#14b8a6', '#0d9488', '#84cc16', '#a3e635', '#34d399', '#6ee7b7', '#4ade80'] },
  { id: 'mono', name: 'Monochrome', colors: ['#94a3b8', '#64748b', '#475569', '#cbd5e1', '#334155', '#e2e8f0', '#1e293b', '#f1f5f9', '#0f172a', '#9ca3af'] },
  { id: 'neon', name: 'Neon', colors: ['#06b6d4', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#14b8a6', '#a855f7', '#f97316'] },
  { id: 'pastel', name: 'Pastel', colors: ['#93c5fd', '#86efac', '#fde68a', '#fca5a5', '#c4b5fd', '#fdba74', '#a5f3fc', '#f0abfc', '#bfdbfe', '#bbf7d0'] },
  { id: 'corporate', name: 'Corporate', colors: ['#1e40af', '#15803d', '#b45309', '#be123c', '#6d28d9', '#0369a1', '#065f46', '#9a3412', '#881337', '#4c1d95'] },
  { id: 'candy', name: 'Candy', colors: ['#f472b6', '#a78bfa', '#67e8f9', '#fcd34d', '#fb923c', '#34d399', '#c084fc', '#f9a8d4', '#6ee7b7', '#fde047'] },
];

export default function ChartThemePicker({ onThemeChange }) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(() => {
    return localStorage.getItem('askdata-chart-theme') || 'default';
  });
  const [customColors, setCustomColors] = useState(() => {
    try { return JSON.parse(localStorage.getItem('askdata-custom-colors') || 'null'); } catch { return null; }
  });
  const [showCustom, setShowCustom] = useState(false);
  const [brandColor, setBrandColor] = useState('#38bdf8');

  useEffect(() => {
    localStorage.setItem('askdata-chart-theme', selectedTheme);
    const theme = selectedTheme === 'custom' && customColors
      ? customColors
      : PRESET_THEMES.find(t => t.id === selectedTheme)?.colors || PRESET_THEMES[0].colors;
    onThemeChange?.(theme);
  }, [selectedTheme, customColors]);

  const generateFromBrand = (baseColor) => {
    // Generate a harmonious palette from a single brand color
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const variations = [
      [r, g, b],
      [(r + 60) % 256, g, (b + 120) % 256],
      [r, (g + 80) % 256, (b + 40) % 256],
      [(r + 120) % 256, (g + 60) % 256, b],
      [r, (g + 120) % 256, b],
      [(r + 180) % 256, g, (b + 60) % 256],
      [(r + 40) % 256, (g + 160) % 256, (b + 80) % 256],
      [(r + 80) % 256, (g + 40) % 256, (b + 160) % 256],
      [Math.min(255, r + 60), Math.min(255, g + 60), Math.min(255, b + 60)],
      [Math.max(0, r - 40), Math.max(0, g - 40), Math.max(0, b - 40)],
    ];

    const colors = variations.map(([cr, cg, cb]) =>
      `#${cr.toString(16).padStart(2, '0')}${cg.toString(16).padStart(2, '0')}${cb.toString(16).padStart(2, '0')}`
    );

    setCustomColors(colors);
    localStorage.setItem('askdata-custom-colors', JSON.stringify(colors));
    setSelectedTheme('custom');
  };

  const currentTheme = PRESET_THEMES.find(t => t.id === selectedTheme);

  return (
    <div className="glass-card p-4">
      <button onClick={() => setShowPicker(!showPicker)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-xs font-medium text-[var(--text-primary)]">
            Chart Theme: {selectedTheme === 'custom' ? 'Custom Brand' : currentTheme?.name || 'Ocean'}
          </span>
          <div className="flex gap-0.5 ml-2">
            {(selectedTheme === 'custom' && customColors ? customColors : currentTheme?.colors || PRESET_THEMES[0].colors).slice(0, 5).map((c, i) => (
              <div key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />
            ))}
          </div>
        </div>
        {showPicker ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
      </button>

      {showPicker && (
        <div className="mt-4 space-y-3 animate-fade-in">
          {/* Preset themes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESET_THEMES.map(theme => (
              <button key={theme.id} onClick={() => setSelectedTheme(theme.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedTheme === theme.id
                    ? 'border-[var(--border-active)] bg-[var(--accent-glow)]'
                    : 'border-[var(--border-subtle)] hover:border-[var(--border-active)]'
                }`}>
                <div className="flex gap-0.5 mb-2">
                  {theme.colors.slice(0, 5).map((c, i) => (
                    <div key={i} className="w-4 h-4 rounded-full" style={{ background: c }} />
                  ))}
                </div>
                <p className="text-[10px] font-medium text-[var(--text-primary)]">{theme.name}</p>
                {selectedTheme === theme.id && <Check className="w-3 h-3 text-[var(--accent)] mt-1" />}
              </button>
            ))}
          </div>

          {/* Brand color generator */}
          <div className="p-3 rounded-xl bg-[var(--bg-secondary)]">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">Generate from Brand Color</p>
            <div className="flex items-center gap-3">
              <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                className="w-8 h-8 rounded-lg border border-[var(--border-subtle)] cursor-pointer bg-transparent" />
              <input type="text" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                className="w-24 px-2 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)]" />
              <button onClick={() => generateFromBrand(brandColor)}
                className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-medium hover:brightness-110">
                Generate Palette
              </button>
            </div>
            {customColors && (
              <div className="flex gap-1 mt-2">
                {customColors.map((c, i) => (
                  <div key={i} className="w-5 h-5 rounded-full border border-white/10" style={{ background: c }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Export for use in chart rendering
export function getThemeColors() {
  const themeId = localStorage.getItem('askdata-chart-theme') || 'default';
  if (themeId === 'custom') {
    try { return JSON.parse(localStorage.getItem('askdata-custom-colors') || 'null') || PRESET_THEMES[0].colors; } catch { return PRESET_THEMES[0].colors; }
  }
  return PRESET_THEMES.find(t => t.id === themeId)?.colors || PRESET_THEMES[0].colors;
}
