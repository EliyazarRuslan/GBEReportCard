'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  reply?: string;
  error?: string;
}

let messageSeq = 0;
function makeMessage(role: Message['role'], content: string): Message {
  messageSeq += 1;
  return { id: `msg-${messageSeq}`, role, content };
}

async function readChatReply(res: Response): Promise<string> {
  if (!res.ok) {
    const body: ChatResponse = await res.json().catch(() => ({}));
    return `Error: ${body.error ?? `Request failed (${res.status})`}`;
  }
  const data: ChatResponse = await res.json();
  return data.error ? `Error: ${data.error}` : data.reply ?? '';
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const updated = [...messages, makeMessage('user', text)];
    setMessages(updated);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated.map(({ role, content }) => ({ role, content })) }),
      });
      const reply = await readChatReply(res);
      setMessages([...updated, makeMessage('assistant', reply)]);
    } catch {
      setMessages([...updated, makeMessage('assistant', 'Failed to connect to chat service.')]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#C8A951] text-white shadow-lg hover:bg-[#b89840] transition-colors flex items-center justify-center"
          aria-label="Open chat"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[520px] bg-white rounded-xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A2E] text-white">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#C8A951]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="font-semibold text-sm">Fleet AI Assistant</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-8">
                <p className="mb-2">Ask me about your fleet data</p>
                <div className="space-y-1 text-xs text-gray-300">
                  <p>&quot;How many vehicles are under warranty?&quot;</p>
                  <p>&quot;Show downtime for vehicle XD3L&quot;</p>
                  <p>&quot;Which vehicles have overdue PM?&quot;</p>
                </div>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#1A1A2E] text-white'
                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500 border border-gray-200">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 flex gap-2">
            <label htmlFor="chat-input" className="sr-only">Message</label>
            <input
              id="chat-input"
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about fleet data..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A951] focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={isLoading || !input.trim()}
              className="px-3 py-2 bg-[#C8A951] text-white rounded-lg text-sm hover:bg-[#b89840] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
