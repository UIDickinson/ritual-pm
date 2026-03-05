'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, XCircle, Edit3, ChevronDown, ChevronUp, 
  RefreshCw, Filter, ArrowLeft, Sparkles, Clock, AlertTriangle,
  Play, Square, Zap, Power
} from 'lucide-react';

const STATUS_COLORS = {
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/30',
  approved: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/30',
  edited: 'text-blue-400 bg-blue-400/10 border-blue-500/30',
  rejected: 'text-red-400 bg-red-400/10 border-red-500/30',
};

const STATUS_ICONS = {
  pending: Clock,
  approved: CheckCircle,
  edited: Edit3,
  rejected: XCircle,
};

export default function AdminProposals() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);

  // Pipeline control state
  const [pipelineEnabled, setPipelineEnabled] = useState(false);
  const [pipelineLastRun, setPipelineLastRun] = useState(null);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/');
      return;
    }
  }, [isAdmin, router]);

  // Fetch pipeline status
  const fetchPipelineStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai-pipeline');
      if (res.ok) {
        const data = await res.json();
        setPipelineEnabled(data.enabled);
        setPipelineLastRun(data.lastRun);
      }
    } catch (error) {
      console.error('Failed to fetch pipeline status:', error);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchPipelineStatus();
  }, [isAdmin, fetchPipelineStatus]);

  // Toggle pipeline on/off
  const handleTogglePipeline = async () => {
    setPipelineLoading(true);
    try {
      const res = await fetch('/api/admin/ai-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' }),
      });
      if (res.ok) {
        const data = await res.json();
        setPipelineEnabled(data.enabled);
      }
    } catch (error) {
      console.error('Failed to toggle pipeline:', error);
    } finally {
      setPipelineLoading(false);
    }
  };

  // Trigger a manual pipeline run
  const handleTriggerPipeline = async () => {
    setTriggerLoading(true);
    setTriggerResult(null);
    try {
      const res = await fetch('/api/admin/ai-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger' }),
      });
      const data = await res.json();
      setTriggerResult(data);
      // Refresh proposals and pipeline status after trigger
      await Promise.all([fetchProposals(), fetchPipelineStatus()]);
    } catch (error) {
      console.error('Failed to trigger pipeline:', error);
      setTriggerResult({ message: 'Pipeline trigger failed', errors: [error.message] });
    } finally {
      setTriggerLoading(false);
    }
  };

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter
        ? `/api/admin/proposals?status=${statusFilter}`
        : '/api/admin/proposals';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProposals(data.proposals || []);
      }
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (isAdmin) fetchProposals();
  }, [isAdmin, fetchProposals]);

  const handleAction = async (proposalId, action, extra = {}) => {
    setActionLoading(proposalId);
    try {
      const res = await fetch(`/api/admin/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.ok) {
        setEditingId(null);
        setRejectingId(null);
        setRejectionReason('');
        await fetchProposals();
      } else {
        const err = await res.json();
        alert(err.error || 'Action failed');
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const startEdit = (proposal) => {
    setEditingId(proposal.id);
    setEditForm({
      title: proposal.title || '',
      description: proposal.description || '',
      outcomes: proposal.outcomes || ['Yes', 'No'],
      resolutionCriteria: proposal.resolution_criteria || '',
      resolutionDate: proposal.resolution_date ? proposal.resolution_date.split('T')[0] : '',
      categories: proposal.categories || [],
    });
  };

  const counts = {
    all: proposals.length,
    pending: proposals.filter(p => p.status === 'pending').length,
    approved: proposals.filter(p => p.status === 'approved').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="p-2 glass-dark rounded-xl hover:bg-zinc-800 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-emerald-400" />
              AI Proposals
            </h1>
            <p className="text-zinc-400 mt-1">Review and manage AI-generated market proposals</p>
          </div>
          <button
            onClick={fetchProposals}
            className="ml-auto p-3 glass-dark rounded-xl hover:bg-emerald-500/10 transition-all"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Pipeline Control Panel */}
        <div className="glass-dark rounded-2xl border border-zinc-800 p-5 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {/* Pipeline toggle */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTogglePipeline}
                  disabled={pipelineLoading}
                  className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    pipelineEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
                  } ${pipelineLoading ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                      pipelineEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
                <div>
                  <p className={`text-sm font-semibold ${pipelineEnabled ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {pipelineEnabled ? 'Pipeline Active' : 'Pipeline Paused'}
                  </p>
                  {pipelineLastRun && (
                    <p className="text-xs text-zinc-600">
                      Last run: {new Date(pipelineLastRun).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Trigger button */}
            <button
              onClick={handleTriggerPipeline}
              disabled={triggerLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-xl font-medium hover:bg-purple-500/20 transition-all disabled:opacity-50"
            >
              {triggerLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running Pipeline...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Run Now
                </>
              )}
            </button>
          </div>

          {/* Trigger result banner */}
          {triggerResult && (
            <div className={`mt-4 p-3 rounded-xl border text-sm ${
              triggerResult.errors?.length
                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{triggerResult.message}</p>
                  {triggerResult.fetched > 0 && (
                    <p className="text-xs mt-1 opacity-80">
                      {triggerResult.fetched} posts fetched → {triggerResult.topics} topics → {triggerResult.proposals} proposals
                    </p>
                  )}
                  {triggerResult.errors?.length > 0 && (
                    <p className="text-xs mt-1 opacity-70">
                      {triggerResult.errors.join('; ')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setTriggerResult(null)}
                  className="text-current opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', count: counts.all, color: 'text-zinc-300' },
            { label: 'Pending', count: counts.pending, color: 'text-yellow-400' },
            { label: 'Approved', count: counts.approved, color: 'text-emerald-400' },
            { label: 'Rejected', count: counts.rejected, color: 'text-red-400' },
          ].map(stat => (
            <div key={stat.label} className="glass-dark p-4 rounded-xl border border-zinc-800">
              <span className={`text-2xl font-bold ${stat.color}`}>{stat.count}</span>
              <p className="text-zinc-500 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { value: '', label: 'All' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'edited', label: 'Edited' },
            { value: 'rejected', label: 'Rejected' },
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                statusFilter === filter.value
                  ? 'gradient-primary text-white shadow-lg shadow-emerald-500/20'
                  : 'glass-dark text-zinc-400 hover:text-white'
              }`}
            >
              <Filter className="w-4 h-4 inline-block mr-1.5" />
              {filter.label}
            </button>
          ))}
        </div>

        {/* Proposals List */}
        {loading ? (
          <div className="text-center py-20">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Loading proposals...</p>
          </div>
        ) : proposals.length === 0 ? (
          <div className="text-center py-20 glass-dark rounded-2xl border border-zinc-800">
            <Sparkles className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 text-lg">No proposals found</p>
            <p className="text-zinc-600 text-sm mt-1">
              {statusFilter ? 'Try a different filter' : 'AI pipeline has not generated proposals yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map(proposal => {
              const StatusIcon = STATUS_ICONS[proposal.status] || Clock;
              const isExpanded = expandedId === proposal.id;
              const isEditing = editingId === proposal.id;
              const isRejecting = rejectingId === proposal.id;

              return (
                <div
                  key={proposal.id}
                  className="glass-dark rounded-2xl border border-zinc-800 overflow-hidden"
                >
                  {/* Proposal Header */}
                  <div
                    className="p-5 cursor-pointer hover:bg-zinc-800/30 transition-all"
                    onClick={() => setExpandedId(isExpanded ? null : proposal.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${STATUS_COLORS[proposal.status] || 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
                            <StatusIcon className="w-3 h-3" />
                            {proposal.status}
                          </span>
                          {proposal.generated_by && (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
                              {proposal.generated_by}
                            </span>
                          )}
                          {proposal.ai_confidence != null && (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
                              {(proposal.ai_confidence * 100).toFixed(0)}% confidence
                            </span>
                          )}
                          {(proposal.categories || []).map(cat => (
                            <span key={cat} className="px-2.5 py-1 rounded-lg text-xs bg-zinc-800 text-zinc-400 border border-zinc-700">
                              {cat}
                            </span>
                          ))}
                        </div>
                        <h3 className="text-lg font-semibold text-white truncate">{proposal.title}</h3>
                        <p className="text-zinc-400 text-sm mt-1 line-clamp-2">{proposal.description}</p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {proposal.engagement_score != null && (
                          <span className="text-sm text-zinc-500">
                            Score: {(proposal.engagement_score * 100).toFixed(0)}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-zinc-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-zinc-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-zinc-800 p-5 space-y-4">
                      {/* Topic Source Info */}
                      {proposal.topic && (
                        <div className="glass-dark p-4 rounded-xl border border-zinc-700">
                          <h4 className="text-sm font-semibold text-zinc-300 mb-2">Source Topic</h4>
                          <p className="text-sm text-white font-medium">{proposal.topic.label}</p>
                          <p className="text-sm text-zinc-400 mt-1">{proposal.topic.summary}</p>
                          <div className="flex gap-3 mt-2 text-xs text-zinc-500">
                            <span>Status: {proposal.topic.status}</span>
                            {proposal.topic.engagement_score != null && (
                              <span>Engagement: {(proposal.topic.engagement_score * 100).toFixed(0)}</span>
                            )}
                            {proposal.topic.source_breakdown && (
                              <span>Sources: {Object.keys(proposal.topic.source_breakdown).join(', ')}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Proposal Details */}
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm text-zinc-400 block mb-1">Title</label>
                            <input
                              type="text"
                              value={editForm.title}
                              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-zinc-400 block mb-1">Description</label>
                            <textarea
                              value={editForm.description}
                              onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                              rows={3}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none resize-none"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm text-zinc-400 block mb-1">Resolution Date</label>
                              <input
                                type="date"
                                value={editForm.resolutionDate}
                                onChange={e => setEditForm({ ...editForm, resolutionDate: e.target.value })}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-sm text-zinc-400 block mb-1">Outcomes</label>
                              <input
                                type="text"
                                value={(editForm.outcomes || []).join(', ')}
                                onChange={e => setEditForm({ ...editForm, outcomes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                                placeholder="Yes, No"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm text-zinc-400 block mb-1">Resolution Criteria</label>
                            <textarea
                              value={editForm.resolutionCriteria}
                              onChange={e => setEditForm({ ...editForm, resolutionCriteria: e.target.value })}
                              rows={2}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none resize-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(proposal.id, 'edit_approve', { edits: editForm })}
                              disabled={actionLoading === proposal.id}
                              className="px-5 py-2.5 gradient-primary text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50"
                            >
                              Save & Approve
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-5 py-2.5 glass-dark text-zinc-400 rounded-xl hover:text-white transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-sm">
                          <div className="flex gap-2">
                            <span className="text-zinc-500 w-32 flex-shrink-0">Outcomes:</span>
                            <span className="text-white">{(proposal.outcomes || []).join(', ')}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-zinc-500 w-32 flex-shrink-0">Resolution:</span>
                            <span className="text-white">{proposal.resolution_criteria}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-zinc-500 w-32 flex-shrink-0">Resolution Date:</span>
                            <span className="text-white">
                              {proposal.resolution_date && new Date(proposal.resolution_date).toLocaleDateString()}
                            </span>
                          </div>
                          {proposal.reviewer && (
                            <div className="flex gap-2">
                              <span className="text-zinc-500 w-32 flex-shrink-0">Reviewed By:</span>
                              <span className="text-white">{proposal.reviewer.username}</span>
                            </div>
                          )}
                          {proposal.rejection_reason && (
                            <div className="flex gap-2">
                              <span className="text-zinc-500 w-32 flex-shrink-0">Rejection:</span>
                              <span className="text-red-400">{proposal.rejection_reason}</span>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <span className="text-zinc-500 w-32 flex-shrink-0">Created:</span>
                            <span className="text-white">
                              {new Date(proposal.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Rejection input */}
                      {isRejecting && (
                        <div className="glass-dark p-4 rounded-xl border border-red-500/30 space-y-3">
                          <label className="text-sm text-red-400 block font-medium">Rejection Reason</label>
                          <textarea
                            value={rejectionReason}
                            onChange={e => setRejectionReason(e.target.value)}
                            rows={2}
                            placeholder="Why is this proposal being rejected?"
                            className="w-full bg-zinc-900 border border-red-500/30 rounded-xl px-4 py-2.5 text-white focus:border-red-500 focus:outline-none resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(proposal.id, 'reject', { rejectionReason })}
                              disabled={actionLoading === proposal.id || rejectionReason.trim().length < 3}
                              className="px-5 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-medium hover:bg-red-500/30 transition-all disabled:opacity-50"
                            >
                              Confirm Reject
                            </button>
                            <button
                              onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                              className="px-5 py-2.5 glass-dark text-zinc-400 rounded-xl hover:text-white transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {proposal.status === 'pending' && !isEditing && !isRejecting && (
                        <div className="flex gap-2 pt-2 border-t border-zinc-800">
                          <button
                            onClick={() => handleAction(proposal.id, 'approve')}
                            disabled={actionLoading === proposal.id}
                            className="px-5 py-2.5 gradient-primary text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => startEdit(proposal)}
                            className="px-5 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-xl font-medium hover:bg-blue-500/20 transition-all flex items-center gap-2"
                          >
                            <Edit3 className="w-4 h-4" />
                            Edit & Approve
                          </button>
                          <button
                            onClick={() => setRejectingId(proposal.id)}
                            className="px-5 py-2.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-xl font-medium hover:bg-red-500/20 transition-all flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
