import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Kanban, Plus, Search, Filter, RefreshCw, MoreVertical,
  DollarSign, CheckCircle2, XCircle, Clock, Trash2, Edit3, Eye,
  X, ChevronRight, ArrowRight, User, Users, Building2,
  Calendar, Tag, Layers, Settings, Sparkles, TrendingUp,
  AlertCircle, Check, MessageSquare, Phone, Mail, Award,
  Sliders, HelpCircle, GripVertical
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function DealsPage() {
  const { user } = useAuth();

  // ── States ──────────────────────────────────────────────────
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState('');
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState({
    totalPipelineValue: 0,
    weightedPipelineValue: 0,
    openDealsCount: 0,
    wonDealsCount: 0,
    wonDealsValue: 0,
    winRate: 0
  });

  const [usersList, setUsersList] = useState([]);
  const [customersList, setCustomersList] = useState([]);

  // Views & Filters
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals & Drawers
  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [viewingDeal, setViewingDeal] = useState(null);
  const [dealNotes, setDealNotes] = useState([]);
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState('note');

  // Win/Loss prompt modal
  const [winLossModalData, setWinLossModalData] = useState(null); // { deal, targetStage }
  const [winLossReasonInput, setWinLossReasonInput] = useState('');

  // Pipeline Manager Modal
  const [showPipelineManagerModal, setShowPipelineManagerModal] = useState(false);

  // Drag-and-drop drag over tracking
  const [draggedDealId, setDraggedDealId] = useState(null);
  const [dragOverStageId, setDragOverStageId] = useState(null);

  // Notifications
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ── Fetch Pipelines ─────────────────────────────────────────
  const fetchPipelines = async () => {
    try {
      const res = await api.get('/pipelines');
      if (res.data && res.data.length > 0) {
        setPipelines(res.data);
        if (!selectedPipelineId) {
          const defaultPipe = res.data.find((p) => p.isDefault) || res.data[0];
          setSelectedPipelineId(defaultPipe._id);
        }
      }
    } catch (err) {
      console.error('Failed to load pipelines', err);
    }
  };

  const fetchUsersAndCustomers = async () => {
    try {
      const [uRes, cRes] = await Promise.all([
        api.get('/users?limit=100'),
        api.get('/customers?limit=100&isActive=true')
      ]);
      if (uRes.data?.users) setUsersList(uRes.data.users);
      else if (Array.isArray(uRes.data)) setUsersList(uRes.data);

      if (cRes.data?.customers) setCustomersList(cRes.data.customers);
      else if (Array.isArray(cRes.data)) setCustomersList(cRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const url = selectedPipelineId ? `/deals/stats?pipelineId=${selectedPipelineId}` : '/deals/stats';
      const res = await api.get(url);
      if (res.data) setStats(res.data);
    } catch (err) {
      console.error('Failed to load deal stats', err);
    }
  };

  const fetchDeals = useCallback(async () => {
    if (!selectedPipelineId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('pipelineId', selectedPipelineId);
      if (search) params.append('search', search);
      if (assigneeFilter) params.append('assignedTo', assigneeFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const res = await api.get(`/deals?${params.toString()}`);
      if (res.data) {
        setDeals(res.data.deals || []);
      }
    } catch (err) {
      showToast(err.customMessage || 'Failed to load deals', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPipelineId, search, assigneeFilter, statusFilter]);

  useEffect(() => {
    fetchPipelines();
    fetchUsersAndCustomers();
  }, []);

  useEffect(() => {
    if (selectedPipelineId) {
      fetchDeals();
      fetchStats();
    }
  }, [selectedPipelineId, fetchDeals]);

  const currentPipeline = pipelines.find((p) => p._id === selectedPipelineId) || pipelines[0];

  // ── Drag and Drop Handlers ──────────────────────────────────
  const handleDragStart = (e, dealId) => {
    e.dataTransfer.setData('text/plain', dealId);
    setDraggedDealId(dealId);
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    setDragOverStageId(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStageId(null);
  };

  const handleDrop = async (e, targetStageId) => {
    e.preventDefault();
    setDragOverStageId(null);
    const dealId = e.dataTransfer.getData('text/plain') || draggedDealId;
    setDraggedDealId(null);

    if (!dealId || !currentPipeline) return;

    const deal = deals.find((d) => d._id === dealId);
    if (!deal || deal.stageId === targetStageId) return;

    const targetStage = currentPipeline.stages.find((s) => s._id === targetStageId);
    if (!targetStage) return;

    // If moving to Won or Lost stage, trigger reason modal
    if (targetStage.isWon || targetStage.isLost) {
      setWinLossModalData({ deal, targetStage });
      setWinLossReasonInput('');
      return;
    }

    // Direct stage move
    try {
      // Optimistic update
      setDeals((prev) =>
        prev.map((d) => (d._id === dealId ? { ...d, stageId: targetStageId, probability: targetStage.probability } : d))
      );
      await api.patch(`/deals/${dealId}/stage`, { stageId: targetStageId });
      showToast(`Deal moved to "${targetStage.name}"`);
      fetchDeals();
      fetchStats();
    } catch (err) {
      showToast(err.customMessage || 'Failed to move deal', 'error');
      fetchDeals();
    }
  };

  // Confirm Win / Loss move with reason
  const handleConfirmWinLoss = async () => {
    if (!winLossModalData) return;
    const { deal, targetStage } = winLossModalData;
    try {
      await api.patch(`/deals/${deal._id}/stage`, {
        stageId: targetStage._id,
        winLossReason: winLossReasonInput.trim()
      });
      showToast(`Deal marked as ${targetStage.isWon ? 'Won 🎉' : 'Lost'}`);
      setWinLossModalData(null);
      fetchDeals();
      fetchStats();
    } catch (err) {
      showToast(err.customMessage || 'Failed to update deal', 'error');
    }
  };

  // ── Open Deal Detail Drawer ─────────────────────────────────
  const openDealDetail = async (deal) => {
    try {
      const res = await api.get(`/deals/${deal._id}`);
      setViewingDeal(res.data?.deal || deal);
      setDealNotes(res.data?.notes || []);
    } catch (err) {
      setViewingDeal(deal);
    }
  };

  const reloadDealNotes = async (dealId) => {
    try {
      const res = await api.get(`/deals/${dealId}/notes`);
      if (res.data) setDealNotes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDealNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim() || !viewingDeal) return;
    try {
      await api.post(`/deals/${viewingDeal._id}/notes`, {
        content: noteContent,
        type: noteType
      });
      setNoteContent('');
      showToast('Activity logged');
      await reloadDealNotes(viewingDeal._id);
    } catch (err) {
      showToast(err.customMessage || 'Failed to add activity', 'error');
    }
  };

  const handleDeleteDealNote = async (nid) => {
    try {
      await api.delete(`/deals/${viewingDeal._id}/notes/${nid}`);
      showToast('Note deleted');
      await reloadDealNotes(viewingDeal._id);
    } catch (err) {
      showToast(err.customMessage || 'Failed to delete note', 'error');
    }
  };

  const handleDeleteDeal = async (dealId, e) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to archive this deal?')) return;
    try {
      await api.delete(`/deals/${dealId}`);
      showToast('Deal archived');
      if (viewingDeal?._id === dealId) setViewingDeal(null);
      fetchDeals();
      fetchStats();
    } catch (err) {
      showToast(err.customMessage || 'Failed to delete deal', 'error');
    }
  };

  return (
    <div className="page-container" style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 20px',
            borderRadius: 10,
            background: notification.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {notification.message}
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8'
              }}
            >
              <Kanban size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Sales Pipelines & Deal Kanban
              </h1>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13.5 }}>
                Manage multiple sales pipelines, stage win probabilities, weighted revenue forecasts & visual drag-and-drop deals
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Pipeline Switcher Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={16} style={{ color: '#818cf8' }} />
            <select
              value={selectedPipelineId}
              onChange={(e) => setSelectedPipelineId(e.target.value)}
              className="input"
              style={{ height: 38, fontSize: 13.5, fontWeight: 600, minWidth: 210 }}
            >
              {pipelines.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} {p.isDefault ? '⭐' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowPipelineManagerModal(true)}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 12px', fontSize: 13 }}
            title="Configure Pipelines & Stages"
          >
            <Sliders size={14} />
            Pipelines
          </button>

          <button
            onClick={() => { setRefreshing(true); fetchDeals(); fetchStats(); }}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 12px', fontSize: 13 }}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => { setEditingDeal(null); setShowAddDealModal(true); }}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 18px', borderRadius: 8, fontWeight: 600 }}
          >
            <Plus size={18} />
            Add Deal
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        <MetricCard
          label="Total Pipeline Value"
          value={`₹ ${stats.totalPipelineValue.toLocaleString()}`}
          sub={`${stats.openDealsCount} active open deals`}
          icon={DollarSign}
          color="#6366f1"
          bg="rgba(99, 102, 241, 0.1)"
        />
        <MetricCard
          label="Weighted Forecast"
          value={`₹ ${stats.weightedPipelineValue.toLocaleString()}`}
          sub="Factored by win probability %"
          icon={TrendingUp}
          color="#3b82f6"
          bg="rgba(59, 130, 246, 0.1)"
        />
        <MetricCard
          label="Closed Won (This Month)"
          value={`₹ ${stats.wonThisMonthValue?.toLocaleString() || 0}`}
          sub={`${stats.wonThisMonthCount || 0} deals closed`}
          icon={Award}
          color="#10b981"
          bg="rgba(16, 185, 129, 0.1)"
        />
        <MetricCard
          label="Win Rate"
          value={`${stats.winRate}%`}
          sub={`${stats.wonDealsCount} won / ${stats.wonDealsCount + (stats.lostDealsCount || 0)} decided`}
          icon={Sparkles}
          color="#f59e0b"
          bg="rgba(245, 158, 11, 0.1)"
        />
      </div>

      {/* ── Filters & View Mode Controls ───────────────────────── */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: '12px 18px',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: '1 1 400px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: 220, flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search deal title, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ width: '100%', paddingLeft: 34, height: 36, fontSize: 13 }}
            />
          </div>

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="input"
            style={{ width: 170, height: 36, fontSize: 13 }}
          >
            <option value="">All Sales Reps</option>
            {usersList.map((u) => (
              <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
            style={{ width: 130, height: 36, fontSize: 13 }}
          >
            <option value="all">All Deals</option>
            <option value="Open">Open Only</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
          </select>

          {(search || assigneeFilter || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setAssigneeFilter(''); setStatusFilter('all'); }}
              className="btn btn-outline"
              style={{ height: 36, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <X size={13} /> Clear
            </button>
          )}
        </div>

        {/* View Switcher */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(15, 23, 42, 0.4)', padding: 3, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setViewMode('kanban')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              background: viewMode === 'kanban' ? '#6366f1' : 'transparent',
              color: viewMode === 'kanban' ? '#fff' : 'var(--text-muted)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Kanban size={13} /> Kanban
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              background: viewMode === 'list' ? '#6366f1' : 'transparent',
              color: viewMode === 'list' ? '#fff' : 'var(--text-muted)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Layers size={13} /> List View
          </button>
        </div>
      </div>

      {/* ── KANBAN BOARD VIEW ──────────────────────────────────── */}
      {viewMode === 'kanban' && currentPipeline && (
        <div
          style={{
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
            paddingBottom: 20,
            alignItems: 'flex-start',
            minHeight: 'calc(100vh - 340px)'
          }}
        >
          {currentPipeline.stages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stageId === stage._id);
            const totalStageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
            const weightedStageValue = Math.round((totalStageValue * stage.probability) / 100);
            const isDragOver = dragOverStageId === stage._id;

            return (
              <div
                key={stage._id}
                onDragOver={(e) => handleDragOver(e, stage._id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage._id)}
                style={{
                  flex: '0 0 310px',
                  background: isDragOver ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-surface)',
                  border: isDragOver ? '2px dashed #6366f1' : '1px solid var(--border-subtle)',
                  borderRadius: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 'calc(100vh - 280px)',
                  transition: 'all 0.15s ease',
                  overflow: 'hidden'
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'rgba(15, 23, 42, 0.4)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: stage.color || '#6366f1'
                        }}
                      />
                      <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 14 }}>
                        {stage.name}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: `${stage.color || '#6366f1'}22`,
                          color: stage.color || '#818cf8',
                          fontWeight: 700
                        }}
                      >
                        {stage.probability}%
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          padding: '2px 6px',
                          borderRadius: 10,
                          background: 'rgba(148, 163, 184, 0.15)',
                          color: 'var(--text-dim)',
                          fontWeight: 600
                        }}
                      >
                        {stageDeals.length}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-muted)' }}>
                    <span>Total: <strong style={{ color: 'var(--text-main)' }}>₹{totalStageValue.toLocaleString()}</strong></span>
                    <span>Wtd: <strong style={{ color: '#818cf8' }}>₹{weightedStageValue.toLocaleString()}</strong></span>
                  </div>
                </div>

                {/* Column Deal Cards List */}
                <div
                  style={{
                    padding: 12,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    flex: 1,
                    minHeight: 120
                  }}
                >
                  {stageDeals.map((deal) => {
                    const isOverdue = deal.expectedCloseDate && new Date(deal.expectedCloseDate) < new Date() && deal.status === 'Open';

                    return (
                      <div
                        key={deal._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal._id)}
                        onClick={() => openDealDetail(deal)}
                        style={{
                          background: 'rgba(15, 23, 42, 0.65)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 10,
                          padding: 14,
                          cursor: 'grab',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                          transition: 'transform 0.15s ease, border-color 0.15s ease',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6366f1'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                      >
                        {/* Card Header: Title & Value */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                          <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.3 }}>
                            {deal.title}
                          </h4>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#34d399', whiteSpace: 'nowrap' }}>
                            ₹ {deal.value?.toLocaleString()}
                          </span>
                        </div>

                        {/* Customer Link Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <Building2 size={12} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {deal.customerId?.companyName || 'Unknown Account'}
                          </span>
                        </div>

                        {/* Card Footer: Close Date & Assignee */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(148, 163, 184, 0.08)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: isOverdue ? '#f87171' : 'var(--text-dim)' }}>
                            <Calendar size={11} />
                            {deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'No date'}
                            {isOverdue && <span style={{ fontSize: 10, fontWeight: 700 }}>⚠️</span>}
                          </div>

                          {deal.assignedTo && (
                            <div
                              title={`Assigned to: ${deal.assignedTo.firstName} ${deal.assignedTo.lastName}`}
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: '#6366f1',
                                color: '#fff',
                                fontSize: 10,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {deal.assignedTo.firstName?.charAt(0)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {stageDeals.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-dim)', fontSize: 12, fontStyle: 'italic' }}>
                      Drag deals here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LIST / TABLE VIEW ──────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Deal Title</th>
                <th>Customer</th>
                <th>Stage</th>
                <th>Value</th>
                <th>Win %</th>
                <th>Weighted</th>
                <th>Assigned Rep</th>
                <th>Expected Close</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => {
                const stage = currentPipeline?.stages.find((s) => s._id === d.stageId);
                return (
                  <tr key={d._id} onClick={() => openDealDetail(d)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 13.5 }}>{d.title}</div>
                      {d.tags && d.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                          {d.tags.map((t, i) => (
                            <span key={i} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' }}>
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: 'var(--text-main)' }}>
                        {d.customerId?.companyName || '—'}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 12,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: `${stage?.color || '#6366f1'}22`,
                          color: stage?.color || '#818cf8',
                          fontWeight: 600,
                          border: `1px solid ${stage?.color || '#6366f1'}44`
                        }}
                      >
                        {stage?.name || 'Stage'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#34d399' }}>
                      ₹ {d.value?.toLocaleString()}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.probability}%</span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#818cf8' }}>
                      ₹ {Math.round(((d.value || 0) * (d.probability || 0)) / 100).toLocaleString()}
                    </td>
                    <td>
                      {d.assignedTo ? `${d.assignedTo.firstName} ${d.assignedTo.lastName}` : 'Unassigned'}
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      {d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          d.status === 'Won' ? 'badge-success' :
                          d.status === 'Lost' ? 'badge-inactive' : ''
                        }`}
                        style={d.status === 'Open' ? { background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' } : {}}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setEditingDeal(d); setShowAddDealModal(true); }}
                          className="btn btn-outline"
                          style={{ padding: '5px 8px', borderRadius: 6 }}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteDeal(d._id, e)}
                          className="btn btn-outline"
                          style={{ padding: '5px 8px', borderRadius: 6, color: '#ef4444' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add / Edit Deal Modal ──────────────────────────────── */}
      {showAddDealModal && (
        <DealFormModal
          isOpen={showAddDealModal}
          onClose={() => setShowAddDealModal(false)}
          deal={editingDeal}
          pipelines={pipelines}
          defaultPipelineId={selectedPipelineId}
          usersList={usersList}
          customersList={customersList}
          onSaved={() => {
            setShowAddDealModal(false);
            fetchDeals();
            fetchStats();
            showToast(editingDeal ? 'Deal updated!' : 'Deal created!');
          }}
        />
      )}

      {/* ── Win / Loss Reason Modal Prompt ─────────────────────── */}
      {winLossModalData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 14,
              width: '100%',
              maxWidth: 480,
              padding: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              {winLossModalData.targetStage.isWon ? (
                <Award size={24} style={{ color: '#10b981' }} />
              ) : (
                <XCircle size={24} style={{ color: '#ef4444' }} />
              )}
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-main)' }}>
                Mark Deal as {winLossModalData.targetStage.isWon ? 'Won 🎉' : 'Lost'}
              </h3>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--text-muted)' }}>
              Moving <strong>"{winLossModalData.deal.title}"</strong> to stage <strong>"{winLossModalData.targetStage.name}"</strong>.
              Please record the win/loss reason for future sales intelligence:
            </p>

            <textarea
              value={winLossReasonInput}
              onChange={(e) => setWinLossReasonInput(e.target.value)}
              placeholder={winLossModalData.targetStage.isWon ? 'e.g. Budget approved, superior technical demo, executive sponsor' : 'e.g. Price too high, chose competitor X, project delayed'}
              rows={3}
              className="input"
              style={{ width: '100%', resize: 'vertical', fontSize: 13.5, marginBottom: 18 }}
              autoFocus
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setWinLossModalData(null)} className="btn btn-outline">
                Cancel
              </button>
              <button
                onClick={handleConfirmWinLoss}
                className="btn btn-primary"
                style={{
                  background: winLossModalData.targetStage.isWon ? '#10b981' : '#ef4444',
                  borderColor: winLossModalData.targetStage.isWon ? '#10b981' : '#ef4444'
                }}
              >
                Confirm {winLossModalData.targetStage.isWon ? 'Won' : 'Lost'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deal Detail Drawer ─────────────────────────────────── */}
      {viewingDeal && (
        <DealDetailDrawer
          deal={viewingDeal}
          pipeline={pipelines.find((p) => p._id === viewingDeal.pipelineId?._id || p._id === viewingDeal.pipelineId) || currentPipeline}
          notes={dealNotes}
          onClose={() => setViewingDeal(null)}
          onEdit={() => { setEditingDeal(viewingDeal); setShowAddDealModal(true); }}
          noteContent={noteContent}
          setNoteContent={setNoteContent}
          noteType={noteType}
          setNoteType={setNoteType}
          onAddNote={handleAddDealNote}
          onDeleteNote={handleDeleteDealNote}
          onStageChange={async (targetStageId) => {
            try {
              const targetStage = currentPipeline.stages.find((s) => s._id === targetStageId);
              if (targetStage?.isWon || targetStage?.isLost) {
                setWinLossModalData({ deal: viewingDeal, targetStage });
                return;
              }
              const res = await api.patch(`/deals/${viewingDeal._id}/stage`, { stageId: targetStageId });
              setViewingDeal(res.data);
              showToast(`Stage updated to ${targetStage.name}`);
              fetchDeals();
              fetchStats();
              reloadDealNotes(viewingDeal._id);
            } catch (err) {
              showToast('Failed to change stage', 'error');
            }
          }}
        />
      )}

      {/* ── Pipeline Manager Modal ─────────────────────────────── */}
      {showPipelineManagerModal && (
        <PipelineManagerModal
          isOpen={showPipelineManagerModal}
          onClose={() => setShowPipelineManagerModal(false)}
          pipelines={pipelines}
          onPipelinesUpdated={() => {
            fetchPipelines();
            fetchDeals();
            fetchStats();
          }}
        />
      )}
    </div>
  );
}

// ================================================================
// KPI Metric Card
// ================================================================
function MetricCard({ label, value, sub, icon: Icon, color, bg }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</p>
        <h3 style={{ margin: '4px 0 2px', fontSize: 22, fontWeight: 700, color: 'var(--text-main)' }}>{value}</h3>
        {sub && <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{sub}</span>}
      </div>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color
        }}
      >
        <Icon size={22} />
      </div>
    </div>
  );
}

// ================================================================
// Add / Edit Deal Modal
// ================================================================
function DealFormModal({ isOpen, onClose, deal, pipelines, defaultPipelineId, usersList, customersList, onSaved }) {
  const [formData, setFormData] = useState({
    title: deal?.title || '',
    value: deal?.value || '',
    currency: deal?.currency || 'INR',
    pipelineId: deal?.pipelineId?._id || deal?.pipelineId || defaultPipelineId || '',
    stageId: deal?.stageId || '',
    customerId: deal?.customerId?._id || deal?.customerId || '',
    contactId: deal?.contactId?._id || deal?.contactId || '',
    assignedTo: deal?.assignedTo?._id || deal?.assignedTo || '',
    expectedCloseDate: deal?.expectedCloseDate ? deal.expectedCloseDate.substring(0, 10) : '',
    tags: deal?.tags?.join(', ') || ''
  });

  const [customerContacts, setCustomerContacts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activePipeline = pipelines.find((p) => p._id === formData.pipelineId) || pipelines[0];

  // Auto set first stage if not selected
  useEffect(() => {
    if (activePipeline && !formData.stageId && activePipeline.stages?.length > 0) {
      setFormData((prev) => ({ ...prev, stageId: activePipeline.stages[0]._id }));
    }
  }, [activePipeline]);

  // Load customer contacts when customer changes
  useEffect(() => {
    if (formData.customerId) {
      api.get(`/customers/${formData.customerId}/contacts`).then((res) => {
        if (res.data) setCustomerContacts(res.data);
      }).catch(() => setCustomerContacts([]));
    } else {
      setCustomerContacts([]);
    }
  }, [formData.customerId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) { setError('Deal title is required'); return; }
    if (!formData.customerId) { setError('Please select a customer account'); return; }
    if (!formData.value || isNaN(Number(formData.value))) { setError('Please enter a valid deal value'); return; }

    setSaving(true);
    setError('');

    try {
      const payload = {
        title: formData.title.trim(),
        value: Number(formData.value),
        currency: formData.currency,
        pipelineId: formData.pipelineId,
        stageId: formData.stageId,
        customerId: formData.customerId,
        contactId: formData.contactId || null,
        assignedTo: formData.assignedTo || null,
        expectedCloseDate: formData.expectedCloseDate || null,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
      };

      if (deal) {
        await api.put(`/deals/${deal._id}`, payload);
      } else {
        await api.post('/deals', payload);
      }

      onSaved();
    } catch (err) {
      setError(err.customMessage || 'Failed to save deal');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 8, 16, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0f172a',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          borderRadius: 20,
          width: '100%',
          maxWidth: 660,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(99, 102, 241, 0.1)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, transparent 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
              }}
            >
              <DollarSign size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                {deal ? 'Edit Deal Opportunity' : 'Create New Deal Opportunity'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#94a3b8' }}>
                {deal ? 'Update opportunity parameters and pipeline stage' : 'Add an active sales opportunity to your Kanban pipeline'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(148, 163, 184, 0.1)',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: 13,
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Deal Title */}
              <div>
                <label className="label" style={{ fontSize: 12.5, fontWeight: 600, color: '#cbd5e1', marginBottom: 6, display: 'block' }}>
                  Deal Title <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Enterprise Cloud ERP Implementation"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    background: '#1e293b',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 13.5,
                    outline: 'none'
                  }}
                  required
                />
              </div>

              {/* Deal Value & Currency Row */}
              <div className="modal-grid-2col" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                <div>
                  <label className="label" style={{ fontSize: 12.5, fontWeight: 600, color: '#cbd5e1', marginBottom: 6, display: 'block' }}>
                    Deal Value (Amount) <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="number"
                    name="value"
                    value={formData.value}
                    onChange={handleChange}
                    placeholder="e.g. 250000"
                    className="input"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      background: '#1e293b',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 13.5,
                      outline: 'none'
                    }}
                    required
                    min="0"
                  />
                </div>

                <div>
                  <label className="label" style={{ fontSize: 12.5, fontWeight: 600, color: '#cbd5e1', marginBottom: 6, display: 'block' }}>
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="input"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      background: '#1e293b',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 13.5,
                      outline: 'none'
                    }}
                  >
                    <option value="INR">₹ INR</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                    <option value="GBP">£ GBP</option>
                    <option value="AED">AED</option>
                  </select>
                </div>
              </div>

              {/* Customer Account & Key Contact Row */}
              <div className="modal-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="label" style={{ fontSize: 12.5, fontWeight: 600, color: '#cbd5e1', marginBottom: 6, display: 'block' }}>
                    Customer Account <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <select
                    name="customerId"
                    value={formData.customerId}
                    onChange={handleChange}
                    className="input"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      background: '#1e293b',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 13.5,
                      outline: 'none'
                    }}
                    required
                  >
                    <option value="">Select Customer Account</option>
                    {customersList.map((c) => (
                      <option key={c._id} value={c._id}>{c.companyName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label" style={{ fontSize: 12.5, fontWeight: 600, color: '#cbd5e1', marginBottom: 6, display: 'block' }}>
                    Key Contact
                  </label>
                  <select
                    name="contactId"
                    value={formData.contactId}
                    onChange={handleChange}
                    className="input"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      background: '#1e293b',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 13.5,
                      outline: 'none'
                    }}
                  >
                    <option value="">Select Contact (Optional)</option>
                    {customerContacts.map((ct) => (
                      <option key={ct._id} value={ct._id}>{ct.firstName} {ct.lastName} ({ct.designation || 'Contact'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pipeline & Stage Row */}
              <div className="modal-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="label" style={{ fontSize: 12.5, fontWeight: 600, color: '#cbd5e1', marginBottom: 6, display: 'block' }}>
                    Sales Pipeline
                  </label>
                  <select
                    name="pipelineId"
                    value={formData.pipelineId}
                    onChange={handleChange}
                    className="input"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      background: '#1e293b',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 13.5,
                      outline: 'none'
                    }}
                  >
                    {pipelines.map((p) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label" style={{ fontSize: 12.5, fontWeight: 600, color: '#cbd5e1', marginBottom: 6, display: 'block' }}>
                    Stage
                  </label>
                  <select
                    name="stageId"
                    value={formData.stageId}
                    onChange={handleChange}
                    className="input"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      background: '#1e293b',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 13.5,
                      outline: 'none'
                    }}
                  >
                    {activePipeline?.stages.map((st) => (
                      <option key={st._id} value={st._id}>{st.name} ({st.probability}%)</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assigned Rep & Expected Close Date Row */}
              <div className="modal-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="label" style={{ fontSize: 12.5, fontWeight: 600, color: '#cbd5e1', marginBottom: 6, display: 'block' }}>
                    Assigned Sales Rep
                  </label>
                  <select
                    name="assignedTo"
                    value={formData.assignedTo}
                    onChange={handleChange}
                    className="input"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      background: '#1e293b',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 13.5,
                      outline: 'none'
                    }}
                  >
                    <option value="">Assign Sales Rep</option>
                    {usersList.map((u) => (
                      <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label" style={{ fontSize: 12.5, fontWeight: 600, color: '#cbd5e1', marginBottom: 6, display: 'block' }}>
                    Expected Closing Date
                  </label>
                  <input
                    type="date"
                    name="expectedCloseDate"
                    value={formData.expectedCloseDate}
                    onChange={handleChange}
                    className="input"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      background: '#1e293b',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 13.5,
                      outline: 'none',
                      colorScheme: 'dark'
                    }}
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="label" style={{ fontSize: 12.5, fontWeight: 600, color: '#cbd5e1', marginBottom: 6, display: 'block' }}>
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="High-Value, Q3-Target, Software"
                  className="input"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    background: '#1e293b',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 13.5,
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid rgba(148, 163, 184, 0.12)',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 12,
              background: '#131d33'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              disabled={saving}
              style={{ padding: '10px 18px', fontSize: 13.5 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={saving}
              style={{
                minWidth: 130,
                padding: '10px 20px',
                fontSize: 13.5,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
              }}
            >
              {saving ? 'Saving...' : deal ? 'Update Deal' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ================================================================
// Deal Detail Drawer
// ================================================================
function DealDetailDrawer({ deal, pipeline, notes, onClose, onEdit, noteContent, setNoteContent, noteType, setNoteType, onAddNote, onDeleteNote, onStageChange }) {
  const currentStage = pipeline?.stages.find((s) => s._id === deal.stageId);
  const weightedValue = Math.round(((deal.value || 0) * (deal.probability || 0)) / 100);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 1100,
        display: 'flex',
        justifyContent: 'flex-end'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          height: '100%',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
          animation: 'slideDrawer 0.25s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background:
                      deal.status === 'Won' ? 'rgba(16, 185, 129, 0.15)' :
                      deal.status === 'Lost' ? 'rgba(239, 68, 68, 0.15)' :
                      'rgba(99, 102, 241, 0.15)',
                    color:
                      deal.status === 'Won' ? '#34d399' :
                      deal.status === 'Lost' ? '#f87171' :
                      '#818cf8',
                    fontWeight: 700
                  }}
                >
                  {deal.status}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  Pipeline: <strong>{pipeline?.name}</strong>
                </span>
              </div>
              <h2 style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>
                {deal.title}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={onEdit} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Edit3 size={14} /> Edit
              </button>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Stage Progress Stepper */}
          {pipeline?.stages && (
            <div style={{ display: 'flex', gap: 4, marginTop: 14, overflowX: 'auto' }}>
              {pipeline.stages.map((st) => {
                const isActive = st._id === deal.stageId;
                return (
                  <button
                    key={st._id}
                    onClick={() => onStageChange(st._id)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: 'none',
                      background: isActive ? st.color || '#6366f1' : 'rgba(148, 163, 184, 0.1)',
                      color: isActive ? '#fff' : 'var(--text-muted)',
                      fontSize: 11.5,
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                    title={`Click to set stage: ${st.name} (${st.probability}%)`}
                  >
                    {st.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Financial Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 14, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Deal Value</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#34d399', marginTop: 4 }}>
                ₹ {deal.value?.toLocaleString()}
              </div>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 14, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Win Probability</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#818cf8', marginTop: 4 }}>
                {deal.probability}%
              </div>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 14, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Weighted Revenue</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24', marginTop: 4 }}>
                ₹ {weightedValue.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Account & Contact Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 16, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 13.5, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={14} style={{ color: '#818cf8' }} /> Associated Customer
              </h4>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                {deal.customerId?.companyName || '—'}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
                Industry: {deal.customerId?.industry || 'General'}
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 16, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 13.5, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={14} style={{ color: '#10b981' }} /> Sales Lead / Contact
              </h4>
              {deal.contactId ? (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                    {deal.contactId.firstName} {deal.contactId.lastName}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {deal.contactId.designation || deal.contactId.email || deal.contactId.phone}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)', fontStyle: 'italic' }}>No primary contact attached</div>
              )}
            </div>
          </div>

          {/* Win / Loss Reason Notice */}
          {deal.winLossReason && (
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 10, padding: 14 }}>
              <h4 style={{ margin: '0 0 4px', fontSize: 13, color: '#f59e0b' }}>
                Win / Loss Analysis Reason:
              </h4>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-main)' }}>
                {deal.winLossReason}
              </p>
            </div>
          )}

          {/* Activity Timeline */}
          <div>
            <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} style={{ color: '#818cf8' }} /> Activity & Stage History ({notes.length})
            </h4>

            {/* Note Composer */}
            <form onSubmit={onAddNote} style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {['note', 'call-log', 'email-log', 'meeting'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNoteType(t)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 4,
                      border: 'none',
                      background: noteType === t ? '#6366f1' : 'rgba(148, 163, 184, 0.1)',
                      color: noteType === t ? '#fff' : 'var(--text-muted)',
                      fontSize: 11.5,
                      cursor: 'pointer'
                    }}
                  >
                    {t.replace('-', ' ')}
                  </button>
                ))}
              </div>

              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Log activity or note on this deal..."
                rows={2}
                className="input"
                style={{ width: '100%', resize: 'vertical', fontSize: 13, marginBottom: 8 }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 12.5, borderRadius: 6 }}>
                  Post Note
                </button>
              </div>
            </form>

            {/* Notes List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notes.map((n) => (
                <div
                  key={n._id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.4)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    padding: 12,
                    display: 'flex',
                    gap: 10
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: n.type === 'stage-change' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                      color: n.type === 'stage-change' ? '#a855f7' : '#818cf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {n.type === 'stage-change' ? <Layers size={13} /> : <MessageSquare size={13} />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-main)' }}>
                        {n.createdBy ? `${n.createdBy.firstName} ${n.createdBy.lastName}` : 'System'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {n.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// Pipeline Manager Modal (Add / Edit Pipelines & Custom Stages)
// ================================================================
function PipelineManagerModal({ isOpen, onClose, pipelines, onPipelinesUpdated }) {
  const [activePipeline, setActivePipeline] = useState(pipelines[0] || null);
  const [pipelineName, setPipelineName] = useState(pipelines[0]?.name || '');
  const [pipelineDesc, setPipelineDesc] = useState(pipelines[0]?.description || '');
  const [stages, setStages] = useState(pipelines[0]?.stages || []);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectPipeline = (p) => {
    setActivePipeline(p);
    setPipelineName(p.name);
    setPipelineDesc(p.description || '');
    setStages(p.stages || []);
    setIsCreatingNew(false);
    setError('');
  };

  const startNewPipeline = () => {
    setActivePipeline(null);
    setPipelineName('');
    setPipelineDesc('');
    setStages([
      { name: 'Discovery', probability: 20, color: '#6366f1', order: 1, isWon: false, isLost: false },
      { name: 'Demo / Solution', probability: 40, color: '#8b5cf6', order: 2, isWon: false, isLost: false },
      { name: 'Proposal', probability: 60, color: '#3b82f6', order: 3, isWon: false, isLost: false },
      { name: 'Negotiation', probability: 80, color: '#f59e0b', order: 4, isWon: false, isLost: false },
      { name: 'Closed Won', probability: 100, color: '#10b981', order: 5, isWon: true, isLost: false },
      { name: 'Closed Lost', probability: 0, color: '#ef4444', order: 6, isWon: false, isLost: true }
    ]);
    setIsCreatingNew(true);
    setError('');
  };

  const updateStage = (index, field, value) => {
    const updated = [...stages];
    updated[index][field] = value;
    setStages(updated);
  };

  const addStage = () => {
    setStages([
      ...stages,
      { name: 'New Stage', probability: 50, color: '#6366f1', order: stages.length + 1, isWon: false, isLost: false }
    ]);
  };

  const removeStage = (index) => {
    if (stages.length <= 2) {
      alert('Pipeline must have at least 2 stages');
      return;
    }
    setStages(stages.filter((_, i) => i !== index));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!pipelineName.trim()) { setError('Pipeline name is required'); return; }

    setSaving(true);
    setError('');

    try {
      const payload = {
        name: pipelineName.trim(),
        description: pipelineDesc.trim(),
        stages
      };

      if (isCreatingNew) {
        await api.post('/pipelines', payload);
      } else {
        await api.put(`/pipelines/${activePipeline._id}`, payload);
      }

      onPipelinesUpdated();
      onClose();
    } catch (err) {
      setError(err.customMessage || 'Failed to save pipeline');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 1300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 780,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sliders size={20} style={{ color: '#818cf8' }} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-main)' }}>
              Manage Sales Pipelines & Custom Stages
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Pipeline Sidebar List */}
          <div style={{ width: 220, borderRight: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.4)', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={startNewPipeline}
              className="btn btn-primary"
              style={{ width: '100%', padding: '7px 10px', fontSize: 12.5, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}
            >
              <Plus size={14} /> New Pipeline
            </button>

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', padding: '0 4px' }}>
              Your Pipelines
            </div>

            {pipelines.map((p) => {
              const isSelected = !isCreatingNew && activePipeline?._id === p._id;
              return (
                <button
                  key={p._id}
                  onClick={() => selectPipeline(p)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                    color: isSelected ? '#818cf8' : 'var(--text-main)',
                    textAlign: 'left',
                    fontSize: 13,
                    fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{p.name}</span>
                  {p.isDefault && <span style={{ fontSize: 10 }}>⭐</span>}
                </button>
              );
            })}
          </div>

          {/* Pipeline Details & Stages Form */}
          <form onSubmit={handleSave} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              {error && (
                <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: 13, marginBottom: 14 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <div>
                  <label className="label">Pipeline Name *</label>
                  <input
                    type="text"
                    value={pipelineName}
                    onChange={(e) => setPipelineName(e.target.value)}
                    placeholder="e.g. Enterprise Software Pipeline"
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <input
                    type="text"
                    value={pipelineDesc}
                    onChange={(e) => setPipelineDesc(e.target.value)}
                    placeholder="e.g. Sales cycle for high-ticket projects"
                    className="input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h4 style={{ margin: 0, fontSize: 14, color: 'var(--text-main)' }}>Pipeline Stages & Win Probabilities</h4>
                <button type="button" onClick={addStage} className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }}>
                  <Plus size={13} style={{ marginRight: 4 }} /> Add Stage
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stages.map((st, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '180px 90px 45px 75px 75px 35px',
                      gap: 8,
                      alignItems: 'center',
                      background: 'rgba(15, 23, 42, 0.4)',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <input
                      type="text"
                      value={st.name}
                      onChange={(e) => updateStage(idx, 'name', e.target.value)}
                      placeholder="Stage Name"
                      className="input"
                      style={{ height: 32, fontSize: 12.5 }}
                      required
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <input
                        type="number"
                        value={st.probability}
                        onChange={(e) => updateStage(idx, 'probability', Number(e.target.value))}
                        min="0"
                        max="100"
                        className="input"
                        style={{ height: 32, fontSize: 12.5, width: 60 }}
                        required
                      />
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>%</span>
                    </div>

                    <input
                      type="color"
                      value={st.color || '#6366f1'}
                      onChange={(e) => updateStage(idx, 'color', e.target.value)}
                      style={{ width: 34, height: 32, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                      title="Stage Color"
                    />

                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={st.isWon || false}
                        onChange={(e) => updateStage(idx, 'isWon', e.target.checked)}
                      />
                      Won
                    </label>

                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={st.isLost || false}
                        onChange={(e) => updateStage(idx, 'isLost', e.target.checked)}
                      />
                      Lost
                    </label>

                    <button
                      type="button"
                      onClick={() => removeStage(idx)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                      title="Delete Stage"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 10, background: 'rgba(15, 23, 42, 0.4)' }}>
              <button type="button" onClick={onClose} className="btn btn-outline" disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : isCreatingNew ? 'Create Pipeline' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
