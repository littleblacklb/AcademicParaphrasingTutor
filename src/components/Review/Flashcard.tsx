import { useState } from 'react';
import type { KnowledgePoint } from '@/lib/types';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';

interface FlashcardProps {
  point: KnowledgePoint;
}

export function Flashcard({ point }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="w-full h-full min-h-[300px] perspective-1000">
      <motion.div
        className="w-full h-full relative preserve-3d cursor-pointer"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front */}
        <div className="absolute inset-0 backface-hidden glass-card p-8 flex flex-col items-center justify-center text-center">
          <span className="text-sm font-semibold tracking-widest text-blue-400 mb-6 uppercase">
            {point.category.replace('_', ' ')}
          </span>
          <h3 className="text-3xl font-medium text-slate-100 mb-4 line-through decoration-slate-600/50">
            {point.original_text}
          </h3>
          <p className="text-slate-400 text-sm mt-auto flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Click to reveal alternative
          </p>
        </div>

        {/* Back */}
        <div className="absolute inset-0 backface-hidden glass-card p-8 flex flex-col items-center justify-center text-center [transform:rotateY(180deg)] border-blue-500/30 bg-slate-800/90">
          <span className="text-sm font-semibold tracking-widest text-emerald-400 mb-6 uppercase">
            Academic Alternative
          </span>
          <h3 className="text-3xl font-bold text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            {point.academic_alternative}
          </h3>
          <p className="text-slate-300 leading-relaxed mb-6 font-medium">
            {point.explanation}
          </p>
          {point.example_sentence && (
            <p className="text-sm text-slate-400 italic bg-slate-900/50 p-4 rounded-lg w-full">
              &quot;{point.example_sentence}&quot;
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
