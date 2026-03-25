'use client';

import { useState } from 'react';
import { BrainCircuit, Languages, BookA, Dna, FileWarning, Trash2, Star, Pencil, Check, X } from 'lucide-react';
import type { KnowledgePoint, KnowledgeCategory } from '@/lib/types';

interface KnowledgeCardProps {
  point: KnowledgePoint;
  onDelete?: (id: string) => void;
  onToggleGlobal?: (id: string) => void;
  onEdit?: (id: string, fields: Partial<KnowledgePoint>) => void;
}

const CategoryConfig: Record<
  KnowledgeCategory,
  { label: string; icon: React.ReactNode; colorClass: string; bgClass: string }
> = {
  synonym: {
    label: 'Synonym',
    icon: <Languages className="w-4 h-4" />,
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10 border-blue-500/20',
  },
  collocation: {
    label: 'Collocation',
    icon: <BrainCircuit className="w-4 h-4" />,
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10 border-amber-500/20',
  },
  word_form: {
    label: 'Word Form',
    icon: <Dna className="w-4 h-4" />,
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10 border-emerald-500/20',
  },
  grammar_rule: {
    label: 'Grammar Rule',
    icon: <BookA className="w-4 h-4" />,
    colorClass: 'text-cyan-400',
    bgClass: 'bg-cyan-500/10 border-cyan-500/20',
  },
  user_mistake: {
    label: 'Correction',
    icon: <FileWarning className="w-4 h-4" />,
    colorClass: 'text-rose-400',
    bgClass: 'bg-rose-500/10 border-rose-500/20',
  },
};

const categories: { value: KnowledgeCategory; label: string }[] = [
  { value: 'synonym', label: 'Synonym' },
  { value: 'collocation', label: 'Collocation' },
  { value: 'word_form', label: 'Word Form' },
  { value: 'grammar_rule', label: 'Grammar Rule' },
  { value: 'user_mistake', label: 'Correction' },
];

export function KnowledgeCard({ point, onDelete, onToggleGlobal, onEdit }: KnowledgeCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editCategory, setEditCategory] = useState<KnowledgeCategory>(point.category);
  const [editOriginal, setEditOriginal] = useState(point.original_text);
  const [editAlternative, setEditAlternative] = useState(point.academic_alternative);
  const [editExplanation, setEditExplanation] = useState(point.explanation);
  const [editExample, setEditExample] = useState(point.example_sentence || '');

  const config = CategoryConfig[isEditing ? editCategory : point.category];

  const handleStartEdit = () => {
    setEditCategory(point.category);
    setEditOriginal(point.original_text);
    setEditAlternative(point.academic_alternative);
    setEditExplanation(point.explanation);
    setEditExample(point.example_sentence || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editOriginal.trim() || !editAlternative.trim() || !editExplanation.trim()) return;
    onEdit?.(point.id, {
      category: editCategory,
      original_text: editOriginal.trim(),
      academic_alternative: editAlternative.trim(),
      explanation: editExplanation.trim(),
      example_sentence: editExample.trim() || undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const inputClass = 'w-full bg-slate-800/70 border border-slate-600/50 rounded-md px-2.5 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50';

  if (isEditing) {
    return (
      <div className={`p-4 rounded-xl border backdrop-blur-md transition-all duration-300 ${config.bgClass}`}>
        <div className="flex items-center justify-between mb-3">
          <select
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value as KnowledgeCategory)}
            className="bg-slate-800/70 border border-slate-600/50 rounded-md px-2 py-1 text-xs font-semibold tracking-wider uppercase text-slate-200 focus:outline-none focus:border-blue-500/50"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
              title="Save"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Original</label>
            <input
              type="text"
              value={editOriginal}
              onChange={(e) => setEditOriginal(e.target.value)}
              className={inputClass}
              placeholder="Original text..."
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Academic Alternative</label>
            <input
              type="text"
              value={editAlternative}
              onChange={(e) => setEditAlternative(e.target.value)}
              className={inputClass}
              placeholder="Academic alternative..."
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Explanation</label>
            <textarea
              value={editExplanation}
              onChange={(e) => setEditExplanation(e.target.value)}
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder="Explanation..."
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Example (optional)</label>
            <input
              type="text"
              value={editExample}
              onChange={(e) => setEditExample(e.target.value)}
              className={inputClass}
              placeholder="Example sentence..."
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${config.bgClass}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase ${config.colorClass}`}>
          {config.icon}
          {config.label}
        </div>
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={handleStartEdit}
              className="text-slate-500 hover:text-blue-400 p-1 transition-colors"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {onToggleGlobal && (
            <button
              onClick={() => onToggleGlobal(point.id)}
              className={`p-1 transition-colors ${point.in_global_bank ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500 hover:text-amber-400'}`}
              title={point.in_global_bank ? 'Remove from Global Bank' : 'Add to Global Bank'}
            >
              <Star className="w-4 h-4" fill={point.in_global_bank ? 'currentColor' : 'none'} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(point.id)}
              className="text-slate-500 hover:text-red-400 p-1 transition-colors"
              title="Remove idea"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 line-through decoration-slate-500/50">
            {point.original_text}
          </span>
          <span className="text-slate-600">&rarr;</span>
          <span className="font-semibold text-slate-100 bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-700/50">
            {point.academic_alternative}
          </span>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          {point.explanation}
        </p>

        {point.example_sentence && (
          <div className="pt-2 mt-2 border-t border-white/5">
            <p className="text-xs italic text-slate-400">
              &quot;{point.example_sentence}&quot;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
