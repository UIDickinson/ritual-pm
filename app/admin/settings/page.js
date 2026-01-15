'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings, Save, Info } from 'lucide-react';

export default function PlatformSettings() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/');
      return;
    }
    fetchSettings();
  }, [isAdmin, router]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!confirm('Are you sure you want to update platform settings? This will affect all users.')) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          settings: {
            required_approval_votes: settings.required_approval_votes,
            approval_deadline_hours: settings.approval_deadline_hours,
            dispute_window_hours: settings.dispute_window_hours,
            platform_fee_percentage: settings.platform_fee_percentage,
            starting_balance: settings.starting_balance
          }
        })
      });

      if (res.ok) {
        alert('Settings updated successfully!');
      } else {
        const error = await res.json();
        alert(`Failed to update settings: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      alert('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-emerald-950/20 to-zinc-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

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

        <div className="glass-dark p-8 rounded-3xl border border-emerald-500/20">
          <div className="flex items-start gap-4 mb-8">
            <div className="p-3 bg-emerald-500/20 rounded-2xl">
              <Settings className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">Platform Settings</h1>
              <p className="text-zinc-400">Configure global platform parameters</p>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl mb-8">
            <Info className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-400 font-medium mb-1">Important</p>
              <p className="text-orange-300/80 text-sm">
                Changes to these settings will affect all future markets and new users. 
                Existing markets will not be affected by these changes.
              </p>
            </div>
          </div>

          {/* Settings Form */}
          <div className="space-y-6">
            {/* Approval Votes */}
            <div className="glass-dark p-6 rounded-2xl">
              <label className="block text-white font-bold text-lg mb-2">
                Required Approval Votes
              </label>
              <p className="text-zinc-400 text-sm mb-4">
                Number of community approvals needed for a proposed market to be activated
              </p>
              <input
                type="number"
                min="1"
                max="50"
                value={settings?.required_approval_votes || 10}
                onChange={(e) => updateSetting('required_approval_votes', parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-black/40 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="text-zinc-500 text-xs mt-2">Current: {settings?.required_approval_votes} votes</p>
            </div>

            {/* Approval Deadline */}
            <div className="glass-dark p-6 rounded-2xl">
              <label className="block text-white font-bold text-lg mb-2">
                Approval Deadline (Hours)
              </label>
              <p className="text-zinc-400 text-sm mb-4">
                Time window for community to approve proposed markets before they expire
              </p>
              <input
                type="number"
                min="1"
                max="168"
                value={settings?.approval_deadline_hours || 15}
                onChange={(e) => updateSetting('approval_deadline_hours', parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-black/40 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="text-zinc-500 text-xs mt-2">Current: {settings?.approval_deadline_hours} hours</p>
            </div>

            {/* Dispute Window */}
            <div className="glass-dark p-6 rounded-2xl">
              <label className="block text-white font-bold text-lg mb-2">
                Dispute Window (Hours)
              </label>
              <p className="text-zinc-400 text-sm mb-4">
                Time window after resolution during which users can dispute the outcome
              </p>
              <input
                type="number"
                min="1"
                max="168"
                value={settings?.dispute_window_hours || 24}
                onChange={(e) => updateSetting('dispute_window_hours', parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-black/40 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="text-zinc-500 text-xs mt-2">Current: {settings?.dispute_window_hours} hours</p>
            </div>

            {/* Platform Fee */}
            <div className="glass-dark p-6 rounded-2xl">
              <label className="block text-white font-bold text-lg mb-2">
                Platform Fee (%)
              </label>
              <p className="text-zinc-400 text-sm mb-4">
                Percentage fee deducted from each prediction (decimal value, e.g., 1.0 for 1%)
              </p>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={settings?.platform_fee_percentage || 1}
                onChange={(e) => updateSetting('platform_fee_percentage', parseFloat(e.target.value))}
                className="w-full px-4 py-3 bg-black/40 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="text-zinc-500 text-xs mt-2">Current: {settings?.platform_fee_percentage}%</p>
            </div>

            {/* Starting Balance */}
            <div className="glass-dark p-6 rounded-2xl">
              <label className="block text-white font-bold text-lg mb-2">
                Starting Balance (Points)
              </label>
              <p className="text-zinc-400 text-sm mb-4">
                Initial point balance given to new users when they register
              </p>
              <input
                type="number"
                min="0"
                step="1"
                value={settings?.starting_balance || 100}
                onChange={(e) => updateSetting('starting_balance', parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-black/40 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="text-zinc-500 text-xs mt-2">Current: {settings?.starting_balance} pts</p>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-8 py-4 rounded-xl font-bold text-lg gradient-primary hover:shadow-2xl hover:shadow-emerald-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
