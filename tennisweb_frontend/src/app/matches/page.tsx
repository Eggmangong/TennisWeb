'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMatches } from '@/lib/api';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function MatchesPage() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: fetchMatches,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white shadow sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-lg font-medium text-gray-900">比赛</h2>
        <p className="mt-1 text-sm text-gray-500">查看最近的比赛和即将进行的比赛</p>
      </div>
      <ul className="divide-y divide-gray-200">
        {matches?.map((match) => (
          <li key={match.id} className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center">
                  <span className="font-medium text-gray-900">{match.player1.name}</span>
                  <span className="mx-2 text-gray-500">vs</span>
                  <span className="font-medium text-gray-900">{match.player2.name}</span>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {format(new Date(match.date), 'PPP', { locale: zhCN })}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  地点: {match.location}
                </div>
              </div>
              <div>
                {match.status === 'completed' ? (
                  <div className="text-sm">
                    <span className="text-gray-900 font-medium">比分:</span>
                    <span className="ml-1 text-gray-500">{match.score}</span>
                  </div>
                ) : (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    match.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {match.status === 'scheduled' ? '已安排' : '已取消'}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}