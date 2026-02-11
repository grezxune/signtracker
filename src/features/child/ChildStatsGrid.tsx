import type { ChildStats } from "./types";

export function ChildStatsGrid({ stats }: { stats: ChildStats | null | undefined }) {
  if (!stats) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-xl bg-white p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-indigo-600">{stats.total}</div>
          <div className="text-xs text-gray-600">Total</div>
        </div>
        <div className="rounded-xl bg-white p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-green-600">{stats.byConfidence.mastered}</div>
          <div className="text-xs text-gray-600">Mastered</div>
        </div>
        <div className="rounded-xl bg-white p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-yellow-600">{stats.byConfidence.familiar}</div>
          <div className="text-xs text-gray-600">Familiar</div>
        </div>
        <div className="rounded-xl bg-white p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{stats.recentCount}</div>
          <div className="text-xs text-gray-600">This Week</div>
        </div>
      </div>
    </div>
  );
}
