"use client";

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { listChatThreads } from '@/lib/api';
import type { ChatThread } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ChatThreadsPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/login/register');
  }, [loading, isAuthenticated, router]);

  const { data, isLoading, isError } = useQuery<ChatThread[]>({ queryKey: ['chat', 'threads'], queryFn: listChatThreads, enabled: isAuthenticated });

  if (!isAuthenticated) {
    return <div className="mx-auto max-w-3xl p-6">Redirecting to Login…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold mb-4">Chats</h1>
      {isLoading && <div>Loading…</div>}
      {isError && <div className="text-red-600">Failed to load chats.</div>}
      {!isLoading && !isError && (
        <ul className="space-y-3">
          {(data || []).length === 0 && <li className="text-gray-600">No chats yet. Go to a friend profile and click Message to start one.</li>}
          {(data || []).map((t) => (
            <li key={t.id} className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 bg-white">
              <Link href={`/chat/${t.id}`} className="flex items-center gap-4 flex-1 group">
                {t.other_user.profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.other_user.profile.avatar_url} alt={t.other_user.username} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs">No Avatar</div>
                )}
                <div className="flex-1">
                  <div className="font-medium group-hover:text-indigo-600 transition-colors">
                    {t.other_user.profile?.display_name || t.other_user.username}
                    <span className="ml-2 text-sm text-gray-500 font-normal">@{t.other_user.username}</span>
                  </div>
                  <div className="text-sm text-gray-600">{t.other_user.profile?.location || 'Unknown'}</div>
                </div>
              </Link>
              <Link
                href={`/chat/${t.id}`}
                className="inline-flex items-center justify-center rounded-md border border-indigo-600 px-3 py-1.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
