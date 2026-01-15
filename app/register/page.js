'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, UserPlus, User, Lock } from 'lucide-react';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Validate username
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setLoading(true);

    const result = await register(username, password);

    if (result.success) {
      router.push('/');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-charcoal to-deep-emerald p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-emerald/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-bright-lime/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black mb-4 shadow-lg">
            <Image 
              src="/logo.png" 
              alt="Ritual Logo" 
              width={64} 
              height={64}
              className="w-16 h-16"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Join Ritual
          </h1>
          <p className="text-slate-gray">
            Create your account and start predicting
          </p>
        </div>

        {/* Register Form */}
        <div className="glass-dark p-8 rounded-2xl shadow-xl border border-primary-emerald/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Input */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-light-emerald mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-gray" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-gray focus:outline-none focus:border-primary-emerald focus:ring-2 focus:ring-primary-emerald/20 transition-all"
                  placeholder="Choose a username"
                  required
                  autoComplete="username"
                  minLength={3}
                  maxLength={50}
                />
              </div>
              <p className="mt-1 text-xs text-slate-gray">
                3-50 characters, letters and numbers only
              </p>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-light-emerald mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-gray" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-gray focus:outline-none focus:border-primary-emerald focus:ring-2 focus:ring-primary-emerald/20 transition-all"
                  placeholder="Create a password"
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-light-emerald mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-gray" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-gray focus:outline-none focus:border-primary-emerald focus:ring-2 focus:ring-primary-emerald/20 transition-all"
                  placeholder="Confirm your password"
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-hot-coral/10 border border-hot-coral/30 rounded-xl p-3 text-hot-coral text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-emerald hover:shadow-xl hover:shadow-emerald hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-slate-gray text-sm">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-primary-emerald hover:text-light-emerald font-semibold transition-colors"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>

        {/* Welcome Bonus Info */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-emerald/10 border border-primary-emerald/30 rounded-xl px-4 py-2">
            <span className="text-bright-lime text-2xl">🎁</span>
            <span className="text-white text-sm font-medium">
              Get <span className="text-bright-lime font-bold">10 points</span> to start!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
