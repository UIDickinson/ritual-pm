'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, RefreshCw, Sparkles, Brain, Activity, Shield,
  TrendingUp, BarChart3, Zap, Database
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'text-emerald-400' }) {
  return (
    <div className="glass-dark p-5 rounded-2xl border border-zinc-800">
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-6 h-6 ${color}`} />
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
      </div>
      <p className="text-zinc-300 text-sm font-medium">{label}</p>
      {sub && <p className="text-zinc-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function FunnelBar({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-zinc-400 text-sm w-20 text-right flex-shrink-0">{label}</span>
      <div className="flex-1 h-6 bg-zinc-900 rounded-lg overflow-hidden">
        <div
          className={`h-full rounded-lg ${color} transition-all duration-500`}
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
      <span className="text-sm text-zinc-300 w-12 flex-shrink-0">{count}</span>
    </div>
  );
}

export default function AIDashboard() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/');
      return;
    }
    fetchDashboard();
  }, [isAdmin, router]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ai-dashboard');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch AI dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  const ps = data?.proposalStats || {};
  const ts = data?.topicStats || {};
  const topicFunnelTotal = ts.total || 1;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="p-2 glass-dark rounded-xl hover:bg-zinc-800 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-400" />
              AI Dashboard
            </h1>
            <p className="text-zinc-400 mt-1">Pipeline performance, model config, and feedback metrics</p>
          </div>
          <button
            onClick={fetchDashboard}
            className="ml-auto p-3 glass-dark rounded-xl hover:bg-purple-500/10 transition-all"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 text-purple-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading && !data ? (
          <div className="text-center py-20">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Loading AI metrics...</p>
          </div>
        ) : data ? (
          <div className="space-y-8">
            {/* Proposal Stats */}
            <section>
              <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Proposal Metrics
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={BarChart3} label="Total Proposals" value={ps.total || 0} color="text-zinc-300" />
                <StatCard icon={Zap} label="Pending Review" value={ps.pending || 0} color="text-yellow-400" sub="Awaiting admin action" />
                <StatCard icon={TrendingUp} label="Approved" value={(ps.approved || 0) + (ps.edited || 0)} color="text-emerald-400" sub={`${ps.edited || 0} edited`} />
                <StatCard icon={Shield} label="Rejected" value={ps.rejected || 0} color="text-red-400" />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="glass-dark p-5 rounded-2xl border border-zinc-800">
                  <p className="text-zinc-400 text-sm mb-1">Avg AI Confidence</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {ps.avgConfidence ? `${(ps.avgConfidence * 100).toFixed(1)}%` : '—'}
                  </p>
                </div>
                <div className="glass-dark p-5 rounded-2xl border border-zinc-800">
                  <p className="text-zinc-400 text-sm mb-1">Avg Engagement Score</p>
                  <p className="text-2xl font-bold text-orange-400">
                    {ps.avgEngagementScore ? (ps.avgEngagementScore * 100).toFixed(1) : '—'}
                  </p>
                </div>
              </div>
            </section>

            {/* Topic Funnel */}
            <section>
              <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                Topic Funnel
              </h2>
              <div className="glass-dark p-6 rounded-2xl border border-zinc-800 space-y-3">
                <FunnelBar label="Detected" count={ts.detected || 0} total={topicFunnelTotal} color="bg-zinc-600" />
                <FunnelBar label="Scored" count={ts.scored || 0} total={topicFunnelTotal} color="bg-blue-600" />
                <FunnelBar label="Filtered" count={ts.filtered || 0} total={topicFunnelTotal} color="bg-yellow-600" />
                <FunnelBar label="Proposed" count={ts.proposed || 0} total={topicFunnelTotal} color="bg-purple-600" />
                <FunnelBar label="Approved" count={ts.approved || 0} total={topicFunnelTotal} color="bg-emerald-600" />
                <FunnelBar label="Rejected" count={ts.rejected || 0} total={topicFunnelTotal} color="bg-red-600" />
                <div className="pt-2 border-t border-zinc-800 text-xs text-zinc-500 text-right">
                  Total topics: {ts.total || 0}
                </div>
              </div>
            </section>

            {/* Feedback & Policy Events */}
            <section className="grid md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-400" />
                  Feedback Events
                </h2>
                <div className="glass-dark p-6 rounded-2xl border border-zinc-800 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Total Events</span>
                    <span className="text-white font-medium">{data.feedbackEventCount || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Aggregation Runs</span>
                    <span className="text-white font-medium">{data.feedbackEventBreakdown?.aggregationRuns || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Model Updates</span>
                    <span className="text-white font-medium">{data.feedbackEventBreakdown?.modelUpdates || 0}</span>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-400" />
                  Policy Events ({data.policyEventCount || 0})
                </h2>
                <div className="glass-dark p-6 rounded-2xl border border-zinc-800">
                  {data.policyReasonCodes && Object.keys(data.policyReasonCodes).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(data.policyReasonCodes)
                        .sort(([, a], [, b]) => b - a)
                        .map(([code, count]) => (
                          <div key={code} className="flex justify-between text-sm">
                            <span className="text-zinc-400 font-mono text-xs">{code}</span>
                            <span className="text-white font-medium">{count}</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-sm">No policy events recorded</p>
                  )}
                </div>
              </div>
            </section>

            {/* Active Model Config */}
            <section>
              <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                Active Model Configuration
              </h2>
              {data.activeModel ? (
                <div className="glass-dark p-6 rounded-2xl border border-zinc-800">
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-zinc-500 text-xs uppercase tracking-wider">Model Name</p>
                      <p className="text-white font-mono text-sm mt-1">{data.activeModel.model_name}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs uppercase tracking-wider">Version</p>
                      <p className="text-white font-mono text-sm mt-1">{data.activeModel.version}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs uppercase tracking-wider">Last Updated</p>
                      <p className="text-white text-sm mt-1">
                        {data.activeModel.updated_at && new Date(data.activeModel.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {data.activeModel.weights && (
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                      <p className="text-zinc-400 text-sm font-medium mb-2">Scoring Weights</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(data.activeModel.weights).map(([key, val]) => (
                          <div key={key} className="bg-zinc-900 rounded-lg px-3 py-2">
                            <p className="text-zinc-500 text-xs">{key}</p>
                            <p className="text-white font-mono text-sm">{typeof val === 'number' ? val.toFixed(2) : JSON.stringify(val)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.activeModel.thresholds && (
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                      <p className="text-zinc-400 text-sm font-medium mb-2">Thresholds</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(data.activeModel.thresholds).map(([key, val]) => (
                          <div key={key} className="bg-zinc-900 rounded-lg px-3 py-2">
                            <p className="text-zinc-500 text-xs">{key}</p>
                            <p className="text-white font-mono text-sm">{typeof val === 'number' ? val.toFixed(3) : JSON.stringify(val)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="glass-dark p-6 rounded-2xl border border-zinc-800 text-center">
                  <Brain className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-500 text-sm">No active model configuration found</p>
                  <p className="text-zinc-600 text-xs mt-1">A model config will appear after the feedback aggregator runs</p>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="text-center py-20 glass-dark rounded-2xl border border-zinc-800">
            <Brain className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 text-lg">Failed to load dashboard data</p>
          </div>
        )}
      </div>
    </div>
  );
}
