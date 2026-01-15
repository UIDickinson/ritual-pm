'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ApprovalVoteModal from '@/components/ApprovalVoteModal';
import PredictionModal from '@/components/PredictionModal';
import { Loader2, Clock, Users, TrendingUp, Calendar, User, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function MarketDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchMarket();
    }
  }, [params.id]);

  const fetchMarket = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/markets/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setMarket(data.market);
      } else {
        console.error('Market not found');
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to fetch market:', error);
      router.push('/');
    }
    setLoading(false);
  };

  const handleVoteSuccess = (data) => {
    // Refresh market data
    fetchMarket();
    
    // Show success message (could add toast notification here)
    if (data.statusUpdate === 'approved') {
      alert('Market approved! It can now be activated by an admin.');
    }
  };

  const handlePredictionSuccess = (data) => {
    // Refresh market data
    fetchMarket();
    
    // Update user balance in context
    user.points_balance = data.newBalance;
  };

  const handleSubmitDispute = async () => {
    if (!disputeReason.trim() || disputeReason.length < 10) {
      alert('Please provide a detailed reason (at least 10 characters)');
      return;
    }

    setSubmittingDispute(true);
    try {
      const res = await fetch(`/api/markets/${params.id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          reason: disputeReason
        })
      });

      if (res.ok) {
        alert('Dispute submitted successfully!');
        setShowDisputeModal(false);
        setDisputeReason('');
        fetchMarket();
      } else {
        const error = await res.json();
        alert(`Failed to submit dispute: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to submit dispute:', error);
      alert('Failed to submit dispute');
    } finally {
      setSubmittingDispute(false);
    }
  };

  const isWithinDisputeWindow = () => {
    if (market?.status !== 'resolved' || !market.resolution_time) return false;
    const resolvedAt = new Date(market.resolution_time);
    const now = new Date();
    const hoursElapsed = (now - resolvedAt) / (1000 * 60 * 60);
    return hoursElapsed < 24;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-charcoal to-deep-emerald flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary-emerald animate-spin" />
      </div>
    );
  }

  if (!market) {
    return null;
  }

  const getStatusBadge = () => {
    const badges = {
      live: { bg: 'gradient-primary', text: 'Live' },
      proposed: { bg: 'bg-sunset-orange', text: 'Proposed' },
      approved: { bg: 'bg-primary-blue', text: 'Approved' },
      closed: { bg: 'bg-slate-gray', text: 'Closed' },
      resolved: { bg: 'gradient-success', text: 'Resolved' },
      disputed: { bg: 'gradient-alert', text: 'Disputed' },
      final: { bg: 'gradient-primary', text: 'Final' }
    };

    const badge = badges[market.status] || badges.proposed;

    return (
      <span className={`${badge.bg} px-4 py-1.5 rounded-full text-white text-sm font-semibold uppercase shadow-lg`}>
        {badge.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOutcomeColor = (index) => {
    const colors = [
      'from-primary-emerald to-bright-lime',
      'from-primary-blue to-sky-blue',
      'from-sunset-orange to-hot-coral',
      'from-deep-purple to-electric-pink'
    ];
    return colors[index % colors.length];
  };

  const calculatePercentage = (staked) => {
    if (market.total_pool === 0) return 0;
    return ((parseFloat(staked) / market.total_pool) * 100).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-charcoal to-deep-emerald">
      <Navigation />
      
      <main className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-gray hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Markets</span>
        </button>

        {/* Hero Section */}
        <div className="glass-dark p-8 rounded-2xl border border-primary-emerald/20 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                {getStatusBadge()}
                <span className="text-slate-gray text-sm">
                  Created {formatDate(market.created_at)}
                </span>
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">
                {market.question}
              </h1>
              {market.description && (
                <p className="text-slate-gray text-lg mb-4">
                  {market.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-slate-gray">
                <User className="w-4 h-4" />
                <span className="text-sm">
                  Created by <span className="text-white font-medium">{market.creator?.username}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-xl p-4 border border-primary-emerald/10">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-bright-lime" />
                <span className="text-slate-gray text-sm">Total Pool</span>
              </div>
              <p className="text-2xl font-bold text-bright-lime font-mono">
                {market.total_pool || 0} pts
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-primary-blue/10">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-primary-blue" />
                <span className="text-slate-gray text-sm">Predictions</span>
              </div>
              <p className="text-2xl font-bold text-primary-blue font-mono">
                {market.predictions_count || 0}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-sunset-orange/10">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-sunset-orange" />
                <span className="text-slate-gray text-sm">Closes</span>
              </div>
              <p className="text-lg font-bold text-sunset-orange">
                {formatDate(market.close_time)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Outcomes Section */}
          <div className="lg:col-span-2">
            <div className="glass-dark p-6 rounded-2xl border border-primary-emerald/20">
              <h2 className="text-2xl font-bold text-white mb-6">Outcomes</h2>
              <div className="space-y-4">
                {market.outcomes?.map((outcome, index) => {
                  const percentage = calculatePercentage(outcome.total_staked);
                  
                  return (
                    <div
                      key={outcome.id}
                      className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-primary-emerald/30 transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-white font-semibold text-lg mb-1">
                            {outcome.outcome_text}
                          </h3>
                          <p className="text-slate-gray text-sm">
                            {outcome.total_staked} pts staked
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-bright-lime text-2xl font-bold font-mono">
                            {percentage}%
                          </p>
                        </div>
                      </div>
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${getOutcomeColor(index)} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar - Action Panel */}
          <div className="lg:col-span-1">
            <div className="glass-dark p-6 rounded-2xl border border-primary-emerald/20 sticky top-24">
              <h3 className="text-xl font-bold text-white mb-4">Take Action</h3>
              
              {market.status === 'proposed' && (
                <div className="mb-4">
                  <p className="text-slate-gray text-sm mb-3">
                    This market needs community approval before going live.
                  </p>
                  <div className="bg-primary-blue/10 border border-primary-blue/30 rounded-xl p-3 mb-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-gray">Approval Progress</span>
                      <span className="text-white font-semibold">
                        {market.approval_votes?.approve || 0} / 10
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full gradient-primary"
                        style={{ width: `${Math.min(((market.approval_votes?.approve || 0) / 10) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowVoteModal(true)}
                    className="w-full gradient-primary text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-emerald hover:shadow-xl hover:shadow-emerald hover:-translate-y-0.5 transition-all"
                  >
                    Vote to Approve
                  </button>
                </div>
              )}

              {market.status === 'live' && (
                <div>
                  <p className="text-slate-gray text-sm mb-4">
                    Place your prediction on the outcome you believe will happen.
                  </p>
                  <button 
                    onClick={() => setShowPredictionModal(true)}
                    className="w-full gradient-primary text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-emerald hover:shadow-xl hover:shadow-emerald hover:-translate-y-0.5 transition-all"
                  >
                    Place Prediction
                  </button>
                </div>
              )}

              {(market.status === 'closed' || market.status === 'resolved') && (
                <div className="text-center">
                  <Clock className="w-12 h-12 text-slate-gray mx-auto mb-3" />
                  <p className="text-slate-gray">
                    This market is {market.status}. No new predictions allowed.
                  </p>
                  
                  {market.status === 'resolved' && isWithinDisputeWindow() && (
                    <div className="mt-4">
                      <button
                        onClick={() => setShowDisputeModal(true)}
                        className="w-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold py-3 px-6 rounded-xl hover:bg-orange-500/30 transition-all flex items-center justify-center gap-2"
                      >
                        <AlertTriangle className="w-5 h-5" />
                        Dispute Resolution
                      </button>
                      <p className="text-xs text-slate-gray mt-2">
                        Dispute window closes in {Math.floor(24 - ((new Date() - new Date(market.resolution_time)) / (1000 * 60 * 60)))} hours
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Vote Modal */}
      {showVoteModal && (
        <ApprovalVoteModal
          market={market}
          userId={user?.id}
          onClose={() => setShowVoteModal(false)}
          onVoteSuccess={handleVoteSuccess}
        />
      )}

      {/* Prediction Modal */}
      {showPredictionModal && user && (
        <PredictionModal
          market={market}
          user={user}
          onClose={() => setShowPredictionModal(false)}
          onSuccess={handlePredictionSuccess}
        />
      )}

      {/* Dispute Modal */}
      {showDisputeModal && user && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-charcoal/95 to-deep-emerald/95 backdrop-blur-xl rounded-3xl border border-orange-500/30 max-w-lg w-full shadow-2xl shadow-orange-500/20 p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-orange-500/20 rounded-2xl">
                <AlertTriangle className="w-8 h-8 text-orange-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Dispute Resolution</h3>
                <p className="text-slate-gray text-sm">
                  Explain why you believe this resolution is incorrect
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-white font-medium mb-2">
                Reason for Dispute <span className="text-red-400">*</span>
              </label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Provide detailed evidence and reasoning for why this resolution should be reviewed..."
                className="w-full px-4 py-3 bg-black/40 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                rows={5}
              />
              <p className="text-xs text-slate-gray mt-2">
                Minimum 10 characters required
              </p>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
              <p className="text-orange-300 text-sm">
                <strong>Note:</strong> Submitting a dispute will flag this market for admin review. 
                The admin will decide whether to uphold, overturn, or invalidate the resolution.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDisputeModal(false);
                  setDisputeReason('');
                }}
                className="flex-1 px-6 py-3 bg-white/5 text-white rounded-xl font-semibold hover:bg-white/10 transition-all"
                disabled={submittingDispute}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDispute}
                disabled={submittingDispute || disputeReason.length < 10}
                className="flex-1 px-6 py-3 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl font-semibold hover:bg-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingDispute ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
