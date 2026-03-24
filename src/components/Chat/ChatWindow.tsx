import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType } from '@/lib/types';

interface ChatWindowProps {
  messages: ChatMessageType[];
}

export function ChatWindow({ messages }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 p-8 text-center animate-in fade-in duration-700">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center border border-slate-700 shadow-xl">
            <span className="text-3xl">📝</span>
          </div>
          <h2 className="text-xl font-medium text-slate-300">Welcome to APT</h2>
          <p className="max-w-md leading-relaxed">
            I&apos;m your Academic Paraphrasing Tutor. Paste a sentence you&apos;d like to practice paraphrasing, or ask me for an example!
          </p>
        </div>
      ) : (
        <div className="flex flex-col pb-6">
          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}
          <div ref={bottomRef} className="h-4" />
        </div>
      )}
    </div>
  );
}
