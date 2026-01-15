'use client';

import { useRouter } from 'next/navigation';
import { Clock, Users, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

export default function MarketCard({ market }) {
  const router = useRouter();

  const getStatusBadge = () => {
    const badges = {
      live: {
        bg: 'gradient-primary',
        text: 'Live',
        icon: <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
      },
      proposed: {
        bg: 'bg-sunset-orange',
        text: 'Proposed',
        icon: <Clock className="w-3 h-3" />
      },
      approved: {
        bg: 'bg-primary-blue',
        text: 'Approved',
        icon: <CheckCircle className="w-3 h-3" />
      },
      closed: {
        bg: 'bg-slate-gray',
        text: 'Closed',
        icon: <Clock className="w-3 h-3" />
      },
      resolved: {
        bg: 'gradient-success',
        text: 'Resolved',
        icon: <CheckCircle className="w-3 h-3" />
      },
      disputed: {
        bg: 'gradient-alert',
        text: 'Disputed',
        icon: <AlertCircle className="w-3 h-3" />
      },
      final: {
        bg: 'gradient-primary',
        text: 'Final',
        icon: <CheckCircle className="w-3 h-3" />
      }
    };

    const badge = badges[market.status] || badges.proposed;

    return (
      <div className={`absolute top-3 left-3 ${badge.bg} px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg`}>
        {badge.icon}
        <span className="text-white text-xs font-semibold uppercase">{badge.text}</span>
      </div>
    );
  };

  const getTimeRemaining = () => {
    if (!market.close_time) return null;
    
    const now = new Date();
    const closeTime = new Date(market.close_time);
    const diff = closeTime - now;
    
    if (diff < 0) return 'Closed';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes}m`;
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
    <div
      onClick={() => router.push(`/markets/${market.id}`)}
      className="glass-dark p-5 rounded-2xl border border-primary-emerald/20 hover:border-primary-emerald/40 hover:-translate-y-2 hover:shadow-xl hover:shadow-emerald/20 transition-all duration-300 cursor-pointer relative group"
    >
      {/* Status Badge */}
      {getStatusBadge()}

      {/* Time Remaining */}
      {market.status === 'live' && (
        <div className="absolute top-3 right-3 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-sunset-orange" />
          <span className="text-white text-xs font-medium">{getTimeRemaining()}</span>
        </div>
      )}

      {/* Content */}
      <div className="mt-8">
        {/* Question */}
        <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2 group-hover:text-light-emerald transition-colors">
          {market.question}
        </h3>

        {/* Creator */}
        <p className="text-slate-gray text-xs mb-4">
          by {market.creator?.username || 'Unknown'}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-bright-lime" />
            <span className="text-white font-mono font-semibold">{market.total_pool || 0}</span>
            <span className="text-slate-gray">pts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary-blue" />
            <span className="text-white font-mono">{market.predictions_count || 0}</span>
          </div>
        </div>

        {/* Outcomes Preview */}
        <div className="space-y-2">
          {market.outcomes?.slice(0, 3).map((outcome, index) => {
            const percentage = calculatePercentage(outcome.total_staked);
            
            return (
              <div key={outcome.id} className="relative">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white text-sm truncate flex-1 mr-2">
                    {outcome.outcome_text}
                  </span>
                  <span className="text-bright-lime text-sm font-mono font-semibold">
                    {percentage}%
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${getOutcomeColor(index)} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
          
          {market.outcomes?.length > 3 && (
            <p className="text-slate-gray text-xs text-center pt-1">
              +{market.outcomes.length - 3} more
            </p>
          )}
        </div>

        {/* Approval Votes (for proposed markets) */}
        {market.status === 'proposed' && market.approval_votes && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-gray">Approval Votes</span>
              <span className="text-white font-semibold">
                {market.approval_votes.approve} / 10
              </span>
            </div>
            <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-emerald to-bright-lime"
                style={{ width: `${Math.min((market.approval_votes.approve / 10) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
