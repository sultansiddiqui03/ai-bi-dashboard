import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onDismiss, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    error: <XCircle className="w-4 h-4 text-rose-400" />,
    info: <Info className="w-4 h-4 text-sky-400" />,
  };

  const borderColors = {
    success: 'border-emerald-500/30',
    error: 'border-rose-500/30',
    info: 'border-sky-500/30',
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[100] animate-slide-up`}>
      <div className={`glass-card flex items-center gap-3 px-4 py-3 border ${borderColors[type]} shadow-2xl min-w-[250px]`}>
        {icons[type]}
        <span className="text-sm text-[var(--text-primary)] flex-1">{message}</span>
        <button
          onClick={onDismiss}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
