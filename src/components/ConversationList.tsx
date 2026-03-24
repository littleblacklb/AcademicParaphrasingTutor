import { Plus, MessageSquare, Trash2, Edit2, Check, X } from 'lucide-react';
import type { Conversation } from '@/lib/types';
import { useState } from 'react';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNew,
  onDelete,
  onRename,
}: ConversationListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleEditClick = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleRenameSubmit = (id: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (e && 'preventDefault' in e) e.preventDefault();
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleRenameCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/50 backdrop-blur-xl border-r border-border/50 shrink-0 w-64 lg:w-72">
      <div className="h-14 px-4 flex items-center justify-between border-b border-border/50 shrink-0">
        <span className="font-medium text-slate-300">Chats</span>
        <button
          onClick={onNew}
          className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center justify-center shadow-lg shadow-blue-500/20"
          title="New Chat"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {conversations.length === 0 ? (
          <div className="text-center text-sm text-slate-500 mt-10">
            No chats yet.
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                selectedId === conv.id
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
              
              {editingId === conv.id ? (
                <form
                  onSubmit={(e) => handleRenameSubmit(conv.id, e)}
                  className="flex-1 flex items-center gap-1"
                >
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 bg-slate-950 text-sm px-2 py-1 rounded outline-none border border-blue-500/50"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="submit" onClick={(e) => handleRenameSubmit(conv.id, e)} className="text-emerald-400 hover:text-emerald-300">
                      <Check className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={handleRenameCancel} className="text-rose-400 hover:text-rose-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm">
                    {conv.title}
                  </span>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleEditClick(conv.id, conv.title, e)}
                      className="p-1 text-slate-500 hover:text-blue-400 transition-colors"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(conv.id);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
