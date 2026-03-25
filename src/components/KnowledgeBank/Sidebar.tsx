import { useState, useEffect, useCallback } from 'react';
import { KnowledgeCard } from './KnowledgeCard';
import { Download, Brain, Search, Plus, Check, X } from 'lucide-react';
import type { KnowledgePoint, KnowledgeCategory } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'session' | 'global';

interface SidebarProps {
  knowledgePoints: KnowledgePoint[];
  onDeletePoint?: (id: string) => void;
  onToggleGlobal?: (id: string) => void;
  onEditPoint?: (id: string, fields: Partial<KnowledgePoint>) => void;
  conversationId?: string | null;
}

const categoryFilters: { value: KnowledgeCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'synonym', label: 'Synonyms' },
  { value: 'collocation', label: 'Collocations' },
  { value: 'word_form', label: 'Word Forms' },
  { value: 'grammar_rule', label: 'Grammar' },
  { value: 'user_mistake', label: 'Mistakes' },
];

const categoryOptions: { value: KnowledgeCategory; label: string }[] = [
  { value: 'synonym', label: 'Synonym' },
  { value: 'collocation', label: 'Collocation' },
  { value: 'word_form', label: 'Word Form' },
  { value: 'grammar_rule', label: 'Grammar Rule' },
  { value: 'user_mistake', label: 'Correction' },
];

const inputClass = 'w-full bg-slate-800/70 border border-slate-600/50 rounded-md px-2.5 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50';

