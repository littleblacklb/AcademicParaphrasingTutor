import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/lib/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        "flex gap-4 w-full p-6 text-base md:text-lg animate-in slide-in-from-bottom-2 fade-in duration-300",
        isUser ? "bg-background" : "bg-slate-800/30"
      )}
    >
      <div className="max-w-3xl mx-auto flex gap-6 w-full">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
            isUser
              ? "bg-slate-700 text-slate-200"
              : "bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg shadow-blue-500/20"
          )}
        >
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </div>
        
        <div className="flex-1 space-y-2 overflow-hidden prose prose-invert prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:border prose-pre:border-slate-700 max-w-none">
          {message.content ? (
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {message.content}
            </ReactMarkdown>
          ) : (
            <span className="w-2 h-4 inline-block bg-blue-500 animate-pulse rounded-full" />
          )}
        </div>
      </div>
    </div>
  );
}
