"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { createOrGetThread, deleteFriend, fetchFriends } from '@/lib/api';
import type { FriendItem } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function FriendsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login/register');
    }
  }, [loading, isAuthenticated, router]);
  const { data, isLoading, isError } = useQuery<FriendItem[]>({ queryKey: ['friends'], queryFn: fetchFriends, enabled: isAuthenticated });

  const removeMutation = useMutation({
    mutationFn: (friendUserId: number) => deleteFriend(friendUserId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
  });

  if (!isAuthenticated) {
    return <div className="mx-auto max-w-3xl p-6">Redirecting to Login…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold mb-4">Your Friends</h1>
      {isLoading && <div>Loading…</div>}
      {isError && <div className="text-red-600">Failed to load friends.</div>}

      {!isLoading && !isError && (
        <ul className="space-y-3">
          {(data || []).length === 0 && <li className="text-gray-600">No friends yet. Go to Find a Partner to add some!</li>}
          {(data || []).map((item) => (
            <li key={item.id} className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 bg-white">
              <Link href={`/users/${item.friend.id}`} className="flex items-center gap-4 flex-1 group">
                {item.friend.profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.friend.profile.avatar_url} alt={item.friend.username} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs">No Avatar</div>
                )}
                <div className="flex-1">
                  <div className="font-medium group-hover:text-indigo-600 transition-colors">
                    {item.friend.profile?.display_name || item.friend.username}
                    <span className="ml-2 text-sm text-gray-500 font-normal">@{item.friend.username}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.friend.profile?.location || 'Unknown'}
                    {typeof item.friend.profile?.skill_level === 'number' ? (
                      <span className="ml-2">• Skill {item.friend.profile.skill_level}</span>
                    ) : null}
                  </div>
                </div>
              </Link>
              <button
                onClick={() => removeMutation.mutate(item.friend.id)}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                disabled={removeMutation.isPending}
              >
                Remove
              </button>
              <button
                onClick={async () => {
                  const thread = await createOrGetThread(item.friend.id);
                  router.push(`/chat/${thread.id}`);
                }}
                className="inline-flex items-center justify-center rounded-md border border-indigo-600 px-3 py-1.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
              >
                Message
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
