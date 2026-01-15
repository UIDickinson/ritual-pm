'use client';

import { useState } from 'react';
import { X, TrendingUp, Loader2, AlertCircle } from 'lucide-react';

export default function PredictionModal({ market, user, onClose, onSuccess }) {
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fee = stakeAmount ? (parseFloat(stakeAmount) * 0.01).toFixed(2) : '0.00';
  const netStake = stakeAmount ? (parseFloat(stakeAmount) - parseFloat(fee)).toFixed(2) : '0.00';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const stake = parseFloat(stakeAmount);

    // Validate
    if (!selectedOutcome) {
      setError('Please select an outcome');
      return;
    }

    if (isNaN(stake) || stake < 1) {
      setError('Stake must be at least 1 point');
      return;
    }

    if (stake > user.points_balance) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          marketId: market.id,
          outcomeId: selectedOutcome.id,
          stakeAmount: stake
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to place prediction');
      }

      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const getOutcomeColor = (index) => {
    const colors = [
      'primary-emerald',
      'primary-blue',
      'sunset-orange',
      'deep-purple'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-heavy w-full max-w-2xl p-6 rounded-2xl border border-primary-emerald/30 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Place Prediction
            </h2>
            <p className="text-slate-gray text-sm">
              Choose an outcome and stake your points
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-gray hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Market Question */}
          <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
            <p className="text-white font-medium">
              {market.question}
            </p>
          </div>

          {/* Outcome Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-light-emerald mb-3">
              Select Outcome *
            </label>
            <div className="space-y-3">
              {market.outcomes?.map((outcome, index) => {
                const percentage = market.total_pool > 0 
                  ? ((parseFloat(outcome.total_staked) / market.total_pool) * 100).toFixed(1)
                  : 0;
                const isSelected = selectedOutcome?.id === outcome.id;
                const color = getOutcomeColor(index);

                return (
                  <button
                    key={outcome.id}
                    type="button"
                    onClick={() => setSelectedOutcome(outcome)}
                    className={`
                      w-full p-4 rounded-xl border-2 transition-all text-left
                      ${isSelected
                        ? `border-${color} bg-${color}/20 shadow-lg`
                        : 'border-white/10 hover:border-white/30 bg-white/5'
                      }
                    `}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className={`font-semibold ${isSelected ? `text-${color}` : 'text-white'}`}>
                        {outcome.outcome_text}
                      </span>
                      <span className={`text-sm font-mono ${isSelected ? `text-${color}` : 'text-bright-lime'}`}>
                        {percentage}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-gray">
                      <TrendingUp className="w-3 h-3" />
                      <span>{outcome.total_staked} pts staked</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stake Amount */}
          <div className="mb-6">
            <label htmlFor="stake" className="block text-sm font-medium text-light-emerald mb-2">
              Stake Amount *
            </label>
            <div className="relative">
              <input
                id="stake"
                type="number"
                min="1"
                step="0.01"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="w-full px-4 py-3 pr-16 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-gray focus:outline-none focus:border-primary-emerald focus:ring-2 focus:ring-primary-emerald/20 transition-all font-mono text-lg"
                placeholder="0.00"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-gray text-sm">
                pts
              </span>
            </div>
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-slate-gray">
                Available: <span className="text-bright-lime font-mono font-semibold">{user.points_balance}</span> pts
              </span>
              <button
                type="button"
                onClick={() => setStakeAmount(user.points_balance.toString())}
                className="text-primary-emerald hover:text-light-emerald font-medium"
              >
                Max
              </button>
            </div>
          </div>

          {/* Fee Breakdown */}
          {stakeAmount && parseFloat(stakeAmount) > 0 && (
            <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-gray">Stake Amount</span>
                <span className="text-white font-mono">{stakeAmount} pts</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-gray">Platform Fee (1%)</span>
                <span className="text-sunset-orange font-mono">-{fee} pts</span>
              </div>
              <div className="h-px bg-white/10 my-2"></div>
              <div className="flex justify-between">
                <span className="text-white font-medium">Net Stake</span>
                <span className="text-bright-lime font-mono font-bold text-lg">{netStake} pts</span>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-sunset-orange/10 border border-sunset-orange/30 rounded-xl p-3 mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-sunset-orange flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-gray">
              <p className="font-semibold text-sunset-orange mb-1">Important</p>
              <p>Points will be locked until market resolution. No editing or cancellation allowed.</p>
            </div>
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
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-all font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedOutcome || !stakeAmount}
              className="flex-1 gradient-primary text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-emerald hover:shadow-xl hover:shadow-emerald hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Placing...
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5" />
                  Place Prediction
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
