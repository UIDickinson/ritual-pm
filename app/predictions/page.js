'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { Loader2, TrendingUp, Trophy, XCircle, Clock } from 'lucide-react';

export default function MyPredictionsPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user) {
      fetchPredictions();
    }
  }, [user, isAuthenticated]);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/predictions?userId=${user.id}`);
      const data = await response.json();
      setPredictions(data.predictions || []);
    } catch (error) {
      console.error('Failed to fetch predictions:', error);
    }
    setLoading(false);
  };

  if (!user) return null;

  const filteredPredictions = predictions.filter(pred => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['live', 'approved', 'proposed'].includes(pred.market?.status);
    if (filter === 'won') return pred.paid_out && pred.payout_amount > pred.stake_amount;
    if (filter === 'lost') return pred.paid_out && pred.payout_amount === 0;
    return true;
  });

  const stats = {
    total: predictions.length,
    active: predictions.filter(p => ['live', 'approved', 'proposed'].includes(p.market?.status)).length,
    won: predictions.filter(p => p.paid_out && p.payout_amount > p.stake_amount).length,
    lost: predictions.filter(p => p.paid_out && p.payout_amount === 0).length
  };

  const totalStaked = predictions.reduce((sum, p) => sum + parseFloat(p.stake_amount), 0);
  const totalWon = predictions.reduce((sum, p) => sum + parseFloat(p.payout_amount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-charcoal to-deep-emerald">
      <Navigation />
      
      <main className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            My Predictions
          </h1>
          <p className="text-slate-gray text-lg">
            Track your prediction history and performance
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-dark p-4 rounded-xl border border-primary-emerald/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-primary-emerald" />
              <span className="text-slate-gray text-sm">Total</span>
            </div>
            <p className="text-3xl font-bold text-white font-mono">{stats.total}</p>
          </div>
          
          <div className="glass-dark p-4 rounded-xl border border-sunset-orange/20">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-sunset-orange" />
              <span className="text-slate-gray text-sm">Active</span>
            </div>
            <p className="text-3xl font-bold text-sunset-orange font-mono">{stats.active}</p>
          </div>
          
          <div className="glass-dark p-4 rounded-xl border border-bright-lime/20">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-bright-lime" />
              <span className="text-slate-gray text-sm">Won</span>
            </div>
            <p className="text-3xl font-bold text-bright-lime font-mono">{stats.won}</p>
          </div>
          
          <div className="glass-dark p-4 rounded-xl border border-hot-coral/20">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-hot-coral" />
              <span className="text-slate-gray text-sm">Lost</span>
            </div>
            <p className="text-3xl font-bold text-hot-coral font-mono">{stats.lost}</p>
          </div>
        </div>

        {/* Performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="glass-dark p-6 rounded-xl border border-primary-emerald/20">
            <h3 className="text-white font-semibold mb-3">Total Staked</h3>
            <p className="text-4xl font-bold text-primary-emerald font-mono">{totalStaked.toFixed(2)} pts</p>
          </div>
          
          <div className="glass-dark p-6 rounded-xl border border-bright-lime/20">
            <h3 className="text-white font-semibold mb-3">Total Won</h3>
            <p className="text-4xl font-bold text-bright-lime font-mono">{totalWon.toFixed(2)} pts</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="glass-dark p-2 rounded-2xl border border-primary-emerald/20 mb-6 inline-flex gap-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'won', label: 'Won' },
            { id: 'lost', label: 'Lost' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`
                px-6 py-2 rounded-xl font-medium text-sm transition-all
                ${filter === tab.id 
                  ? 'gradient-primary text-white shadow-md shadow-emerald' 
                  : 'text-slate-gray hover:text-white hover:bg-white/5'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Predictions List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-12 h-12 text-primary-emerald animate-spin" />
          </div>
        ) : filteredPredictions.length === 0 ? (
          <div className="text-center py-16">
            <div className="glass-dark inline-block px-8 py-6 rounded-2xl border border-primary-emerald/20">
              <TrendingUp className="w-12 h-12 text-primary-emerald mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                No Predictions Yet
              </h2>
              <p className="text-slate-gray mb-4">
                Start predicting on markets to see your history here
              </p>
              <button
                onClick={() => router.push('/')}
                className="gradient-primary text-white font-semibold py-2 px-6 rounded-xl shadow-lg shadow-emerald hover:shadow-xl hover:shadow-emerald hover:-translate-y-0.5 transition-all"
              >
                Browse Markets
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPredictions.map((prediction) => (
              <div
                key={prediction.id}
                onClick={() => router.push(`/markets/${prediction.market?.id}`)}
                className="glass-dark p-6 rounded-xl border border-white/10 hover:border-primary-emerald/30 transition-all cursor-pointer"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2">
                      {prediction.market?.question || 'Unknown Market'}
                    </h3>
                    <p className="text-slate-gray text-sm mb-2">
                      Your prediction: <span className="text-primary-emerald font-medium">{prediction.outcome?.outcome_text}</span>
                    </p>
                    <p className="text-xs text-slate-gray">
                      {new Date(prediction.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-slate-gray text-xs mb-1">Staked</p>
                      <p className="text-white font-mono font-semibold">{prediction.stake_amount} pts</p>
                    </div>
                    
                    {prediction.paid_out && (
                      <div className="text-right">
                        <p className="text-slate-gray text-xs mb-1">Payout</p>
                        <p className={`font-mono font-bold ${
                          parseFloat(prediction.payout_amount) > parseFloat(prediction.stake_amount)
                            ? 'text-bright-lime'
                            : 'text-hot-coral'
                        }`}>
                          {prediction.payout_amount || 0} pts
                        </p>
                      </div>
                    )}
                    
                    <div>
                      {['live', 'approved', 'proposed'].includes(prediction.market?.status) ? (
                        <span className="px-3 py-1 bg-sunset-orange rounded-full text-white text-xs font-semibold uppercase">
                          Active
                        </span>
                      ) : prediction.paid_out ? (
                        parseFloat(prediction.payout_amount) > parseFloat(prediction.stake_amount) ? (
                          <span className="px-3 py-1 gradient-success rounded-full text-white text-xs font-semibold uppercase flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            Won
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-hot-coral rounded-full text-white text-xs font-semibold uppercase flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Lost
                          </span>
                        )
                      ) : (
                        <span className="px-3 py-1 bg-slate-gray rounded-full text-white text-xs font-semibold uppercase">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
