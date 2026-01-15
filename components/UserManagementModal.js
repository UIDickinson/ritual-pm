'use client';

import { useState } from 'react';
import { X, UserCircle, DollarSign, Shield } from 'lucide-react';

export default function UserManagementModal({ user, onClose, onUpdate, adminUserId }) {
  const [action, setAction] = useState('');
  const [newBalance, setNewBalance] = useState(user.points_balance || 0);
  const [newRole, setNewRole] = useState(user.role);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!action) {
      alert('Please select an action');
      return;
    }

    if (action === 'update_balance' && newBalance < 0) {
      alert('Balance cannot be negative');
      return;
    }

    if (!confirm(`Are you sure you want to ${action === 'update_balance' ? 'update balance' : 'change role'} for ${user.username}?`)) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: adminUserId,
          targetUserId: user.id,
          action,
          value: action === 'update_balance' ? parseFloat(newBalance) : newRole
        })
      });

      if (res.ok) {
        alert('User updated successfully');
        onUpdate();
        onClose();
      } else {
        const error = await res.json();
        alert(`Failed to update user: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-light rounded-3xl border border-emerald-500/20 max-w-lg w-full shadow-2xl">
        <div className="p-6 border-b border-zinc-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Manage User</h3>
                <p className="text-zinc-400 text-sm">{user.username}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Current Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="glass-dark p-4 rounded-xl">
              <p className="text-zinc-500 text-xs mb-1">Current Balance</p>
              <p className="text-white font-bold text-lg">{parseFloat(user.points_balance || 0).toFixed(0)} pts</p>
            </div>
            <div className="glass-dark p-4 rounded-xl">
              <p className="text-zinc-500 text-xs mb-1">Current Role</p>
              <p className="text-white font-bold text-lg capitalize">{user.role}</p>
            </div>
          </div>

          {/* Action Selection */}
          <div className="mb-6">
            <label className="block text-white font-medium mb-3">Select Action</label>
            <div className="space-y-3">
              <button
                onClick={() => setAction('update_balance')}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  action === 'update_balance'
                    ? 'border-emerald-500 bg-emerald-500/20'
                    : 'border-zinc-700 hover:border-emerald-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-white font-medium">Update Balance</p>
                    <p className="text-zinc-400 text-sm">Adjust user's point balance</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setAction('update_role')}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  action === 'update_role'
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-zinc-700 hover:border-blue-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">Change Role</p>
                    <p className="text-zinc-400 text-sm">Modify user's permission level</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Update Balance Form */}
          {action === 'update_balance' && (
            <div className="mb-6 p-4 glass-dark rounded-xl border border-emerald-500/20">
              <label className="block text-white font-medium mb-2">New Balance</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  min="0"
                  step="1"
                  className="flex-1 px-4 py-3 bg-black/40 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <span className="text-zinc-400 font-medium">pts</span>
              </div>
              <p className="text-zinc-500 text-xs mt-2">
                Current: {parseFloat(user.points_balance || 0).toFixed(0)} pts • 
                Change: {(parseFloat(newBalance) - parseFloat(user.points_balance || 0)) > 0 ? '+' : ''}{(parseFloat(newBalance) - parseFloat(user.points_balance || 0)).toFixed(0)} pts
              </p>
            </div>
          )}

          {/* Update Role Form */}
          {action === 'update_role' && (
            <div className="mb-6 p-4 glass-dark rounded-xl border border-blue-500/20">
              <label className="block text-white font-medium mb-2">New Role</label>
              <div className="space-y-2">
                {['admin', 'member', 'viewer'].map(role => (
                  <button
                    key={role}
                    onClick={() => setNewRole(role)}
                    className={`w-full p-3 rounded-lg border transition-all text-left ${
                      newRole === role
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-zinc-700 hover:border-blue-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium capitalize">{role}</span>
                      {role === user.role && (
                        <span className="px-2 py-1 bg-zinc-700 text-zinc-400 text-xs rounded">Current</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-zinc-500 text-xs mt-3">
                <strong>Admin:</strong> Full platform control • 
                <strong>Member:</strong> Create & predict • 
                <strong>Viewer:</strong> View only
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-6 py-3 glass-dark rounded-xl text-white font-medium hover:bg-white/5 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!action || submitting}
              className="flex-1 px-6 py-3 gradient-primary rounded-xl text-white font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
