"use client";

import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createOrGetThread, fetchUserById } from '@/lib/api';
import type { UserWithProfile } from '@/lib/types';
import { backhands, courtTypes, dominantHands, genders, labelOf, languages, matchTypes, playIntentions } from '@/lib/profileOptions';
import { useRouter } from 'next/navigation';

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);
  const router = useRouter();

  const { data, isLoading, isError } = useQuery<UserWithProfile>({
    queryKey: ['user', userId],
    queryFn: () => fetchUserById(userId),
    enabled: Number.isFinite(userId),
  });

  if (!Number.isFinite(userId)) {
    return <div className="p-6 text-red-600">Invalid user id.</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }
  if (isError || !data) {
    return <div className="p-6 text-red-600">Failed to load user profile.</div>;
  }

  const p = data.profile;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              {p?.display_name || data.username}
              <span className="ml-2 text-sm text-gray-500 font-normal">@{data.username}</span>
            </h2>
            <p className="mt-1 text-sm text-gray-500">Public profile</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                const thread = await createOrGetThread(data.id);
                router.push(`/chat/${thread.id}`);
              }}
              className="inline-flex items-center justify-center rounded-md border border-indigo-600 px-3 py-1.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
            >
              Message
            </button>
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-6 sm:px-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p?.avatar_url || 'https://via.placeholder.com/96'}
              alt="avatar"
              className="h-24 w-24 rounded-full object-cover"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 w-full">
              <Item label="Display Name" value={p?.display_name || '-'} />
              <Item label="Username" value={`@${data.username}`} />
              <Item label="Location" value={p?.location || '-'} />
              <Item label="Gender" value={labelOf(genders, p?.gender)} />
              <Item label="Age" value={p?.age ?? '-'} />
              <Item label="Years Playing" value={p?.years_playing ?? '-'} />
              <Item label="Skill Level" value={p?.skill_level ?? '-'} />
              <Item label="Forehand" value={labelOf(dominantHands, p?.dominant_hand)} />
              <Item label="Backhand" value={labelOf(backhands, p?.backhand_type)} />
              <Item
                label="Court Types"
                value={(p?.preferred_court_types ?? []).length ? (p?.preferred_court_types ?? []).map((v) => labelOf(courtTypes, v)).join(', ') : '-'}
              />
              <Item
                label="Match Types"
                value={(p?.preferred_match_types ?? []).length ? (p?.preferred_match_types ?? []).map((v) => labelOf(matchTypes, v)).join(', ') : '-'}
              />
              <Item
                label="Play Intentions"
                value={(p?.play_intentions ?? []).length ? (p?.play_intentions ?? []).map((v) => labelOf(playIntentions, v)).join(', ') : '-'}
              />
              <Item
                label="Languages"
                value={(p?.preferred_languages ?? []).length ? (p?.preferred_languages ?? []).map((v) => labelOf(languages, v)).join(', ') : '-'}
              />
              <div className="sm:col-span-2">
                <div className="text-sm font-medium text-gray-700">Bio</div>
                <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{p?.bio || '-'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="mt-1 text-sm text-gray-900">{value}</div>
    </div>
  );
}
