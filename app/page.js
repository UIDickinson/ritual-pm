'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import MarketCard from '@/components/MarketCard';
import { Loader2, TrendingUp, Search } from 'lucide-react';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('live');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchMarkets();
    }
  }, [user, activeTab]);

  const fetchMarkets = async () => {
    setLoading(true);
    try {
      const status = activeTab === 'all' ? '' : activeTab;
      const response = await fetch(`/api/markets${status ? `?status=${status}` : ''}`);
      const data = await response.json();
      setMarkets(data.markets || []);
    } catch (error) {
      console.error('Failed to fetch markets:', error);
    }
    setLoading(false);
  };

  const filteredMarkets = markets.filter(market => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      market.question?.toLowerCase().includes(query) ||
      market.description?.toLowerCase().includes(query) ||
      market.creator?.username?.toLowerCase().includes(query)
    );
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-charcoal to-deep-emerald flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary-emerald animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { id: 'live', label: 'Live', color: 'emerald' },
    { id: 'proposed', label: 'Proposed', color: 'orange' },
    { id: 'closed', label: 'Closed', color: 'gray' },
    { id: 'all', label: 'All', color: 'blue' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-charcoal to-deep-emerald">
      <Navigation />
      
      <main className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="glass-dark p-8 rounded-2xl border border-primary-emerald/20 mb-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold text-white mb-4">
              Welcome, <span className="text-primary-emerald">{user.username}</span>!
            </h1>
            <p className="text-slate-gray text-lg mb-6">
              Predict outcomes, earn points, and compete with the Ritual community.
            </p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-4 border border-primary-emerald/10">
                <p className="text-slate-gray text-sm mb-1">Your Balance</p>
                <p className="text-2xl font-bold text-bright-lime font-mono">
                  {user.points_balance} pts
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-primary-blue/10">
                <p className="text-slate-gray text-sm mb-1">Total Markets</p>
                <p className="text-2xl font-bold text-primary-blue font-mono">
                  {markets.length}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-sunset-orange/10">
                <p className="text-slate-gray text-sm mb-1">Live Markets</p>
                <p className="text-2xl font-bold text-sunset-orange font-mono">
                  {markets.filter(m => m.status === 'live').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6">
          <div className="glass-dark p-4 rounded-2xl border border-primary-emerald/20">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-gray" />
              <input
                type="text"
                placeholder="Search markets by question, description, or creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-slate-gray focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-gray hover:text-white text-sm"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="glass-dark p-2 rounded-2xl border border-primary-emerald/20 mb-6 inline-flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-6 py-2 rounded-xl font-medium text-sm transition-all
                ${activeTab === tab.id 
                  ? 'gradient-primary text-white shadow-md shadow-emerald' 
                  : 'text-slate-gray hover:text-white hover:bg-white/5'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Markets Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-12 h-12 text-primary-emerald animate-spin" />
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="text-center py-16">
            <div className="glass-dark inline-block px-8 py-6 rounded-2xl border border-primary-emerald/20">
              <TrendingUp className="w-12 h-12 text-primary-emerald mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                {searchQuery ? 'No Markets Found' : 'No Markets Yet'}
              </h2>
              <p className="text-slate-gray mb-4">
                {searchQuery 
                  ? 'Try adjusting your search query'
                  : 'Be the first to create a prediction market!'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => router.push('/create')}
                  className="gradient-primary text-white font-semibold py-2 px-6 rounded-xl shadow-lg shadow-emerald hover:shadow-xl hover:shadow-emerald hover:-translate-y-0.5 transition-all"
                >
                  Create Market
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {searchQuery && (
              <div className="mb-4 px-4">
                <p className="text-zinc-400 text-sm">
                  Found {filteredMarkets.length} market{filteredMarkets.length !== 1 ? 's' : ''} matching "{searchQuery}"
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMarkets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