export function Sidebar({ knowledgePoints, onDeletePoint, onToggleGlobal, onEditPoint, conversationId }: SidebarProps) {
  const [tab, setTab] = useState<Tab>('session');
  const [globalPoints, setGlobalPoints] = useState<KnowledgePoint[]>([]);
  const [globalCategory, setGlobalCategory] = useState<KnowledgeCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);

  // Add form state
  const [isAdding, setIsAdding] = useState(false);
  const [addCategory, setAddCategory] = useState<KnowledgeCategory>('synonym');
  const [addOriginal, setAddOriginal] = useState('');
  const [addAlternative, setAddAlternative] = useState('');
  const [addExplanation, setAddExplanation] = useState('');
  const [addExample, setAddExample] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchGlobalPoints = useCallback(() => {
    setIsLoadingGlobal(true);
    const url = globalCategory === 'all'
      ? '/api/knowledge?global=true'
      : `/api/knowledge?global=true&category=${globalCategory}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setGlobalPoints(data);
      })
      .catch(console.error)
      .finally(() => setIsLoadingGlobal(false));
  }, [globalCategory]);

  useEffect(() => {
    if (tab === 'global') fetchGlobalPoints();
  }, [tab, fetchGlobalPoints]);

  const handleToggleGlobal = (id: string) => {
    onToggleGlobal?.(id);
    setGlobalPoints((prev) => {
      const existing = prev.find((p) => p.id === id);
      if (existing) {
        return prev.filter((p) => p.id !== id);
      }
      return prev;
    });
    if (tab === 'global') {
      setTimeout(fetchGlobalPoints, 300);
    }
  };

  const resetAddForm = () => {
    setIsAdding(false);
    setAddCategory('synonym');
    setAddOriginal('');
    setAddAlternative('');
    setAddExplanation('');
    setAddExample('');
  };

  const handleAdd = async () => {
    if (!addOriginal.trim() || !addAlternative.trim() || !addExplanation.trim()) return;
    setIsSubmitting(true);
    try {
      const isGlobalTab = tab === 'global';
      const body: Record<string, unknown> = {
        category: addCategory,
        original_text: addOriginal.trim(),
        academic_alternative: addAlternative.trim(),
        explanation: addExplanation.trim(),
        example_sentence: addExample.trim() || undefined,
      };
      if (isGlobalTab) {
        body.in_global_bank = true;
      } else if (conversationId) {
        body.conversation_id = conversationId;
      }

      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        resetAddForm();
        if (isGlobalTab) {
          fetchGlobalPoints();
        }
        // Session tab points are managed by parent — trigger a refetch
        // by dispatching a custom event the parent can listen to
        if (!isGlobalTab) {
          window.dispatchEvent(new CustomEvent('knowledge-point-added'));
        }
      }
    } catch (error) {
      console.error('Failed to add knowledge point:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedPoints = tab === 'session' ? knowledgePoints : globalPoints;
  const filteredGlobal = tab === 'global' && searchQuery.trim()
    ? displayedPoints.filter((p) =>
        p.original_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.academic_alternative.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.explanation.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : displayedPoints;

  const exportUrl = conversationId
    ? `/api/knowledge/export?format=csv&conversation_id=${conversationId}`
    : `/api/knowledge/export?format=csv`;

  return (
    <div className="h-full flex flex-col bg-slate-900/50 backdrop-blur-xl border-l border-border/50 relative">
      <div className="h-14 px-5 flex items-center justify-between border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2 text-primary font-medium truncate">
          <Brain className="w-5 h-5 text-blue-400 shrink-0" />
          <span className="truncate">Knowledge Bank</span>
          <span className="bg-slate-800 text-xs px-2 py-0.5 rounded-full text-slate-300 ml-2">
            {filteredGlobal.length}
          </span>
        </div>

        {knowledgePoints.length > 0 && tab === 'session' && (
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

      {/* Tabs */}
      <div className="flex border-b border-border/50 shrink-0">
        <button
          onClick={() => setTab('session')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'session'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Session
        </button>
        <button
          onClick={() => setTab('global')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'global'
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Global Bank
        </button>
      </div>

      {/* Global tab filters */}
      {tab === 'global' && (
        <div className="px-4 pt-3 pb-2 space-y-2 shrink-0 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search global bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categoryFilters.map((c) => (
              <button
                key={c.value}
                onClick={() => setGlobalCategory(c.value)}
                className={`px-2.5 py-1 rounded-full text-xs transition-all border ${
                  globalCategory === c.value
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700/50'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* Inline add form */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 backdrop-blur-md space-y-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold tracking-wider uppercase text-blue-400">New Knowledge Point</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleAdd}
                      disabled={isSubmitting || !addOriginal.trim() || !addAlternative.trim() || !addExplanation.trim()}
                      className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={resetAddForm}
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Category</label>
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value as KnowledgeCategory)}
                    className="w-full bg-slate-800/70 border border-slate-600/50 rounded-md px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50"
                  >
                    {categoryOptions.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Original</label>
                  <input
                    type="text"
                    value={addOriginal}
                    onChange={(e) => setAddOriginal(e.target.value)}
                    className={inputClass}
                    placeholder="Original text..."
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Academic Alternative</label>
                  <input
                    type="text"
                    value={addAlternative}
                    onChange={(e) => setAddAlternative(e.target.value)}
                    className={inputClass}
                    placeholder="Academic alternative..."
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Explanation</label>
                  <textarea
                    value={addExplanation}
                    onChange={(e) => setAddExplanation(e.target.value)}
                    className={`${inputClass} resize-none`}
                    rows={2}
                    placeholder="Explanation..."
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Example (optional)</label>
                  <input
                    type="text"
                    value={addExample}
                    onChange={(e) => setAddExample(e.target.value)}
                    className={inputClass}
                    placeholder="Example sentence..."
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoadingGlobal && tab === 'global' ? (
          <div className="flex items-center justify-center pt-12">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredGlobal.length === 0 && !isAdding ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 pt-12">
            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
              <Brain className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-center max-w-[200px] leading-relaxed">
              {tab === 'session'
                ? 'Start chatting. Insights and vocabulary will automatically appear here for this session.'
                : 'No bookmarked knowledge points yet. Star items from your sessions to save them here.'}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredGlobal.map((kp) => (
              <motion.div
                key={kp.id}
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                layout
              >
                <KnowledgeCard
                  point={kp}
                  onDelete={tab === 'session' ? onDeletePoint : undefined}
                  onToggleGlobal={handleToggleGlobal}
                  onEdit={onEditPoint}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* FAB */}
      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="absolute bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-500/25 flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-10"
          title="Add knowledge point"
        >
          <Plus className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
