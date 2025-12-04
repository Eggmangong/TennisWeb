"use client";

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addFriend, fetchRecommendation, fetchAIRecommendation } from '@/lib/api';
import type { Recommendation, AIRecommendationResult } from '@/lib/types';
import { backhands, courtTypes, dominantHands, genders, labelOf, languages, matchTypes, playIntentions } from '@/lib/profileOptions';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

export default function MatchPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login/register');
    }
  }, [loading, isAuthenticated, router]);

  const [exclude, setExclude] = useState<number[]>([]);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const qc = useQueryClient();

  // Algorithm recommendation
  const algoQuery = useQuery<Recommendation, any>({
    queryKey: ['recommendation', 'algo', exclude.join(',')],
    queryFn: () => fetchRecommendation(exclude),
    enabled: isAuthenticated,
  });

  // AI recommendation (LLM)
  const aiQuery = useQuery<AIRecommendationResult, any>({
    queryKey: ['recommendation', 'ai', exclude.join(','), selectedModel],
    queryFn: () => fetchAIRecommendation(exclude, 8, selectedModel),
    enabled: isAuthenticated,
    retry: 1,
  });

  const [mode, setMode] = useState<'algo' | 'ai' | 'compare'>('algo');

  const addFriendMutation = useMutation({
    mutationFn: (friendId: number) => addFriend(friendId),
    onSuccess: () => {
      // refresh friends cache
      qc.invalidateQueries({ queryKey: ['friends'] });
    },
  });

  const refetchBoth = () => {
    algoQuery.refetch();
    aiQuery.refetch();
  };

  const handleNext = (skipId?: number) => {
    if (skipId) setExclude((prev) => [...prev, skipId]);
    refetchBoth();
  };

  const handleSave = async (friendId: number) => {
    await addFriendMutation.mutateAsync(friendId);
    setExclude((prev) => [...prev, friendId]);
    refetchBoth();
  };

  if (!isAuthenticated) {
    return <div className="mx-auto max-w-3xl p-6">Redirecting to Login…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold mb-4">Find a Tennis Partner</h1>
      <p className="text-gray-600 mb-4">Choose a recommendation mode to discover potential partners:</p>
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setMode('algo')}
          className={`px-3 py-2 rounded-md text-sm font-medium border ${mode==='algo' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >Algorithm Match</button>
        <button
          onClick={() => setMode('ai')}
          className={`px-3 py-2 rounded-md text-sm font-medium border ${mode==='ai' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >AI Match</button>
        <button
          onClick={() => setMode('compare')}
          className={`px-3 py-2 rounded-md text-sm font-medium border ${mode==='compare' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >Compare Both</button>
      </div>

      {(mode === 'ai' || mode === 'compare') && (
        <div className="mb-4 flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <label className="text-sm font-medium text-gray-700">Select AI Model:</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="block rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
          >
            <option value="gpt-4o">OpenAI GPT-4o</option>
            <option value="grok">xAI: Grok 4 Fast</option>
            <option value="llama">Meta: Llama 3.3 70B</option>
            <option value="gemini">Google: Gemini 2.0 Flash</option>
            <option value="qwen">Qwen: Qwen2.5 72B Instruct</option>
          </select>
        </div>
      )}

      {mode !== 'ai' && algoQuery.isLoading && <div>Loading algorithm match…</div>}
      {mode !== 'ai' && algoQuery.isError && <div className="text-red-600">{algoQuery.error?.response?.data?.detail || 'Algorithm recommendation failed.'}</div>}
      {mode !== 'algo' && aiQuery.isLoading && <div>Loading AI match…</div>}
      {mode !== 'algo' && aiQuery.isError && <div className="text-red-600">{aiQuery.error?.message || 'AI recommendation failed.'}</div>}

      {/* Render blocks */}
      {(mode === 'algo' || mode === 'compare') && algoQuery.data && (
        <div className="rounded-xl border border-gray-200 p-4 shadow-sm bg-white mb-6">
          <div className="flex items-start gap-4">
            {algoQuery.data.user.profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={algoQuery.data.user.profile.avatar_url} alt={algoQuery.data.user.username} className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">No Avatar</div>
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold inline-block mr-2">{algoQuery.data.user.profile?.display_name || algoQuery.data.user.username}</h2>
                  <span className="text-sm text-gray-500">@{algoQuery.data.user.username}</span>
                </div>
                <span className="text-sm text-indigo-600 font-medium">Score: {algoQuery.data.score.toFixed(1)}</span>
              </div>
              <div className="mt-1 text-gray-600 text-sm">
                <span>{algoQuery.data.user.profile?.location || '-'}</span>
                {algoQuery.data.user.profile?.age ? <span className="ml-2">• Age {algoQuery.data.user.profile.age}</span> : null}
                {typeof algoQuery.data.user.profile?.years_playing === 'number' ? (
                  <span className="ml-2">• Years Playing {algoQuery.data.user.profile.years_playing}</span>
                ) : null}
                {typeof algoQuery.data.user.profile?.skill_level === 'number' ? (
                  <span className="ml-2">• Skill Level {algoQuery.data.user.profile.skill_level}</span>
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                <div>
                  <div className="text-gray-500">Gender</div>
                  <div className="font-medium">{labelOf(genders, algoQuery.data.user.profile?.gender)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Forehand</div>
                  <div className="font-medium">{labelOf(dominantHands, algoQuery.data.user.profile?.dominant_hand)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Backhand</div>
                  <div className="font-medium">{labelOf(backhands, algoQuery.data.user.profile?.backhand_type)}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-gray-500">Bio</div>
                  <div className="font-medium whitespace-pre-line">{algoQuery.data.user.profile?.bio || '—'}</div>
                </div>
                <div className="sm:col-span-2 pt-1 border-t border-gray-100" />
                <div>
                  <div className="text-gray-500">Court Types</div>
                  <div className="font-medium">{(algoQuery.data.user.profile?.preferred_court_types ?? []).length ? (algoQuery.data.user.profile?.preferred_court_types ?? []).map(v => labelOf(courtTypes, v)).join(', ') : '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Match Types</div>
                  <div className="font-medium">{(algoQuery.data.user.profile?.preferred_match_types ?? []).length ? (algoQuery.data.user.profile?.preferred_match_types ?? []).map(v => labelOf(matchTypes, v)).join(', ') : '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Play Intentions</div>
                  <div className="font-medium">{(algoQuery.data.user.profile?.play_intentions ?? []).length ? (algoQuery.data.user.profile?.play_intentions ?? []).map(v => labelOf(playIntentions, v)).join(', ') : '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Languages</div>
                  <div className="font-medium">{(algoQuery.data.user.profile?.preferred_languages ?? []).length ? (algoQuery.data.user.profile?.preferred_languages ?? []).map(v => labelOf(languages, v)).join(', ') : '-'}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => handleSave(algoQuery.data.user.id)}
                  className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                  disabled={addFriendMutation.isPending}
                >
                  Save to Friends
                </button>
                <button
                  onClick={() => handleNext(algoQuery.data.user.id)}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(mode === 'ai' || mode === 'compare') && aiQuery.data && (
        <div className="rounded-xl border border-gray-200 p-4 shadow-sm bg-white">
          <div className="flex items-start gap-4">
            {aiQuery.data.user.profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={aiQuery.data.user.profile.avatar_url} alt={aiQuery.data.user.username} className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">No Avatar</div>
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold inline-block mr-2">{aiQuery.data.user.profile?.display_name || aiQuery.data.user.username}</h2>
                  <span className="text-sm text-gray-500">@{aiQuery.data.user.username}</span>
                </div>
                <span className="text-sm text-purple-600 font-medium">Algo Score: {aiQuery.data.score.toFixed(1)}</span>
              </div>
              <div className="mt-1 text-gray-600 text-sm">
                <span>{aiQuery.data.user.profile?.location || '-'}</span>
                {aiQuery.data.user.profile?.age ? <span className="ml-2">• Age {aiQuery.data.user.profile.age}</span> : null}
                {typeof aiQuery.data.user.profile?.years_playing === 'number' ? (
                  <span className="ml-2">• Years Playing {aiQuery.data.user.profile.years_playing}</span>
                ) : null}
                {typeof aiQuery.data.user.profile?.skill_level === 'number' ? (
                  <span className="ml-2">• Skill Level {aiQuery.data.user.profile.skill_level}</span>
                ) : null}
              </div>
              <div className="mt-2 mb-3 rounded-md bg-purple-50 border border-purple-100 p-2 text-xs text-purple-700 whitespace-pre-line">
                <strong className="block mb-1">AI Reasoning ({selectedModel}):</strong>{aiQuery.data.reason}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                <div>
                  <div className="text-gray-500">Gender</div>
                  <div className="font-medium">{labelOf(genders, aiQuery.data.user.profile?.gender)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Forehand</div>
                  <div className="font-medium">{labelOf(dominantHands, aiQuery.data.user.profile?.dominant_hand)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Backhand</div>
                  <div className="font-medium">{labelOf(backhands, aiQuery.data.user.profile?.backhand_type)}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-gray-500">Bio</div>
                  <div className="font-medium whitespace-pre-line">{aiQuery.data.user.profile?.bio || '—'}</div>
                </div>
                <div className="sm:col-span-2 pt-1 border-t border-gray-100" />
                <div>
                  <div className="text-gray-500">Court Types</div>
                  <div className="font-medium">{(aiQuery.data.user.profile?.preferred_court_types ?? []).length ? (aiQuery.data.user.profile?.preferred_court_types ?? []).map(v => labelOf(courtTypes, v)).join(', ') : '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Match Types</div>
                  <div className="font-medium">{(aiQuery.data.user.profile?.preferred_match_types ?? []).length ? (aiQuery.data.user.profile?.preferred_match_types ?? []).map(v => labelOf(matchTypes, v)).join(', ') : '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Play Intentions</div>
                  <div className="font-medium">{(aiQuery.data.user.profile?.play_intentions ?? []).length ? (aiQuery.data.user.profile?.play_intentions ?? []).map(v => labelOf(playIntentions, v)).join(', ') : '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Languages</div>
                  <div className="font-medium">{(aiQuery.data.user.profile?.preferred_languages ?? []).length ? (aiQuery.data.user.profile?.preferred_languages ?? []).map(v => labelOf(languages, v)).join(', ') : '-'}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => handleSave(aiQuery.data.user.id)}
                  className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 disabled:opacity-50"
                  disabled={addFriendMutation.isPending}
                >
                  Save to Friends
                </button>
                <button
                  onClick={() => handleNext(aiQuery.data.user.id)}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === 'algo' && !algoQuery.isLoading && !algoQuery.data && !algoQuery.isError && (
        <div className="text-gray-600">No more candidates.</div>
      )}
      {mode === 'ai' && !aiQuery.isLoading && !aiQuery.data && !aiQuery.isError && (
        <div className="text-gray-600">No AI candidate available.</div>
      )}
    </div>
  );
}

// reverted layout: no Item component needed
