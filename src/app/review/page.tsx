'use client';

import { useState, useEffect, useCallback } from 'react';
import type { KnowledgePoint, KnowledgeCategory } from '@/lib/types';
import { Flashcard } from '@/components/Review/Flashcard';
import { ChevronLeft, ChevronRight, LayoutGrid, Shuffle, Star } from 'lucide-react';
import Link from 'next/link';

export default function ReviewPage() {
  const [allPoints, setAllPoints] = useState<KnowledgePoint[]>([]);
  const [points, setPoints] = useState<KnowledgePoint[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<KnowledgeCategory | 'all'>('all');
  const [source, setSource] = useState<'all' | 'global'>('all');
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    let url = '/api/knowledge';
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('category', filter);
    if (source === 'global') params.set('global', 'true');
    const qs = params.toString();
    if (qs) url += '?' + qs;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const fetched = Array.isArray(data) ? data : [];
        setAllPoints(fetched);
        setPoints(fetched);
        setCurrentIndex(0);
        setReviewCount(0);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [filter, source]);

  const shuffleN = useCallback((n: number) => {
    if (n <= 0 || allPoints.length === 0) {
      setPoints(allPoints);
      setReviewCount(0);
      setCurrentIndex(0);
      return;
    }
    const count = Math.min(n, allPoints.length);
    const shuffled = [...allPoints].sort(() => Math.random() - 0.5);
    setPoints(shuffled.slice(0, count));
    setReviewCount(count);
    setCurrentIndex(0);
  }, [allPoints]);

  const nextCard = () => {
    if (currentIndex < points.length - 1) setCurrentIndex((i) => i + 1);
  };

  const prevCard = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const categories: { value: KnowledgeCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All Cards' },
    { value: 'synonym', label: 'Synonyms' },
    { value: 'collocation', label: 'Collocations' },
    { value: 'word_form', label: 'Word Forms' },
    { value: 'grammar_rule', label: 'Grammar Rules' },
    { value: 'user_mistake', label: 'Mistakes' },
  ];

  return (
    <div className="min-h-full flex flex-col relative bg-slate-950">
      {/* Background gradients */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />
      <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 flex flex-col z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Review Bank</h1>
            <p className="text-slate-400">Master your academic vocabulary through spaced repetition.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.value}
                onClick={() => setFilter(c.value)}
                className={`px-4 py-2 rounded-full text-sm transition-all border ${
                  filter === c.value
                    ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20'
                    : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-700/50 hover:border-slate-600'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Source toggle + Random N controls */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <div className="flex items-center bg-slate-800/50 rounded-xl border border-slate-700/50 p-1">
            <button
              onClick={() => setSource('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                source === 'all'
                  ? 'bg-slate-700 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSource('global')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                source === 'global'
                  ? 'bg-amber-500/20 text-amber-300 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Star className="w-3.5 h-3.5" fill={source === 'global' ? 'currentColor' : 'none'} />
              Global Bank
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Review</label>
            <input
              type="number"
              min={1}
              max={allPoints.length}
              placeholder={String(allPoints.length)}
              value={reviewCount || ''}
              onChange={(e) => setReviewCount(Number(e.target.value))}
              className="w-20 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 text-center focus:outline-none focus:border-blue-500/50"
            />
            <span className="text-sm text-slate-400">random cards</span>
            <button
              onClick={() => shuffleN(reviewCount || allPoints.length)}
              disabled={allPoints.length === 0}
              className="p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : points.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center border border-slate-700">
              <LayoutGrid className="w-8 h-8 text-slate-500" />
            </div>
            <div>
              <h2 className="text-xl font-medium mb-2">No cards found</h2>
              <p className="text-slate-400 max-w-md">
                {source === 'global'
                  ? 'No bookmarked knowledge points yet. Star items from your sessions to save them to the Global Bank.'
                  : "You haven\u2019t extracted any knowledge points for this category yet. Head back to practice to generate some!"}
              </p>
            </div>
            <Link
              href="/"
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20"
            >
              Start Practicing
            </Link>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center max-w-3xl mx-auto w-full">
            <div className="w-full h-[400px] mb-12">
              <Flashcard point={points[currentIndex]} />
            </div>

            <div className="flex items-center gap-8 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
              <button
                onClick={prevCard}
                disabled={currentIndex === 0}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className="text-sm font-medium text-slate-300 w-24 text-center">
                {currentIndex + 1} / {points.length}
              </div>

              <button
                onClick={nextCard}
                disabled={currentIndex === points.length - 1}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
