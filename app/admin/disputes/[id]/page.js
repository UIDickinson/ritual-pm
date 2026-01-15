'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Ban } from 'lucide-react';

export default function DecideDispute() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams();
  const disputeId = params.id;

  const [dispute, setDispute] = useState(null);
  const [market, setMarket] = useState(null);
  const [decision, setDecision] = useState('');
  const [adminDecision, setAdminDecision] = useState('');
  const [newWinningOutcomeId, setNewWinningOutcomeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/');
      return;
    }
    fetchDispute();
  }, [isAdmin, disputeId, router]);

  const fetchDispute = async () => {
    try {
      // We need to find the market with this dispute
      const marketsRes = await fetch('/api/markets');
      if (marketsRes.ok) {
        const markets = await marketsRes.json();
        const disputedMarkets = markets.filter(m => m.status === 'disputed' || m.status === 'resolved');
        
        for (const mkt of disputedMarkets) {
          const disputesRes = await fetch(`/api/markets/${mkt.id}/dispute`);
          if (disputesRes.ok) {
            const disputes = await disputesRes.json();
            const found = disputes.find(d => d.id === disputeId);
            if (found) {
              setDispute(found);
              setMarket(mkt);
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch dispute:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!decision) {
      alert('Please select a decision');
      return;
    }

    if (!adminDecision.trim()) {
      alert('Please provide your reasoning');
      return;
    }

    if (decision === 'overturned' && !newWinningOutcomeId) {
      alert('Please select the correct winning outcome');
      return;
    }

    if (!confirm(`Are you sure you want to ${decision} this dispute? This action cannot be undone.`)) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/disputes/${disputeId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          decision,
          adminDecision,
          newWinningOutcomeId: decision === 'overturned' ? newWinningOutcomeId : null
        })
      });

      if (res.ok) {
        alert(`Dispute ${decision} successfully!`);
        router.push('/admin');
      } else {
        const error = await res.json();
        alert(`Failed to decide dispute: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to decide dispute:', error);
      alert('Failed to decide dispute');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-emerald-950/20 to-zinc-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  if (!dispute || !market) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-emerald-950/20 to-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Dispute not found</p>
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

  const originalWinner = market.outcomes?.find(o => o.id === market.winning_outcome_id);

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

        <div className="glass-dark p-8 rounded-3xl border border-red-500/20 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-red-500/20 rounded-2xl">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">Decide Dispute</h1>
              <p className="text-zinc-400">Review the dispute and make your decision</p>
            </div>
          </div>

          {/* Market Info */}
          <div className="glass-dark p-6 rounded-2xl mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">{market.question}</h2>
            {market.description && (
              <p className="text-zinc-400 mb-4">{market.description}</p>
            )}

            <div className="flex items-center gap-4 text-sm">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full font-medium">
                Resolved
              </span>
              <span className="text-zinc-500">
                Winner: <span className="text-emerald-400 font-medium">{originalWinner?.text}</span>
              </span>
            </div>
          </div>

          {/* Dispute Details */}
          <div className="glass-dark p-6 rounded-2xl mb-6 border border-red-500/20">
            <h3 className="text-lg font-bold text-white mb-4">Dispute Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-zinc-500 text-sm mb-1">Initiated By</p>
                <p className="text-white font-medium">{dispute.initiator?.username}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-sm mb-1">Reason</p>
                <p className="text-white">{dispute.reason}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-sm mb-1">Disputed At</p>
                <p className="text-zinc-400">{new Date(dispute.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Decision Options */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Your Decision</h3>
            <div className="grid grid-cols-1 gap-3">
              {/* Upheld */}
              <button
                onClick={() => setDecision('upheld')}
                className={`p-6 rounded-2xl border-2 transition-all text-left ${
                  decision === 'upheld'
                    ? 'border-emerald-500 bg-emerald-500/20 shadow-lg shadow-emerald-500/30'
                    : 'border-zinc-700 glass-dark hover:border-emerald-500/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                    decision === 'upheld' ? 'border-emerald-400 bg-emerald-400' : 'border-zinc-600'
                  }`}>
                    {decision === 'upheld' && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <p className="text-white font-bold">Uphold Original Resolution</p>
                    </div>
                    <p className="text-zinc-400 text-sm">
                      The original resolution is correct. Market will become final.
                    </p>
                  </div>
                </div>
              </button>

              {/* Overturned */}
              <button
                onClick={() => setDecision('overturned')}
                className={`p-6 rounded-2xl border-2 transition-all text-left ${
                  decision === 'overturned'
                    ? 'border-orange-500 bg-orange-500/20 shadow-lg shadow-orange-500/30'
                    : 'border-zinc-700 glass-dark hover:border-orange-500/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                    decision === 'overturned' ? 'border-orange-400 bg-orange-400' : 'border-zinc-600'
                  }`}>
                    {decision === 'overturned' && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-5 h-5 text-orange-400" />
                      <p className="text-white font-bold">Overturn & Re-resolve</p>
                    </div>
                    <p className="text-zinc-400 text-sm">
                      Original resolution is incorrect. Select the correct winner below.
                    </p>
                  </div>
                </div>
              </button>

              {/* Invalidated */}
              <button
                onClick={() => setDecision('invalidated')}
                className={`p-6 rounded-2xl border-2 transition-all text-left ${
                  decision === 'invalidated'
                    ? 'border-red-500 bg-red-500/20 shadow-lg shadow-red-500/30'
                    : 'border-zinc-700 glass-dark hover:border-red-500/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                    decision === 'invalidated' ? 'border-red-400 bg-red-400' : 'border-zinc-600'
                  }`}>
                    {decision === 'invalidated' && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Ban className="w-5 h-5 text-red-400" />
                      <p className="text-white font-bold">Invalidate Market</p>
                    </div>
                    <p className="text-zinc-400 text-sm">
                      Market cannot be resolved fairly. All predictions will be refunded.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Select New Winner (if overturned) */}
          {decision === 'overturned' && (
            <div className="mb-6 p-6 glass-dark rounded-2xl border border-orange-500/20">
              <h4 className="text-lg font-bold text-white mb-4">Select Correct Winner</h4>
              <div className="space-y-3">
                {market.outcomes?.map(outcome => (
                  <button
                    key={outcome.id}
                    onClick={() => setNewWinningOutcomeId(outcome.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      newWinningOutcomeId === outcome.id
                        ? 'border-orange-500 bg-orange-500/20'
                        : 'border-zinc-700 hover:border-orange-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        newWinningOutcomeId === outcome.id ? 'border-orange-400 bg-orange-400' : 'border-zinc-600'
                      }`}>
                        {newWinningOutcomeId === outcome.id && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <p className="text-white font-medium">{outcome.text}</p>
                      {outcome.id === market.winning_outcome_id && (
                        <span className="ml-auto px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                          Current Winner
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Admin Reasoning */}
          <div className="mb-6">
            <label className="block text-white font-medium mb-2">
              Your Reasoning <span className="text-red-400">*</span>
            </label>
            <textarea
              value={adminDecision}
              onChange={(e) => setAdminDecision(e.target.value)}
              placeholder="Explain your decision and reasoning..."
              className="w-full px-4 py-3 bg-black/40 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              rows={4}
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!decision || !adminDecision.trim() || (decision === 'overturned' && !newWinningOutcomeId) || submitting}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              !decision || !adminDecision.trim() || (decision === 'overturned' && !newWinningOutcomeId) || submitting
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'gradient-primary hover:shadow-2xl hover:shadow-emerald-500/40 hover:scale-[1.02]'
            }`}
          >
            {submitting ? 'Submitting...' : 'Submit Decision'}
          </button>
        </div>
      </div>
    </div>
  );
}
