import { KnowledgeCard } from './KnowledgeCard';
import { Download, Brain } from 'lucide-react';
import type { KnowledgePoint } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  knowledgePoints: KnowledgePoint[];
  onDeletePoint?: (id: string) => void;
  conversationId?: string | null;
}

export function Sidebar({ knowledgePoints, onDeletePoint, conversationId }: SidebarProps) {
  const exportUrl = conversationId 
    ? `/api/knowledge/export?format=csv&conversation_id=${conversationId}`
    : `/api/knowledge/export?format=csv`;

  return (
    <div className="h-full flex flex-col bg-slate-900/50 backdrop-blur-xl border-l border-border/50">
      <div className="h-14 px-5 flex items-center justify-between border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2 text-primary font-medium truncate">
          <Brain className="w-5 h-5 text-blue-400 shrink-0" />
          <span className="truncate">Knowledge Bank</span>
          <span className="bg-slate-800 text-xs px-2 py-0.5 rounded-full text-slate-300 ml-2">
            {knowledgePoints.length}
          </span>
        </div>
        
        {knowledgePoints.length > 0 && (
          <a
            href={exportUrl}
            download
            className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors border border-transparent hover:border-slate-600 flex items-center gap-1 text-xs font-medium shrink-0"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Export</span>
          </a>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {knowledgePoints.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 pt-12">
            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
              <Brain className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-center max-w-[200px] leading-relaxed">
              Start chatting. Insights and vocabulary will automatically appear here for this session.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {knowledgePoints.map((kp) => (
              <motion.div
                key={kp.id}
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                layout
              >
                <KnowledgeCard point={kp} onDelete={onDeletePoint} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
