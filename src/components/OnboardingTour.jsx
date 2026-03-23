import React, { useState, useEffect } from 'react';
import { Upload, Brain, BarChart3, MessageSquare, Download, ChevronRight, ChevronLeft, X, Sparkles, Rocket } from 'lucide-react';

const TOUR_STEPS = [
  {
    icon: Rocket,
    title: 'Welcome to InsightAI!',
    description: 'Your AI-powered Business Intelligence dashboard. Upload any CSV or Excel file and get instant insights, charts, and predictions.',
    color: 'from-[var(--accent)] to-emerald-400',
  },
  {
    icon: Upload,
    title: 'Step 1: Upload Your Data',
    description: 'Drag & drop a CSV or Excel file, paste a URL, or connect to Google Sheets. We support files up to 10MB with thousands of rows.',
    color: 'from-sky-400 to-blue-500',
  },
  {
    icon: Brain,
    title: 'Step 2: AI Analysis',
    description: 'Our AI instantly analyzes your data — generating KPIs, detecting anomalies, and providing actionable business insights.',
    color: 'from-violet-400 to-purple-500',
  },
  {
    icon: BarChart3,
    title: 'Step 3: Smart Visualizations',
    description: 'AI recommends the best charts for your data. Toggle between bar, line, area, pie, and scatter charts. Use the Chart Builder for custom views.',
    color: 'from-emerald-400 to-teal-500',
  },
  {
    icon: MessageSquare,
    title: 'Step 4: Ask Questions',
    description: 'Chat with your data in plain English. Ask follow-up questions, request specific analyses, or explore trends. The AI remembers context.',
    color: 'from-amber-400 to-orange-500',
  },
  {
    icon: Download,
    title: 'Step 5: Export & Share',
    description: 'Generate PDF reports, export data as CSV, create embeddable widgets, or share analysis via protected links with your team.',
    color: 'from-rose-400 to-pink-500',
  },
  {
    icon: Sparkles,
    title: 'Pro Tips',
    description: 'Use Ctrl+K for the command palette · Press ? for keyboard shortcuts · Try the Forecast panel for predictions · Set up Anomaly Alerts for monitoring.',
    color: 'from-[var(--accent)] to-violet-400',
  },
];

export default function OnboardingTour() {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem('insightai-tour-seen');
    if (!seen) {
      // Small delay so the app renders first
      setTimeout(() => setIsVisible(true), 500);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('insightai-tour-seen', 'true');
  };

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  // Allow reopening via window event
  useEffect(() => {
    const handler = () => {
      setStep(0);
      setIsVisible(true);
    };
    window.addEventListener('insightai-show-tour', handler);
    return () => window.removeEventListener('insightai-show-tour', handler);
  }, []);

  if (!isVisible) return null;

  const currentStep = TOUR_STEPS[step];
  const Icon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md mx-4 glass-card border border-[var(--border-active)] shadow-2xl overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}>

        {/* Close button */}
        <button onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 z-10">
          <X className="w-4 h-4" />
        </button>

        {/* Icon header */}
        <div className={`h-32 bg-gradient-to-br ${currentStep.color} flex items-center justify-center`}>
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Icon className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">{currentStep.title}</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{currentStep.description}</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pb-4">
          {TOUR_STEPS.map((_, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step ? 'w-6 bg-[var(--accent)]' : i < step ? 'bg-[var(--accent)]/40' : 'bg-[var(--border-subtle)]'
              }`} />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 pb-6">
          <button onClick={handleClose} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:bg-white/5">
                <ChevronLeft className="w-3 h-3" /> Back
              </button>
            )}
            <button onClick={handleNext}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-medium hover:brightness-110">
              {step === TOUR_STEPS.length - 1 ? "Let's Go!" : 'Next'} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Step counter */}
        <div className="absolute top-4 left-4 px-2 py-1 rounded-full bg-black/20 text-white text-[10px] font-medium">
          {step + 1} / {TOUR_STEPS.length}
        </div>
      </div>
    </div>
  );
}
