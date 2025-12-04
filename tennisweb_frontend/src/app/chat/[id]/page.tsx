"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchThreadMessages, listChatThreads, sendMessage } from '@/lib/api';
import type { ChatMessage, ChatThread } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';

export default function ChatThreadPage() {
  const params = useParams<{ id: string }>();
  const threadId = Number(params.id);
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/login/register');
  }, [loading, isAuthenticated, router]);

  const { data: threads } = useQuery<ChatThread[]>({ queryKey: ['chat', 'threads'], queryFn: listChatThreads, enabled: isAuthenticated });
  const thread = useMemo(() => (threads || []).find((t) => t.id === threadId), [threads, threadId]);

  const { data: messages, isLoading, isError } = useQuery<ChatMessage[]>({
    queryKey: ['chat', 'threads', threadId, 'messages'],
    queryFn: () => fetchThreadMessages(threadId),
    enabled: Number.isFinite(threadId) && isAuthenticated,
    refetchInterval: 4000, // simple polling for demo
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessage(threadId, content),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['chat', 'threads', threadId, 'messages'] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.length]);

  if (!isAuthenticated) {
    return <div className="p-6">Redirecting to Login…</div>;
  }

  if (!Number.isFinite(threadId)) {
    return <div className="p-6 text-red-600">Invalid thread id.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg flex flex-col h-[70vh]">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-base font-medium text-gray-900">
              {thread?.other_user.profile?.display_name || thread?.other_user.username || 'Chat'}
              {thread?.other_user.username && <span className="ml-2 text-xs text-gray-500 font-normal">@{thread.other_user.username}</span>}
            </div>
            <div className="text-xs text-gray-500">{thread?.other_user.profile?.location || ''}</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {isLoading && <div>Loading…</div>}
          {isError && <div className="text-red-600">Failed to load messages.</div>}
          {(messages || []).map((m) => {
            const isMe = user?.id === m.sender.id;
            return (
              <div key={m.id} className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                {m.sender.profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.sender.profile.avatar_url} alt={m.sender.username} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-200" />
                )}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                  <div className="text-xs text-gray-600 mb-1">
                    {m.sender.profile?.display_name || m.sender.username}
                    <span className="ml-1 text-gray-400">@{m.sender.username}</span>
                  </div>
                  <div className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words shadow-sm ${
                    isMe 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}>
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <form
          className="border-t border-gray-200 p-3 flex items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const content = text.trim();
            if (!content) return;
            sendMutation.mutate(content);
          }}
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Type a message…"
          />
          <button
            type="submit"
            disabled={sendMutation.isPending}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
