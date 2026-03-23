import React, { useState } from 'react';
import { MessageCircle, Plus, X, Pin, Clock, Trash2 } from 'lucide-react';

export default function Annotations({ chartTitle }) {
  const [annotations, setAnnotations] = useState(() => {
    try {
      const stored = localStorage.getItem(`annotations-${chartTitle}`);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState('');
  const [author, setAuthor] = useState(() => localStorage.getItem('annotation-author') || '');

  const save = (updated) => {
    setAnnotations(updated);
    localStorage.setItem(`annotations-${chartTitle}`, JSON.stringify(updated));
  };

  const addAnnotation = () => {
    if (!text.trim()) return;
    if (author) localStorage.setItem('annotation-author', author);
    const newNote = {
      id: Date.now(),
      text: text.trim(),
      author: author.trim() || 'Anonymous',
      timestamp: new Date().toISOString(),
      pinned: false,
    };
    save([newNote, ...annotations]);
    setText('');
    setShowForm(false);
  };

  const togglePin = (id) => {
    save(annotations.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a));
  };

  const removeAnnotation = (id) => {
    save(annotations.filter(a => a.id !== id));
  };

  const sortedAnnotations = [...annotations].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.id - a.id;
  });

  return (
    <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
          <MessageCircle className="w-3 h-3" />
          {annotations.length > 0 ? `${annotations.length} note${annotations.length > 1 ? 's' : ''}` : 'Notes'}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-[10px] text-[var(--accent)] hover:underline"
        >
          <Plus className="w-3 h-3" />
          Add Note
        </button>
      </div>

      {showForm && (
        <div className="mb-3 space-y-2 animate-fade-in">
          <div className="flex gap-2">
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Your name"
              className="w-24 px-2 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)]"
            />
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAnnotation()}
              placeholder="Add a note about this chart..."
              className="flex-1 px-2 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)]"
              autoFocus
            />
            <button onClick={addAnnotation} disabled={!text.trim()} className="px-2.5 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] text-[10px] font-medium disabled:opacity-30">
              Post
            </button>
          </div>
        </div>
      )}

      {sortedAnnotations.length > 0 && (
        <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
          {sortedAnnotations.map(note => (
            <div key={note.id} className={`rounded-lg p-2 text-[10px] ${note.pinned ? 'bg-[var(--accent-glow)] border border-[var(--accent)]/20' : 'bg-[var(--bg-secondary)]'}`}>
              <div className="flex items-start justify-between gap-1">
                <p className="text-[var(--text-secondary)] leading-relaxed flex-1">{note.text}</p>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => togglePin(note.id)} className={`p-0.5 rounded ${note.pinned ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
                    <Pin className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={() => removeAnnotation(note.id)} className="p-0.5 rounded text-[var(--text-muted)] hover:text-rose-400">
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[var(--text-muted)]">
                <span className="font-medium">{note.author}</span>
                <span className="flex items-center gap-0.5">
                  <Clock className="w-2 h-2" />
                  {new Date(note.timestamp).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
