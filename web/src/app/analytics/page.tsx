'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AnalyticsData {
  overview: {
    totalHunts: number;
    totalParticipants: number;
    totalSubmissions: number;
    avgCompletionRate: number;
  };
  recentActivity: Array<{
    event_type: string;
    created_at: string;
    metadata: Record<string, unknown>;
  }>;
  huntStats: Array<{
    hunt_id: string;
    hunt_title: string;
    participants: number;
    completions: number;
    avgScore: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    participants: number;
    submissions: number;
  }>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/analytics?range=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-gray-400 mt-1">Track your hunt performance and engagement</p>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  timeRange === range
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <OverviewCard
            title="Total Hunts"
            value={data?.overview.totalHunts || 0}
            icon="🎯"
            trend="+12%"
          />
          <OverviewCard
            title="Total Participants"
            value={data?.overview.totalParticipants || 0}
            icon="👥"
            trend="+8%"
          />
          <OverviewCard
            title="Submissions"
            value={data?.overview.totalSubmissions || 0}
            icon="📸"
            trend="+23%"
          />
          <OverviewCard
            title="Completion Rate"
            value={`${(data?.overview.avgCompletionRate || 0).toFixed(1)}%`}
            icon="✅"
            trend="+5%"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Activity Chart */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Activity Over Time</h2>
            <div className="h-64 flex items-end gap-1">
              {(data?.timeSeriesData || []).slice(-14).map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-purple-600 rounded-t"
                    style={{ height: `${Math.max(4, (day.participants / 10) * 100)}%` }}
                  />
                  <span className="text-xs text-gray-500">
                    {new Date(day.date).getDate()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Hunts */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Top Performing Hunts</h2>
            <div className="space-y-4">
              {(data?.huntStats || []).slice(0, 5).map((hunt, i) => (
                <div key={hunt.hunt_id} className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-gray-600">#{i + 1}</span>
                  <div className="flex-1">
                    <p className="font-medium">{hunt.hunt_title}</p>
                    <p className="text-sm text-gray-400">
                      {hunt.participants} players · {hunt.completions} completions
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-purple-400">
                      {hunt.avgScore.toFixed(0)}
                    </p>
                    <p className="text-xs text-gray-500">avg score</p>
                  </div>
                </div>
              ))}
              {(data?.huntStats?.length || 0) === 0 && (
                <p className="text-gray-500 text-center py-8">No hunt data available yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {(data?.recentActivity || []).slice(0, 10).map((activity, i) => (
              <div key={i} className="flex items-center gap-4 py-2 border-b border-gray-700 last:border-0">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                  {activity.event_type === 'hunt_started' && '🎮'}
                  {activity.event_type === 'hunt_completed' && '🏆'}
                  {activity.event_type === 'submission' && '📸'}
                  {activity.event_type === 'achievement_unlocked' && '⭐'}
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    {activity.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {(data?.recentActivity?.length || 0) === 0 && (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewCard({
  title,
  value,
  icon,
  trend,
}: {
  title: string;
  value: string | number;
  icon: string;
  trend: string;
}) {
  const isPositive = trend.startsWith('+');

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex justify-between items-start mb-4">
        <span className="text-3xl">{icon}</span>
        <span className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {trend}
        </span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-gray-400 mt-1">{title}</p>
    </div>
  );
}
