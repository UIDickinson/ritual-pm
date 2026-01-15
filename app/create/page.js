'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { Plus, X, Loader2, Calendar, HelpCircle } from 'lucide-react';

export default function CreateMarketPage() {
  const { user, isAuthenticated, isMember } = useAuth();
  const router = useRouter();
  
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [outcomes, setOutcomes] = useState(['', '']);
  const [closeTime, setCloseTime] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated || !isMember) {
    router.push('/login');
    return null;
  }

  const addOutcome = () => {
    if (outcomes.length < 5) {
      setOutcomes([...outcomes, '']);
    }
  };

  const removeOutcome = (index) => {
    if (outcomes.length > 2) {
      setOutcomes(outcomes.filter((_, i) => i !== index));
    }
  };

  const updateOutcome = (index, value) => {
    const newOutcomes = [...outcomes];
    newOutcomes[index] = value;
    setOutcomes(newOutcomes);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!question.trim()) {
      setError('Question is required');
      return;
    }

    const validOutcomes = outcomes.filter(o => o.trim());
    if (validOutcomes.length < 2) {
      setError('At least 2 outcomes are required');
      return;
    }

    if (!closeTime) {
      setError('Close time is required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          question: question.trim(),
          description: description.trim() || null,
          outcomes: validOutcomes,
          closeTime
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create market');
      }

      router.push(`/markets/${data.market.id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-charcoal to-deep-emerald">
      <Navigation />
      
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Create Prediction Market
          </h1>
          <p className="text-slate-gray text-lg">
            Propose a market for community approval (requires 10 votes)
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-dark p-8 rounded-2xl border border-primary-emerald/20">
          {/* Question */}
          <div className="mb-6">
            <label htmlFor="question" className="block text-sm font-medium text-light-emerald mb-2">
              Market Question *
            </label>
            <input
              id="question"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-gray focus:outline-none focus:border-primary-emerald focus:ring-2 focus:ring-primary-emerald/20 transition-all"
              placeholder="Will ETH reach $5000 by end of February 2026?"
              required
            />
            <p className="mt-1 text-xs text-slate-gray">
              Be clear and specific. Avoid ambiguous questions.
            </p>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-light-emerald mb-2 flex items-center gap-2">
              Description (Optional)
              <HelpCircle className="w-4 h-4 text-slate-gray" />
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-gray focus:outline-none focus:border-primary-emerald focus:ring-2 focus:ring-primary-emerald/20 transition-all resize-vertical"
              placeholder="Add context, resolution criteria, or sources..."
            />
          </div>

          {/* Outcomes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-light-emerald mb-3">
              Outcomes * (2-5 options)
            </label>
            <div className="space-y-3">
              {outcomes.map((outcome, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-shrink-0 w-8 h-10 flex items-center justify-center text-slate-gray font-mono text-sm">
                    {index + 1}.
                  </div>
                  <input
                    type="text"
                    value={outcome}
                    onChange={(e) => updateOutcome(index, e.target.value)}
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-gray focus:outline-none focus:border-primary-emerald focus:ring-2 focus:ring-primary-emerald/20 transition-all"
                    placeholder={`Outcome ${index + 1}`}
                    required
                  />
                  {outcomes.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOutcome(index)}
                      className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-hot-coral hover:bg-hot-coral/10 transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {outcomes.length < 5 && (
              <button
                type="button"
                onClick={addOutcome}
                className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl border border-primary-emerald/30 text-primary-emerald hover:bg-primary-emerald/10 transition-all text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Outcome
              </button>
            )}
          </div>

          {/* Close Time */}
          <div className="mb-6">
            <label htmlFor="closeTime" className="block text-sm font-medium text-light-emerald mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Market Close Time *
            </label>
            <input
              id="closeTime"
              type="datetime-local"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-emerald focus:ring-2 focus:ring-primary-emerald/20 transition-all"
              required
              min={new Date().toISOString().slice(0, 16)}
            />
            <p className="mt-1 text-xs text-slate-gray">
              No more predictions can be placed after this time
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 bg-hot-coral/10 border border-hot-coral/30 rounded-xl p-3 text-hot-coral text-sm">
              {error}
            </div>
          )}

          {/* Info Box */}
          <div className="mb-6 bg-primary-blue/10 border border-primary-blue/30 rounded-xl p-4">
            <h3 className="text-primary-blue font-semibold mb-2 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Approval Process
            </h3>
            <ul className="text-slate-gray text-sm space-y-1">
              <li>• Your market will enter a 15-hour approval voting period</li>
              <li>• Requires minimum 10 community approval votes</li>
              <li>• Admins can activate or veto at any time</li>
              <li>• Once approved and activated, predictions can begin</li>
            </ul>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 gradient-primary text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-emerald hover:shadow-xl hover:shadow-emerald hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Market
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
