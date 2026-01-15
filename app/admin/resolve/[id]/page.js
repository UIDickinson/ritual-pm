'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

export default function ResolveMarket() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams();
  const marketId = params.id;

  const [market, setMarket] = useState(null);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [resolutionReason, setResolutionReason] = useState('');
  const [resolving, setResolving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/');
      return;
    }
    fetchMarket();
  }, [isAdmin, marketId, router]);

  const fetchMarket = async () => {
    try {
      const res = await fetch(`/api/markets/${marketId}`);
      if (res.ok) {
        const data = await res.json();
        setMarket(data.market || data);
      }
    } catch (error) {
      console.error('Failed to fetch market:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedOutcome) {
      alert('Please select a winning outcome');
      return;
    }

    if (!resolutionReason.trim()) {
      alert('Please provide a resolution reason');
      return;
    }

    if (!confirm(`Are you sure you want to resolve this market with "${selectedOutcome.outcome_text}" as the winner? Payouts will be distributed immediately.`)) {
      return;
    }

    setResolving(true);
    try {
      const res = await fetch(`/api/markets/${marketId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          winningOutcomeId: selectedOutcome.id,
          resolutionReason: resolutionReason
        })
      });

      if (res.ok) {
        alert('Market resolved successfully! Payouts have been distributed.');
        router.push('/admin');
      } else {
        const error = await res.json();
        alert(`Failed to resolve market: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to resolve market:', error);
      alert('Failed to resolve market');
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-emerald-950/20 to-zinc-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-emerald-950/20 to-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Market not found</p>
          <button
            onClick={() => router.push('/admin')}
            className="px-6 py-3 gradient-primary rounded-xl font-medium"
          >
            Back to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalPool = market.outcomes?.reduce((sum, o) => sum + parseFloat(o.total_staked || 0), 0) || 0;
  const totalPredictions = market.predictions_count || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-emerald-950/20 to-zinc-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Admin Dashboard
        </button>

        <div className="glass-dark p-8 rounded-3xl border border-emerald-500/20 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-emerald-500/20 rounded-2xl">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">Resolve Market</h1>
              <p className="text-zinc-400">Select the winning outcome and distribute payouts</p>
            </div>
          </div>

          {/* Market Info */}
          <div className="glass-dark p-6 rounded-2xl mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">{market.question}</h2>
            {market.description && (
              <p className="text-zinc-400 mb-4">{market.description}</p>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-zinc-500 text-sm mb-1">Total Pool</p>
                <p className="text-white font-bold text-xl">{totalPool.toFixed(0)} pts</p>
              </div>
              <div>
                <p className="text-zinc-500 text-sm mb-1">Total Predictions</p>
                <p className="text-white font-bold text-xl">{totalPredictions}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-sm mb-1">Status</p>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
                  {market.status}
                </span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl mb-6">
            <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-400 font-medium mb-1">Important Resolution Notes</p>
              <ul className="text-orange-300/80 text-sm space-y-1">
                <li>• Payouts will be distributed immediately to all winning predictions</li>
                <li>• Users will have 24 hours to dispute this resolution</li>
                <li>• During the dispute period, market status will be "resolved"</li>
                <li>• After 24 hours with no disputes, market becomes "final"</li>
              </ul>
            </div>
          </div>

          {/* Select Winning Outcome */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Select Winning Outcome</h3>
            <div className="space-y-3">
              {market.outcomes?.map(outcome => {
                const staked = parseFloat(outcome.total_staked || 0);
                const percentage = totalPool > 0 ? (staked / totalPool) * 100 : 0;
                const isSelected = selectedOutcome?.id === outcome.id;

                return (
                  <button
                    key={outcome.id}
                    onClick={() => setSelectedOutcome(outcome)}
                    className={`w-full p-6 rounded-2xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/20 shadow-lg shadow-emerald-500/30'
                        : 'border-zinc-700 glass-dark hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-emerald-400 bg-emerald-400' : 'border-zinc-600'
                          }`}>
                            {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                          </div>
                          <p className="text-white font-bold text-lg">{outcome.outcome_text}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-2xl mb-1">{percentage.toFixed(1)}%</p>
                        <p className="text-zinc-400 text-sm">{staked.toFixed(0)} pts staked</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isSelected ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-zinc-600 to-zinc-700'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payout Preview */}
          {selectedOutcome && (
            <div className="mt-6 p-6 glass-dark rounded-2xl border border-emerald-500/20">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Payout Preview
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Winning Pool</span>
                  <span className="text-white font-medium">{parseFloat(selectedOutcome.total_staked).toFixed(0)} pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Losing Pool</span>
                  <span className="text-white font-medium">
                    {(totalPool - parseFloat(selectedOutcome.total_staked)).toFixed(0)} pts
                  </span>
                </div>
                <div className="h-px bg-zinc-700 my-2"></div>
                <div className="flex justify-between text-base">
                  <span className="text-zinc-300">Total to Distribute</span>
                  <span className="text-emerald-400 font-bold">{totalPool.toFixed(0)} pts</span>
                </div>
                <p className="text-zinc-500 text-xs mt-4">
                  Winners will receive their original stake plus a proportional share of the losing pool
                </p>
              </div>
            </div>
          )}

          {/* Resolution Reason */}
          <div className="mt-6">
            <label className="block text-white font-bold text-lg mb-2">
              Resolution Reason <span className="text-red-400">*</span>
            </label>
            <p className="text-zinc-400 text-sm mb-4">
              Explain how you determined the winning outcome
            </p>
            <textarea
              value={resolutionReason}
              onChange={(e) => setResolutionReason(e.target.value)}
              placeholder="e.g., Based on official announcement from..."
              className="w-full px-4 py-3 bg-black/40 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              rows={3}
            />
          </div>

          {/* Resolve Button */}
          <button
            onClick={handleResolve}
            disabled={!selectedOutcome || !resolutionReason.trim() || resolving}
            className={`w-full mt-6 py-4 rounded-xl font-bold text-lg transition-all ${
              !selectedOutcome || !resolutionReason.trim() || resolving
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'gradient-primary hover:shadow-2xl hover:shadow-emerald-500/40 hover:scale-[1.02]'
            }`}
          >
            {resolving ? 'Resolving...' : 'Resolve Market & Distribute Payouts'}
          </button>
        </div>
      </div>
    </div>
  );
}
