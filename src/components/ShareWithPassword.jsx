import React, { useState } from 'react';
import { Share2, Lock, Copy, Check, Calendar, Eye, EyeOff, Link2 } from 'lucide-react';

export default function ShareWithPassword({ savedId, onShare }) {
  const [showPanel, setShowPanel] = useState(false);
  const [password, setPassword] = useState('');
  const [expiry, setExpiry] = useState('never');
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!savedId) return null;

  const generateShareUrl = () => {
    const params = new URLSearchParams();
    params.set('report', savedId);
    if (password) {
      // Store password hash in URL (base64 encoded for simple protection)
      params.set('key', btoa(password));
    }
    if (expiry !== 'never') {
      const expiryDate = new Date();
      switch (expiry) {
        case '1h': expiryDate.setHours(expiryDate.getHours() + 1); break;
        case '24h': expiryDate.setHours(expiryDate.getHours() + 24); break;
        case '7d': expiryDate.setDate(expiryDate.getDate() + 7); break;
        case '30d': expiryDate.setDate(expiryDate.getDate() + 30); break;
      }
      params.set('expires', expiryDate.toISOString());
    }
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  };

  const handleCopy = () => {
    const url = generateShareUrl();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleQuickShare = () => {
    onShare?.();
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <button onClick={handleQuickShare}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-white/5 transition-colors"
          title="Quick share (no protection)">
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>
        <button onClick={() => setShowPanel(!showPanel)}
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] rounded-lg hover:bg-white/5 transition-colors"
          title="Advanced sharing options">
          <Lock className="w-3 h-3" />
        </button>
      </div>

      {showPanel && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 rounded-xl glass-card border border-[var(--border-subtle)] p-4 shadow-xl z-50 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">Protected Sharing</h3>
            </div>

            {/* Password */}
            <div className="mb-3">
              <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Password (optional)</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Leave empty for no password"
                  className="w-full px-3 py-2 pr-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)]"
                />
                <button onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Expiry */}
            <div className="mb-4">
              <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Link Expires</label>
              <select value={expiry} onChange={e => setExpiry(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]">
                <option value="never">Never</option>
                <option value="1h">In 1 hour</option>
                <option value="24h">In 24 hours</option>
                <option value="7d">In 7 days</option>
                <option value="30d">In 30 days</option>
              </select>
            </div>

            {/* Link preview */}
            <div className="mb-3 p-2 rounded-lg bg-[var(--bg-secondary)] text-[9px] font-mono text-[var(--text-muted)] break-all max-h-[60px] overflow-hidden">
              {generateShareUrl()}
            </div>

            {/* Copy button */}
            <button onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-medium hover:brightness-110 transition-all">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Protected Link'}
            </button>

            <div className="flex items-center gap-1 mt-2 text-[9px] text-[var(--text-muted)]">
              <Link2 className="w-3 h-3" />
              {password ? 'Password-protected link' : 'Public link'}{expiry !== 'never' ? ` · Expires in ${expiry}` : ''}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
