'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, XCircle, Clock, Users, TrendingUp, Activity, RefreshCw, Settings } from 'lucide-react';
import UserManagementModal from '@/components/UserManagementModal';

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [markets, setMarkets] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/');
      return;
    }
    fetchData();
  }, [isAdmin, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [marketsRes, usersRes, activitiesRes, statsRes] = await Promise.all([
        fetch('/api/markets'),
        fetch('/api/admin/users'),
        fetch('/api/admin/activities'),
        fetch('/api/admin/stats')
      ]);

      if (marketsRes.ok) {
        const marketsData = await marketsRes.json();
        setMarkets(marketsData.markets || []);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || usersData || []);
      }

      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json();
        setActivities(activitiesData.activities || activitiesData || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStatistics(statsData);
      }

      // Fetch pending disputes
      const proposedMarkets = markets.filter(m => m.status === 'disputed');
      const disputePromises = proposedMarkets.map(m =>
        fetch(`/api/markets/${m.id}/dispute`).then(r => r.json())
      );
      const allDisputes = await Promise.all(disputePromises);
      setDisputes(allDisputes.flat().filter(d => d.status === 'pending'));
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateMarket = async (marketId) => {
    try {
      const res = await fetch(`/api/markets/${marketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action: 'activate'
        })
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to activate market:', error);
    }
  };

  const handleCloseMarket = async (marketId) => {
    try {
      const res = await fetch(`/api/markets/${marketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action: 'close'
        })
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to close market:', error);
    }
  };

  const handleDissolveMarket = async (marketId) => {
    if (!confirm('Are you sure you want to dissolve this market? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/markets/${marketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action: 'dissolve'
        })
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to dissolve market:', error);
    }
  };

  const pendingApprovals = markets.filter(m => m.status === 'proposed');
  const activeMarkets = markets.filter(m => m.status === 'live');
  const closedMarkets = markets.filter(m => m.status === 'closed');
  const disputedMarkets = markets.filter(m => m.status === 'disputed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-emerald-950/20 to-zinc-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-primary-emerald mb-2">
                Admin Dashboard
              </h1>
              <p className="text-zinc-400">Manage markets, users, and platform settings</p>
            </div>
            <button
              onClick={() => router.push('/admin/settings')}
              className="px-4 py-2 glass-dark rounded-xl hover:bg-emerald-500/10 transition-all flex items-center gap-2"
            >
              <Settings className="w-5 h-5 text-emerald-400" />
              <span className="text-white font-medium">Platform Settings</span>
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-dark p-6 rounded-2xl border border-emerald-500/20">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-emerald-400" />
              <span className="text-2xl font-bold text-emerald-400">{markets.length}</span>
            </div>
            <p className="text-zinc-400 text-sm">Total Markets</p>
          </div>

          <div className="glass-dark p-6 rounded-2xl border border-blue-500/20">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-blue-400" />
              <span className="text-2xl font-bold text-blue-400">{users.length}</span>
            </div>
            <p className="text-zinc-400 text-sm">Total Users</p>
          </div>

          <div className="glass-dark p-6 rounded-2xl border border-orange-500/20">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-orange-400" />
              <span className="text-2xl font-bold text-orange-400">{pendingApprovals.length}</span>
            </div>
            <p className="text-zinc-400 text-sm">Pending Approvals</p>
          </div>

          <div className="glass-dark p-6 rounded-2xl border border-red-500/20">
            <div className="flex items-center justify-between mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <span className="text-2xl font-bold text-red-400">{disputes.length}</span>
            </div>
            <p className="text-zinc-400 text-sm">Pending Disputes</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['overview', 'statistics', 'markets', 'disputes', 'users', 'activities'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'gradient-primary text-white shadow-lg shadow-emerald-500/20'
                  : 'glass-dark text-zinc-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          <button
            onClick={fetchData}
            className="ml-auto px-4 py-3 glass-dark rounded-xl hover:bg-emerald-500/10 transition-all"
          >
            <RefreshCw className="w-5 h-5 text-emerald-400" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto"></div>
            <p className="text-zinc-400 mt-4">Loading...</p>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Pending Disputes */}
                {disputes.length > 0 && (
                  <div className="glass-dark p-6 rounded-2xl border border-red-500/20">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <AlertCircle className="w-6 h-6 text-red-400" />
                      Pending Disputes ({disputes.length})
                    </h3>
                    <div className="space-y-3">
                      {disputes.slice(0, 5).map(dispute => (
                        <div key={dispute.id} className="glass-dark p-4 rounded-xl">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-white font-medium mb-1">{dispute.market?.question}</p>
                              <p className="text-zinc-400 text-sm mb-2">{dispute.reason}</p>
                              <p className="text-xs text-zinc-500">
                                Disputed by {dispute.initiator?.username} • {new Date(dispute.created_at).toLocaleString()}
                              </p>
                            </div>
                            <button
                              onClick={() => router.push(`/admin/disputes/${dispute.id}`)}
                              className="px-4 py-2 gradient-primary rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all whitespace-nowrap"
                            >
                              Review
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Approvals */}
                {pendingApprovals.length > 0 && (
                  <div className="glass-dark p-6 rounded-2xl border border-orange-500/20">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Clock className="w-6 h-6 text-orange-400" />
                      Pending Approvals ({pendingApprovals.length})
                    </h3>
                    <div className="space-y-3">
                      {pendingApprovals.slice(0, 5).map(market => (
                        <div key={market.id} className="glass-dark p-4 rounded-xl">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-white font-medium mb-1">{market.question}</p>
                              <p className="text-zinc-400 text-sm mb-2">{market.description}</p>
                              <div className="flex items-center gap-4 text-xs text-zinc-500">
                                <span>Created by {market.creator?.username}</span>
                                <span>Votes: {market.approval_votes?.approve || 0}/10</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleActivateMarket(market.id)}
                                className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-all whitespace-nowrap"
                              >
                                Activate
                              </button>
                              <button
                                onClick={() => handleDissolveMarket(market.id)}
                                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-all whitespace-nowrap"
                              >
                                Dissolve
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Markets Ready to Close */}
                {activeMarkets.filter(m => new Date(m.close_time) < new Date()).length > 0 && (
                  <div className="glass-dark p-6 rounded-2xl border border-blue-500/20">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Activity className="w-6 h-6 text-blue-400" />
                      Markets Ready to Close
                    </h3>
                    <div className="space-y-3">
                      {activeMarkets
                        .filter(m => new Date(m.close_time) < new Date())
                        .slice(0, 5)
                        .map(market => (
                          <div key={market.id} className="glass-dark p-4 rounded-xl">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="text-white font-medium mb-1">{market.question}</p>
                                <p className="text-zinc-400 text-sm">
                                  Closed at {new Date(market.close_time).toLocaleString()}
                                </p>
                              </div>
                              <button
                                onClick={() => handleCloseMarket(market.id)}
                                className="px-4 py-2 gradient-secondary rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all whitespace-nowrap"
                              >
                                Close Market
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Closed Markets Ready to Resolve */}
                {closedMarkets.length > 0 && (
                  <div className="glass-dark p-6 rounded-2xl border border-emerald-500/20">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                      Markets Ready to Resolve ({closedMarkets.length})
                    </h3>
                    <div className="space-y-3">
                      {closedMarkets.slice(0, 5).map(market => (
                        <div key={market.id} className="glass-dark p-4 rounded-xl">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-white font-medium mb-1">{market.question}</p>
                              <p className="text-zinc-400 text-sm">
                                {market.outcomes?.length} outcomes • Total pool: {market.outcomes?.reduce((sum, o) => sum + parseFloat(o.total_staked || 0), 0).toFixed(0)} pts
                              </p>
                            </div>
                            <button
                              onClick={() => router.push(`/admin/resolve/${market.id}`)}
                              className="px-4 py-2 gradient-primary rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all whitespace-nowrap"
                            >
                              Resolve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Statistics Tab */}
            {activeTab === 'statistics' && statistics && (
              <div className="space-y-6">
                {/* Market Statistics */}
                <div className="glass-dark p-6 rounded-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">Market Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="glass-dark p-4 rounded-xl">
                      <p className="text-zinc-500 text-sm mb-1">Total Markets</p>
                      <p className="text-white font-bold text-2xl">{statistics.markets.total}</p>
                    </div>
                    <div className="glass-dark p-4 rounded-xl">
                      <p className="text-zinc-500 text-sm mb-1">Live Markets</p>
                      <p className="text-emerald-400 font-bold text-2xl">{statistics.markets.live}</p>
                    </div>
                    <div className="glass-dark p-4 rounded-xl">
                      <p className="text-zinc-500 text-sm mb-1">Proposed</p>
                      <p className="text-orange-400 font-bold text-2xl">{statistics.markets.proposed}</p>
                    </div>
                    <div className="glass-dark p-4 rounded-xl">
                      <p className="text-zinc-500 text-sm mb-1">Closed</p>
                      <p className="text-blue-400 font-bold text-2xl">{statistics.markets.closed}</p>
                    </div>
                    <div className="glass-dark p-4 rounded-xl">
                      <p className="text-zinc-500 text-sm mb-1">Resolved</p>
                      <p className="text-purple-400 font-bold text-2xl">{statistics.markets.resolved}</p>
                    </div>
                    <div className="glass-dark p-4 rounded-xl">
                      <p className="text-zinc-500 text-sm mb-1">Final</p>
                      <p className="text-zinc-400 font-bold text-2xl">{statistics.markets.final}</p>
                    </div>
                  </div>
                </div>

                {/* Prediction Statistics */}
                <div className="glass-dark p-6 rounded-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">Prediction Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="glass-dark p-4 rounded-xl">
                      <p className="text-zinc-500 text-sm mb-1">Total Predictions</p>
                      <p className="text-white font-bold text-2xl">{statistics.predictions.total}</p>
                    </div>
                    <div className="glass-dark p-4 rounded-xl">
                      <p className="text-zinc-500 text-sm mb-1">Active</p>
                      <p className="text-emerald-400 font-bold text-2xl">{statistics.predictions.active}</p>
                    </div>
                    <div className="glass-dark p-4 rounded-xl">
                      <p className="text-zinc-500 text-sm mb-1">Paid Out</p>
                      <p className="text-blue-400 font-bold text-2xl">{statistics.predictions.paid}</p>
                    </div>
                    <div className="glass-dark p-4 rounded-xl">
                      <p className="text-zinc-500 text-sm mb-1">Total Staked</p>
                      <p className="text-white font-bold text-2xl">{statistics.predictions.totalStaked.toFixed(0)} pts</p>
                    </div>
                    <div className="glass-dark p-4 rounded-xl">
                      <p className="text-zinc-500 text-sm mb-1">Total Paid Out</p>
                      <p className="text-emerald-400 font-bold text-2xl">{statistics.predictions.totalPaidOut.toFixed(0)} pts</p>
                    </div>
                    <div className="glass-dark p-4 rounded-xl">
                      <p className="text-zinc-500 text-sm mb-1">Avg Stake</p>
                      <p className="text-zinc-400 font-bold text-2xl">{statistics.predictions.averageStake.toFixed(0)} pts</p>
                    </div>
                  </div>
                </div>

                {/* User Statistics */}
                <div className="glass-dark p-6 rounded-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">User Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="glass-dark p-4 rounded-xl">
                      <p className="text-zinc-500 text-sm mb-1">Total Users</p>
                      <p className="text-white font-bold text-2xl">{statistics.users.total}</p>
                    </div>
                    <div className="glass-dark p-4 rounded-xl">
                      <p className="text-zinc-500 text-sm mb-1">Active Today</p>
                      <p className="text-emerald-400 font-bold text-2xl">{statistics.activity.activeToday}</p>
                    </div>
                    <div className="glass-dark p-4 rounded-xl">
                      <p className="text-zinc-500 text-sm mb-1">Active This Week</p>
                      <p className="text-blue-400 font-bold text-2xl">{statistics.activity.activeThisWeek}</p>
                    </div>
                    <div className="glass-dark p-4 rounded-xl">
                      <p className="text-zinc-500 text-sm mb-1">Total Balance</p>
                      <p className="text-white font-bold text-2xl">{statistics.users.totalBalance.toFixed(0)} pts</p>
                    </div>
                    <div className="glass-dark p-4 rounded-xl">
                      <p className="text-zinc-500 text-sm mb-1">Avg Balance</p>
                      <p className="text-zinc-400 font-bold text-2xl">{statistics.users.averageBalance.toFixed(0)} pts</p>
                    </div>
                    <div className="glass-dark p-4 rounded-xl">
                      <p className="text-zinc-500 text-sm mb-1">Admins</p>
                      <p className="text-purple-400 font-bold text-2xl">{statistics.users.admins}</p>
                    </div>
                  </div>
                </div>

                {/* Platform Health */}
                <div className="glass-dark p-6 rounded-2xl border border-emerald-500/20">
                  <h3 className="text-xl font-bold text-white mb-4">Platform Health</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-zinc-400">Market Completion Rate</span>
                        <span className="text-white font-bold">
                          {statistics.markets.total > 0 
                            ? ((statistics.markets.final / statistics.markets.total) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                          style={{ 
                            width: `${statistics.markets.total > 0 
                              ? (statistics.markets.final / statistics.markets.total) * 100 
                              : 0}%` 
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-zinc-400">User Engagement Rate</span>
                        <span className="text-white font-bold">
                          {statistics.users.total > 0 
                            ? ((statistics.activity.activeThisWeek / statistics.users.total) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                          style={{ 
                            width: `${statistics.users.total > 0 
                              ? (statistics.activity.activeThisWeek / statistics.users.total) * 100 
                              : 0}%` 
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-zinc-400">Payout Rate</span>
                        <span className="text-white font-bold">
                          {statistics.predictions.totalStaked > 0 
                            ? ((statistics.predictions.totalPaidOut / statistics.predictions.totalStaked) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-600"
                          style={{ 
                            width: `${statistics.predictions.totalStaked > 0 
                              ? (statistics.predictions.totalPaidOut / statistics.predictions.totalStaked) * 100 
                              : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Markets Tab */}
            {activeTab === 'markets' && (
              <div className="glass-dark p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-4">All Markets</h3>
                <div className="space-y-3">
                  {markets.map(market => (
                    <div key={market.id} className="glass-dark p-4 rounded-xl">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="text-white font-medium">{market.question}</p>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              market.status === 'live' ? 'bg-emerald-500/20 text-emerald-400' :
                              market.status === 'proposed' ? 'bg-orange-500/20 text-orange-400' :
                              market.status === 'closed' ? 'bg-blue-500/20 text-blue-400' :
                              market.status === 'resolved' ? 'bg-purple-500/20 text-purple-400' :
                              market.status === 'disputed' ? 'bg-red-500/20 text-red-400' :
                              'bg-zinc-500/20 text-zinc-400'
                            }`}>
                              {market.status}
                            </span>
                          </div>
                          <p className="text-zinc-400 text-sm">
                            Created by {market.creator?.username} • {new Date(market.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => router.push(`/markets/${market.id}`)}
                          className="px-4 py-2 glass-dark rounded-lg text-sm font-medium hover:bg-emerald-500/10 transition-all"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="glass-dark p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">All Users</h3>
                    <p className="text-zinc-400 text-sm mt-1">{users.length} total users</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {users.map(usr => (
                    <div key={usr.id} className="glass-dark p-4 rounded-xl hover:bg-white/5 transition-all">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                            <span className="text-white font-bold">
                              {usr.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{usr.username}</p>
                            <p className="text-zinc-400 text-sm">
                              <span className="capitalize">{usr.role}</span> • {parseFloat(usr.points_balance || 0).toFixed(0)} pts
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-zinc-500">
                            Last active: {usr.last_active ? new Date(usr.last_active).toLocaleDateString() : 'Never'}
                          </p>
                          <button
                            onClick={() => {
                              setSelectedUser(usr);
                              setShowUserModal(true);
                            }}
                            className="px-3 py-2 glass-dark rounded-lg text-sm font-medium hover:bg-emerald-500/10 transition-all flex items-center gap-2"
                          >
                            <Settings className="w-4 h-4" />
                            Manage
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activities Tab */}
            {activeTab === 'activities' && (
              <div className="glass-dark p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-4">Recent Activities</h3>
                <div className="space-y-3">
                  {activities.slice(0, 50).map(activity => (
                    <div key={activity.id} className="glass-dark p-4 rounded-xl">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-white font-medium mb-1">{activity.action_type}</p>
                          <p className="text-zinc-400 text-sm">{activity.user?.username}</p>
                        </div>
                        <p className="text-xs text-zinc-500 whitespace-nowrap">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* User Management Modal */}
      {showUserModal && selectedUser && (
        <UserManagementModal
          user={selectedUser}
          adminUserId={user.id}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
}
