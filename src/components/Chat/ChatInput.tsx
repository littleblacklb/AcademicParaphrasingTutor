import { SendHorizonal, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
}

export function ChatInput({ onSend, isStreaming }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSend(input);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4 bg-background/50 backdrop-blur-xl border-t border-border/50 shrink-0">
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto relative flex items-end gap-2 bg-slate-800/50 rounded-2xl border border-slate-700/50 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all p-2 shadow-sm"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your paraphrase here..."
          className="flex-1 max-h-[200px] min-h-[44px] bg-transparent resize-none outline-none text-base py-2.5 px-3 scrollbar-thin placeholder:text-muted-foreground"
          disabled={isStreaming}
          rows={1}
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className={cn(
            "p-3 rounded-xl shrink-0 transition-all flex items-center justify-center",
            input.trim() && !isStreaming
              ? "bg-blue-500 text-white shadow-md shadow-blue-500/20 hover:bg-blue-600 active:scale-95"
              : "bg-slate-700/50 text-slate-400 cursor-not-allowed"
          )}
        >
          {isStreaming ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <SendHorizonal className="w-5 h-5" />
          )}
        </button>
      </form>
    </div>
  );
}
