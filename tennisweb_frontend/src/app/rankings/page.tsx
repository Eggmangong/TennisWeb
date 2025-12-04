import { useQuery } from '@tanstack/react-query';
import { fetchRankings } from '@/lib/api';

export default function RankingsPage() {
  const { data: rankings, isLoading } = useQuery({
    queryKey: ['rankings'],
    queryFn: fetchRankings,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-lg font-medium text-gray-900">Rankings</h2>
        <p className="mt-1 text-sm text-gray-500">View the latest rankings of community members</p>
      </div>
      <ul className="divide-y divide-gray-200">
        {rankings?.map((player, index) => (
          <li key={player.id} className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-8 text-center font-medium text-gray-900">
                  #{index + 1}
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-900">{player.name}</div>
                  <div className="text-sm text-gray-500">Win Rate: {player.winRate}%</div>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Points: {player.points}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}