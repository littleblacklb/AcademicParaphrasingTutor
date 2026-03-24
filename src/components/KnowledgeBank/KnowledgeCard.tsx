import { BrainCircuit, Languages, BookA, Dna, FileWarning, Trash2 } from 'lucide-react';
import type { KnowledgePoint, KnowledgeCategory } from '@/lib/types';

interface KnowledgeCardProps {
  point: KnowledgePoint;
  onDelete?: (id: string) => void;
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

export function KnowledgeCard({ point, onDelete }: KnowledgeCardProps) {
  const config = CategoryConfig[point.category];

  return (
    <div className={`p-4 rounded-xl border backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${config.bgClass}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase ${config.colorClass}`}>
          {config.icon}
          {config.label}
        </div>
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

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 line-through decoration-slate-500/50">
            {point.original_text}
          </span>
          <span className="text-slate-600">→</span>
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
