'use client';

import { useState } from 'react';
import { X, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';

export default function ApprovalVoteModal({ market, userId, onClose, onVoteSuccess }) {
  const [vote, setVote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVote = async () => {
    if (!vote) {
      setError('Please select approve or reject');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/markets/${market.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, vote })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to vote');
      }

      onVoteSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-heavy w-full max-w-md p-6 rounded-2xl border border-primary-emerald/30 shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Vote on Market
            </h2>
            <p className="text-slate-gray text-sm">
              Help decide if this market should go live
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-gray hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Market Question */}
        <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
          <p className="text-white text-sm font-medium line-clamp-3">
            {market.question}
          </p>
        </div>

        {/* Vote Options */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setVote('approve')}
            className={`
              p-4 rounded-xl border-2 transition-all
              ${vote === 'approve'
                ? 'border-primary-emerald bg-primary-emerald/20 shadow-lg shadow-emerald/30'
                : 'border-white/10 hover:border-primary-emerald/50 bg-white/5'
              }
            `}
          >
            <ThumbsUp className={`w-8 h-8 mx-auto mb-2 ${vote === 'approve' ? 'text-primary-emerald' : 'text-slate-gray'}`} />
            <p className={`font-semibold ${vote === 'approve' ? 'text-primary-emerald' : 'text-white'}`}>
              Approve
            </p>
            <p className="text-xs text-slate-gray mt-1">
              Market should go live
            </p>
          </button>

          <button
            onClick={() => setVote('reject')}
            className={`
              p-4 rounded-xl border-2 transition-all
              ${vote === 'reject'
                ? 'border-hot-coral bg-hot-coral/20 shadow-lg shadow-coral/30'
                : 'border-white/10 hover:border-hot-coral/50 bg-white/5'
              }
            `}
          >
            <ThumbsDown className={`w-8 h-8 mx-auto mb-2 ${vote === 'reject' ? 'text-hot-coral' : 'text-slate-gray'}`} />
            <p className={`font-semibold ${vote === 'reject' ? 'text-hot-coral' : 'text-white'}`}>
              Reject
            </p>
            <p className="text-xs text-slate-gray mt-1">
              Market should not go live
            </p>
          </button>
        </div>

        {/* Info */}
        <div className="bg-primary-blue/10 border border-primary-blue/30 rounded-xl p-3 mb-6">
          <p className="text-primary-blue text-xs">
            <strong>Note:</strong> You can only vote once. Markets need 10 approvals to go live. 
            Admins can override voting at any time.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-hot-coral/10 border border-hot-coral/30 rounded-xl p-3 text-hot-coral text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-all font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleVote}
            disabled={!vote || loading}
            className="flex-1 gradient-primary text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-emerald hover:shadow-xl hover:shadow-emerald hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Voting...
              </>
            ) : (
              'Submit Vote'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
