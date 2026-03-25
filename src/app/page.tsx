'use client';

import { useState, useEffect } from 'react';
import { ChatWindow } from '@/components/Chat/ChatWindow';
import { ChatInput } from '@/components/Chat/ChatInput';
import { Sidebar } from '@/components/KnowledgeBank/Sidebar';
import { ConversationList } from '@/components/ConversationList';
import type { ChatMessage, KnowledgePoint, StreamEvent, Conversation, StoredMessage } from '@/lib/types';
import { LayoutPanelLeft, List } from 'lucide-react';

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Right pane (Knowledge bank)
  const [isConversationsOpen, setIsConversationsOpen] = useState(false); // Left pane (Conversations list mobile)
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Initialize conversations
  useEffect(() => {
    fetch('/api/conversations')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setConversations(data);
          if (data.length > 0 && !selectedConversationId) {
            setSelectedConversationId(data[0].id);
          }
        }
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load selected conversation
  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      setKnowledgePoints([]);
      return;
    }

    // Load messages
    fetch(`/api/conversations/${selectedConversationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          const loadedMessages = (data.messages || []).map((m: StoredMessage) => ({
            role: m.role,
            content: m.content
          }));
          setMessages(loadedMessages);
        }
      })
      .catch(console.error);

    // Load knowledge points for this conversation
    fetch(`/api/knowledge?conversation_id=${selectedConversationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setKnowledgePoints(data);
      })
      .catch(console.error);
  }, [selectedConversationId]);

  const handleNewConversation = async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Conversation' }),
      });
      const conv = await res.json();
      setConversations((prev) => [conv, ...prev]);
      setSelectedConversationId(conv.id);
      setIsConversationsOpen(false);
    } catch (error) {
      console.error('Failed to create conversation', error);
    }
  };

  const handleRenameConversation = async (id: string, title: string) => {
    try {
      await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c))
      );
    } catch (error) {
      console.error('Failed to rename conversation', error);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (selectedConversationId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        setSelectedConversationId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (error) {
      console.error('Failed to delete conversation', error);
    }
  };

  const handleSend = async (content: string) => {
    let convId = selectedConversationId;

    // Auto-create conversation if none exists
    if (!convId) {
      try {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: content.slice(0, 30) + '...' }), // Auto-title
        });
        const conv = await res.json();
        setConversations((prev) => [conv, ...prev]);
        setSelectedConversationId(conv.id);
        convId = conv.id;
      } catch (error) {
        console.error('Auto-create conversation failed', error);
        return;
      }
    } else {
      // Auto rename first message
      if (messages.length === 0) {
        handleRenameConversation(convId, content.slice(0, 30) + '...');
      }
    }

    const userMsg: ChatMessage = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsStreaming(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, conversation_id: convId }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = '';

      // Add a placeholder assistant message
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: StreamEvent = JSON.parse(line.slice(6));

              if (event.type === 'text') {
                assistantMsg += event.content;
                setMessages((prev) => [
                  ...prev.slice(0, -1),
                  { role: 'assistant', content: assistantMsg },
                ]);
              } else if (event.type === 'knowledge_point') {
                // Add the new knowledge point to the top of the list
                setKnowledgePoints((prev) => [{ id: crypto.randomUUID(), created_at: new Date().toISOString(), in_global_bank: false, ...event.data } as KnowledgePoint, ...prev]);
                // On mobile, auto-open sidebar when a point is extracted
                if (window.innerWidth < 1024) setIsSidebarOpen(true);
              } else if (event.type === 'error') {
                console.error('Stream error:', event.message);
              }
            } catch {
              // Ignore incomplete JSON chunks (can happen if chunk is split over boundaries)
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error processing your request. Please check your API key.' },
      ]);
    } finally {
      setIsStreaming(false);
      // touch the conversation locally so it jumps to top next refresh (optional)
    }
  };

  const handleDeletePoint = async (id: string) => {
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setKnowledgePoints((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete point:', error);
    }
  };

  const handleToggleGlobal = async (id: string) => {
    const point = knowledgePoints.find((p) => p.id === id);
    const newValue = point ? !point.in_global_bank : true;
    try {
      const res = await fetch(`/api/knowledge/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ in_global_bank: newValue }),
      });
      if (res.ok) {
        setKnowledgePoints((prev) =>
          prev.map((p) => p.id === id ? { ...p, in_global_bank: newValue } : p)
        );
      }
    } catch (error) {
      console.error('Failed to toggle global bank:', error);
    }
  };

  return (
    <div className="h-full flex relative overflow-hidden">
      {/* Mobile Toggle Buttons */}
      <div className="lg:hidden absolute top-4 left-4 z-50 flex gap-2">
        <button
          onClick={() => setIsConversationsOpen(!isConversationsOpen)}
          className="p-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl text-slate-300"
        >
          <List className="w-5 h-5" />
        </button>
      </div>
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden absolute top-4 right-4 z-50 p-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl text-slate-300"
      >
        <LayoutPanelLeft className="w-5 h-5" />
      </button>

      {/* Left Sidebar (Conversations) */}
      <div
        className={`absolute lg:static top-0 left-0 h-full w-64 lg:w-72 transition-transform duration-300 z-40 lg:translate-x-0 ${
          isConversationsOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full pt-14 lg:pt-0 bg-slate-900 lg:bg-transparent border-r border-border/50">
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
            onNew={handleNewConversation}
            onDelete={handleDeleteConversation}
            onRename={handleRenameConversation}
          />
        </div>
      </div>

      {/* Dark overlay for mobile left sidebar */}
      {isConversationsOpen && (
        <div 
          className="absolute inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsConversationsOpen(false)}
        />
      )}

      {/* Main Chat Area (Center Pane) */}
      <div className={`flex flex-col h-full flex-1 transition-all duration-300`}>
        <div className="h-14 lg:hidden shrink-0 border-b border-border/50" /> {/* mobile spacer for toggles */}
        <ChatWindow messages={messages} />
        <ChatInput onSend={handleSend} isStreaming={isStreaming} />
      </div>

      {/* Knowledge Bank (Right Pane) */}
      <div
        className={`absolute lg:static top-0 right-0 h-full w-full sm:w-[400px] lg:w-[35%] xl:w-[30%] transition-transform duration-300 lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } z-40 bg-background lg:bg-transparent shadow-2xl lg:shadow-none border-l border-border/50`}
      >
        <div className="h-full pt-14 lg:pt-0 bg-slate-900 lg:bg-transparent"> {/* Padding for mobile navbar dodge */}
          <Sidebar
            knowledgePoints={knowledgePoints}
            onDeletePoint={handleDeletePoint}
            onToggleGlobal={handleToggleGlobal}
            conversationId={selectedConversationId}
          />
        </div>
      </div>

      {/* Dark overlay for mobile right sidebar */}
      {isSidebarOpen && (
        <div 
          className="absolute inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
