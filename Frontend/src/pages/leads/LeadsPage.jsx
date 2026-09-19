import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Users, UserPlus, Flame, Snowflake, Zap, Wind,
  Search, Filter, ChevronRight, X, Clock, FileText,
  Star, ArrowUpRight, CheckCircle, Circle, Trash2,
  Edit2, Phone, Mail, Building, MapPin, Tag, RefreshCw,
  AlertTriangle, MessageCircle, Video, CalendarDays,
  TrendingUp, Target, Plus, Settings, BarChart2, Kanban,
  ChevronUp, ChevronDown, ExternalLink, Globe, DollarSign,
  Briefcase, Check, RotateCcw, Sparkles, FileSpreadsheet, CheckSquare
} from 'lucide-react';

import LeadImportModal from '../../components/data/LeadImportModal';
import BulkActionBar from '../../components/common/BulkActionBar';

// ─── Temperature Config ─────────────────────────────────────
const TEMP_CONFIG = {
  'Cold':     { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)', icon: Snowflake },
  'Warm':     { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', icon: Wind },
  'Hot':      { color: '#fb923c', bg: 'rgba(251, 146, 60, 0.15)', icon: Flame },
  'Very Hot': { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: Zap }
};

const FOLLOWUP_TYPES = ['Call', 'Email', 'Meeting', 'WhatsApp', 'Site Visit', 'Demo', 'Other'];
const NOTE_TYPES = [
  { value: 'note', label: 'Internal Note' },
  { value: 'call-log', label: 'Call Log' },
  { value: 'requirement', label: 'Requirement Doc' },
  { value: 'email-log', label: 'Email Log' }
];

// ─── Score Ring ─────────────────────────────────────────────
const ScoreRing = ({ score, size = 44 }) => {
  const temp = score >= 81 ? 'Very Hot' : score >= 61 ? 'Hot' : score >= 31 ? 'Warm' : 'Cold';
  const cfg = TEMP_CONFIG[temp];
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={cfg.color} strokeWidth={5}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size < 40 ? '9px' : '11px', fontWeight: '800', color: cfg.color
      }}>
        {score}
      </div>
    </div>
  );
};

// ─── Temperature Badge ──────────────────────────────────────
const TempBadge = ({ temperature }) => {
  const cfg = TEMP_CONFIG[temperature] || TEMP_CONFIG['Cold'];
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 9px', borderRadius: '99px', fontSize: '11.5px', fontWeight: '700',
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}44`
    }}>
      <Icon size={11} />
      {temperature}
    </span>
  );
};

// ─── Live Score Preview ─────────────────────────────────────
const computeScore = (form) => {
  let score = 0;
  if (form.phone?.trim())         score += 10;
  if (form.email?.trim())         score += 15;
  if (form.company?.trim())       score += 10;
  if (form.industry?.trim())      score += 5;
  if (form.demoRequested)         score += 20;
  if (Number(form.budget) > 0)    score += 15;
  if (Number(form.expectedValue) > 0) score += 15;
  return Math.min(100, score);
};

// ──────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────
const LeadsPage = () => {
  const { user: currentUser, hasPermission } = useAuth();

  // Master data
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [stats, setStats] = useState({});
  const [sources, setSources] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState('leads');
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterTemp, setFilterTemp] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === leads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map((l) => l._id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Add Lead Form
  const emptyForm = {
    firstName: '', lastName: '', company: '', email: '', phone: '',
    secondaryPhone: '', designation: '', city: '', state: '', country: '',
    industry: '', website: '', source: '', status: '', department: '',
    expectedValue: '', budget: '', demoRequested: false,
    tags: '', initialNote: '',
    assignmentStrategy: 'manual', assignedTo: ''
  };
  const [addForm, setAddForm] = useState(emptyForm);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [duplicates, setDuplicates] = useState([]);
  const [dupChecking, setDupChecking] = useState(false);

  // Follow-ups state
  const [followUps, setFollowUps] = useState([]);
  const [fuOverview, setFuOverview] = useState({ overdue: [], upcoming: [] });
  const [isFuModalOpen, setIsFuModalOpen] = useState(false);
  const [fuForm, setFuForm] = useState({ type: 'Call', subject: '', scheduledAt: '', notes: '' });
  const [fuLoading, setFuLoading] = useState(false);

  // Notes state
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [noteLoading, setNoteLoading] = useState(false);

  // Drawer tabs
  const [drawerTab, setDrawerTab] = useState('overview');

  // Pipeline config state
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceColor, setNewSourceColor] = useState('#6366f1');
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#6366f1');
  const [configSaving, setConfigSaving] = useState(false);

  // ── Fetch all master data ──────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (search)        params.set('search', search);
      if (filterStatus)  params.set('status', filterStatus);
      if (filterSource)  params.set('source', filterSource);
      if (filterTemp)    params.set('temperature', filterTemp);
      if (filterAssignee) params.set('assignedTo', filterAssignee);

      const [leadsRes, statsRes, sourcesRes, statusesRes, usersRes, fuRes] = await Promise.all([
        api.get(`/leads?${params}`),
        api.get('/leads/stats'),
        api.get('/lead-sources'),
        api.get('/lead-statuses'),
        api.get('/users'),
        api.get('/leads/followups/overview')
      ]);

      if (leadsRes.success) { setLeads(leadsRes.data.leads); setPagination(leadsRes.data.pagination); }
      if (statsRes.success)   setStats(statsRes.data);
      if (sourcesRes.success) setSources(sourcesRes.data);
      if (statusesRes.success) setStatuses(statusesRes.data);
      if (usersRes.success)   setUsers(usersRes.data);
      if (fuRes.success)      setFuOverview(fuRes.data);
    } catch (err) {
      console.error('Failed to fetch leads data:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterSource, filterTemp, filterAssignee]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Open Lead Drawer ───────────────────────────────────────
  const openDrawer = async (lead) => {
    setSelectedLead(lead);
    setDrawerTab('overview');
    setIsDrawerOpen(true);
    try {
      const [fuRes, notesRes] = await Promise.all([
        api.get(`/leads/${lead._id}/followups`),
        api.get(`/leads/${lead._id}/notes`)
      ]);
      if (fuRes.success)    setFollowUps(fuRes.data);
      if (notesRes.success) setNotes(notesRes.data);
    } catch (err) { console.error(err); }
  };

  // ── Duplicate Check ────────────────────────────────────────
  const checkDuplicates = async (email, phone) => {
    if (!email && !phone) { setDuplicates([]); return; }
    setDupChecking(true);
    try {
      const res = await api.post('/leads/check-duplicate', { email, phone });
      if (res.success) setDuplicates(res.data.duplicates);
    } catch (_) {}
    setDupChecking(false);
  };

  // ── Submit Add Lead ────────────────────────────────────────
  const handleAddLead = async (e) => {
    e.preventDefault();
    if (!addForm.firstName.trim()) { setAddError('First name is required.'); return; }

    setAddLoading(true);
    setAddError('');
    setAddSuccess('');

    try {
      const payload = {
        ...addForm,
        tags: addForm.tags ? addForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        expectedValue: Number(addForm.expectedValue) || 0,
        budget: Number(addForm.budget) || 0,
        assignedTo: addForm.assignmentStrategy === 'manual' ? (addForm.assignedTo || undefined) : undefined
      };
      if (!payload.status) delete payload.status;
      if (!payload.source) delete payload.source;
      if (!payload.assignedTo) delete payload.assignedTo;

      const res = await api.post('/leads', payload);
      if (res.success) {
        setAddSuccess(`Lead "${res.data.fullName}" created! Score: ${res.data.score} (${res.data.temperature})`);
        fetchAll();
        setTimeout(() => { setIsAddModalOpen(false); setAddForm(emptyForm); setDuplicates([]); }, 1200);
      }
    } catch (err) {
      setAddError(err.customMessage || 'Failed to create lead');
    } finally {
      setAddLoading(false);
    }
  };

  // ── Quick Status Change (from drawer) ─────────────────────
  const handleStatusChange = async (statusId) => {
    try {
      const res = await api.put(`/leads/${selectedLead._id}`, { status: statusId });
      if (res.success) {
        setSelectedLead(res.data);
        setLeads(leads.map(l => l._id === res.data._id ? res.data : l));
      }
    } catch (err) { alert(err.customMessage || 'Failed to update status'); }
  };

  // ── Convert Lead ───────────────────────────────────────────
  const handleConvertLead = async (leadId) => {
    if (!window.confirm('Convert this lead to Customer + Deal?')) return;
    try {
      const res = await api.post(`/leads/${leadId}/convert`);
      if (res.success) {
        alert(res.message);
        fetchAll();
        setIsDrawerOpen(false);
      }
    } catch (err) { alert(err.customMessage || 'Failed to convert lead'); }
  };

  // ── Delete Lead ────────────────────────────────────────────
  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Archive this lead? It can be restored later.')) return;
    try {
      const res = await api.delete(`/leads/${leadId}`);
      if (res.success) {
        setLeads(leads.filter(l => l._id !== leadId));
        if (selectedLead?._id === leadId) setIsDrawerOpen(false);
        fetchAll();
      }
    } catch (err) { alert(err.customMessage || 'Failed to archive lead'); }
  };

  // ── Add Follow-up ──────────────────────────────────────────
  const handleAddFollowUp = async (e) => {
    e.preventDefault();
    if (!fuForm.scheduledAt) return;
    setFuLoading(true);
    try {
      const res = await api.post(`/leads/${selectedLead._id}/followups`, fuForm);
      if (res.success) {
        setFollowUps([...followUps, res.data]);
        setIsFuModalOpen(false);
        setFuForm({ type: 'Call', subject: '', scheduledAt: '', notes: '' });
        fetchAll();
      }
    } catch (err) { alert(err.customMessage || 'Failed to schedule follow-up'); }
    setFuLoading(false);
  };

  // ── Complete Follow-up ─────────────────────────────────────
  const handleCompleteFollowUp = async (fid) => {
    const outcome = window.prompt('Brief outcome (optional):') || '';
    try {
      const res = await api.patch(`/leads/${selectedLead._id}/followups/${fid}`, { outcome });
      if (res.success) {
        setFollowUps(followUps.map(f => f._id === fid ? res.data : f));
      }
    } catch (err) { alert(err.customMessage || 'Failed to complete follow-up'); }
  };

  // ── Add Note ───────────────────────────────────────────────
  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setNoteLoading(true);
    try {
      const res = await api.post(`/leads/${selectedLead._id}/notes`, {
        content: noteText.trim(), type: noteType
      });
      if (res.success) {
        setNotes([res.data, ...notes]);
        setNoteText('');
      }
    } catch (err) { alert(err.customMessage || 'Failed to add note'); }
    setNoteLoading(false);
  };

  // ── Delete Note ────────────────────────────────────────────
  const handleDeleteNote = async (nid) => {
    try {
      await api.delete(`/leads/${selectedLead._id}/notes/${nid}`);
      setNotes(notes.filter(n => n._id !== nid));
    } catch (err) { alert(err.customMessage || 'Failed to delete note'); }
  };

  // ── Add Lead Source (config) ───────────────────────────────
  const handleAddSource = async (e) => {
    e.preventDefault();
    setConfigSaving(true);
    try {
      const res = await api.post('/lead-sources', { name: newSourceName, color: newSourceColor });
      if (res.success) { setSources([...sources, res.data]); setNewSourceName(''); }
    } catch (err) { alert(err.customMessage || 'Failed to add source'); }
    setConfigSaving(false);
  };

  // ── Add Lead Status (config) ───────────────────────────────
  const handleAddStatus = async (e) => {
    e.preventDefault();
    setConfigSaving(true);
    try {
      const res = await api.post('/lead-statuses', { name: newStatusName, color: newStatusColor });
      if (res.success) { setStatuses([...statuses, res.data]); setNewStatusName(''); }
    } catch (err) { alert(err.customMessage || 'Failed to add status'); }
    setConfigSaving(false);
  };

  // ── Delete Source ──────────────────────────────────────────
  const handleDeleteSource = async (id) => {
    try {
      const res = await api.delete(`/lead-sources/${id}`);
      if (res.success) setSources(sources.filter(s => s._id !== id));
    } catch (err) { alert(err.customMessage || 'Failed to delete source'); }
  };

  // ── Delete Status ──────────────────────────────────────────
  const handleDeleteStatus = async (id) => {
    try {
      const res = await api.delete(`/lead-statuses/${id}`);
      if (res.success) setStatuses(statuses.filter(s => s._id !== id));
    } catch (err) { alert(err.customMessage || 'Failed to delete status'); }
  };

  const liveScore = computeScore(addForm);

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <div className="page-container">

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Lead Pipeline</h1>
            <span className="badge badge-primary">Module 4</span>
          </div>
          <p className="text-muted" style={{ fontSize: '13.5px' }}>
            Capture, score, assign, and convert leads across the full CRM pipeline.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {hasPermission('leads:create') && (
            <button
              className="btn btn-secondary"
              onClick={() => setIsImportModalOpen(true)}
              style={{ gap: '6px' }}
            >
              <FileSpreadsheet size={16} color="var(--primary)" />
              <span>Import CSV</span>
            </button>
          )}

          {hasPermission('leads:create') && (
            <button
              className="btn btn-primary"
              id="add-lead-btn"
              onClick={() => {
                setAddForm(emptyForm);
                setDuplicates([]);
                setAddError('');
                setAddSuccess('');
                setIsAddModalOpen(true);
              }}
              style={{ gap: '6px' }}
            >
              <UserPlus size={16} />
              <span>Add Lead</span>
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Leads', value: stats.total ?? 0, icon: Users, color: '#818cf8', bg: 'rgba(99,102,241,0.15)' },
          { label: 'New Today',   value: stats.newToday ?? 0, icon: Plus, color: '#34d399', bg: 'rgba(16,185,129,0.15)' },
          { label: 'Hot Leads',   value: stats.hot ?? 0, icon: Flame, color: '#fb923c', bg: 'rgba(251,146,60,0.15)' },
          { label: 'Converted',   value: stats.converted ?? 0, icon: CheckCircle, color: '#22d3ee', bg: 'rgba(6,182,212,0.15)' }
        ].map((kpi, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-icon" style={{ background: kpi.bg, color: kpi.color }}>
              <kpi.icon size={22} />
            </div>
            <div className="kpi-content">
              <div className="kpi-title">{kpi.label}</div>
              <div className="kpi-value">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px', paddingBottom: '2px' }}>
        {[
          { key: 'leads', label: 'All Leads', icon: Users, count: pagination.total },
          { key: 'kanban', label: 'Kanban Board', icon: Kanban },
          { key: 'followups', label: 'Follow-Ups', icon: CalendarDays, count: fuOverview.overdue?.length > 0 ? fuOverview.overdue.length : null },
          { key: 'config', label: 'Pipeline Config', icon: Settings }
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 18px', fontSize: '14px', fontWeight: '700',
              background: 'transparent', border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease'
            }}>
            <tab.icon size={15} />
            <span>{tab.label}</span>
            {tab.count !== null && tab.count !== undefined && (
              <span style={{
                padding: '2px 7px', borderRadius: '10px', fontSize: '11px',
                backgroundColor: activeTab === tab.key ? 'var(--primary)' : 'rgba(148,163,184,0.2)',
                color: tab.key === 'followups' && fuOverview.overdue?.length > 0 ? '#f87171' : '#fff'
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 1: ALL LEADS TABLE                             */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'leads' && (
        <>
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" className="input-control" placeholder="Search leads..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: '36px' }} />
            </div>

            <select className="input-control" style={{ width: '160px' }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              {statuses.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>

            <select className="input-control" style={{ width: '150px' }} value={filterSource} onChange={e => { setFilterSource(e.target.value); setPage(1); }}>
              <option value="">All Sources</option>
              {sources.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>

            <select className="input-control" style={{ width: '140px' }} value={filterTemp} onChange={e => { setFilterTemp(e.target.value); setPage(1); }}>
              <option value="">All Temps</option>
              {['Cold', 'Warm', 'Hot', 'Very Hot'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <button className="btn btn-secondary btn-sm" onClick={fetchAll} style={{ gap: '6px' }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {/* Leads Table */}
          <div className="table-container">
            <table className="crm-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.length === leads.length && leads.length > 0}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                    />
                  </th>
                  <th>Lead</th>
                  <th>Score</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Expected Value</th>
                  <th>Added</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading leads...</td></tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '50px' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                        No leads found. <button className="btn btn-primary btn-sm" style={{ marginLeft: '12px' }} onClick={() => setIsAddModalOpen(true)}><Plus size={13} /> Add First Lead</button>
                      </div>
                    </td>
                  </tr>
                ) : leads.map(lead => (
                  <tr
                    key={lead._id}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedLeadIds.includes(lead._id) ? 'rgba(99, 102, 241, 0.08)' : 'transparent'
                    }}
                    onClick={() => openDrawer(lead)}
                  >
                    <td onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.includes(lead._id)}
                        onChange={() => toggleSelectOne(lead._id)}
                        style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                          background: lead.status?.color ? `${lead.status.color}22` : 'var(--bg-card-subtle)',
                          border: `1.5px solid ${lead.status?.color || '#6366f1'}44`,
                          color: lead.status?.color || '#818cf8',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', fontWeight: '800'
                        }}>
                          {lead.firstName?.[0]}{lead.lastName?.[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#fff', fontSize: '13.5px' }}>
                            {lead.firstName} {lead.lastName}
                            {lead.isConverted && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#34d399', background: 'rgba(16,185,129,0.15)', padding: '1px 5px', borderRadius: '4px' }}>Converted</span>}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lead.company || lead.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ScoreRing score={lead.score || 0} size={38} />
                        <TempBadge temperature={lead.temperature || 'Cold'} />
                      </div>
                    </td>
                    <td>
                      {lead.source ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12.5px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: lead.source.color }} />
                          {lead.source.name}
                        </span>
                      ) : <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>—</span>}
                    </td>
                    <td>
                      {lead.status ? (
                        <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '700',
                          backgroundColor: `${lead.status.color}22`, color: lead.status.color, border: `1px solid ${lead.status.color}44` }}>
                          {lead.status.name}
                        </span>
                      ) : <span className="badge" style={{ backgroundColor: 'rgba(148,163,184,0.15)', color: 'var(--text-dim)' }}>Unset</span>}
                    </td>
                    <td>
                      {lead.assignedTo ? (
                        <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
                          {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                        </span>
                      ) : <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Unassigned</span>}
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>
                        {lead.expectedValue > 0 ? `₹${lead.expectedValue.toLocaleString('en-IN')}` : '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openDrawer(lead)} title="View Details">
                          <ExternalLink size={13} />
                        </button>
                        {!lead.isConverted && hasPermission('leads:edit') && (
                          <button className="btn btn-outline btn-sm" style={{ color: '#34d399', borderColor: 'rgba(16,185,129,0.3)' }}
                            onClick={() => handleConvertLead(lead._id)} title="Convert Lead">
                            <ArrowUpRight size={13} />
                          </button>
                        )}
                        {hasPermission('leads:delete') && (
                          <button className="btn btn-outline btn-sm" style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.25)' }}
                            onClick={() => handleDeleteLead(lead._id)} title="Archive Lead">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={p === page ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 2: KANBAN BOARD                                */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'kanban' && (
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', minHeight: '300px' }}>
          {statuses.map(status => {
            const statusLeads = leads.filter(l => l.status?._id === status._id);
            return (
              <div key={status._id} style={{
                minWidth: '270px', maxWidth: '290px', flexShrink: 0,
                backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
                border: `1px solid ${status.color}33`, overflow: 'hidden'
              }}>
                {/* Column Header */}
                <div style={{ padding: '12px 16px', borderBottom: `2px solid ${status.color}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: status.color }} />
                    <span style={{ fontWeight: '700', fontSize: '13.5px' }}>{status.name}</span>
                    {status.isWon && <span style={{ fontSize: '10px', color: '#34d399', background: 'rgba(16,185,129,0.2)', padding: '1px 5px', borderRadius: '4px' }}>Won</span>}
                    {status.isLost && <span style={{ fontSize: '10px', color: '#f87171', background: 'rgba(239,68,68,0.2)', padding: '1px 5px', borderRadius: '4px' }}>Lost</span>}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: status.color, background: `${status.color}22`, padding: '2px 8px', borderRadius: '10px' }}>
                    {statusLeads.length}
                  </span>
                </div>

                {/* Lead Cards */}
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '65vh', overflowY: 'auto' }}>
                  {statusLeads.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-dim)', fontSize: '12px' }}>
                      No leads in this stage
                    </div>
                  ) : statusLeads.map(lead => (
                    <div key={lead._id} onClick={() => openDrawer(lead)}
                      style={{ backgroundColor: 'var(--bg-card-subtle)', borderRadius: '8px', padding: '12px 14px',
                        border: '1px solid rgba(148,163,184,0.12)', cursor: 'pointer',
                        transition: 'all 0.15s ease' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = status.color + '66'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(148,163,184,0.12)'}>
                      <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '4px', color: '#fff' }}>
                        {lead.firstName} {lead.lastName}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                        {lead.company || lead.email || '—'}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <TempBadge temperature={lead.temperature || 'Cold'} />
                        <ScoreRing score={lead.score || 0} size={30} />
                      </div>
                      {lead.expectedValue > 0 && (
                        <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '700', color: '#34d399', textAlign: 'right' }}>
                          ₹{lead.expectedValue.toLocaleString('en-IN')}
                        </div>
                      )}
                      {lead.assignedTo && (
                        <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
                          👤 {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 3: FOLLOW-UPS OVERVIEW                        */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'followups' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Overdue */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <AlertTriangle size={16} color="#f87171" />
              <h3 style={{ fontWeight: '700', fontSize: '15px', color: '#f87171' }}>Overdue ({fuOverview.overdue?.length || 0})</h3>
            </div>
            {(!fuOverview.overdue || fuOverview.overdue.length === 0) ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', background: 'var(--bg-surface)', borderRadius: '10px' }}>
                🎉 No overdue follow-ups!
              </div>
            ) : fuOverview.overdue.map(fu => (
              <div key={fu._id} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '14px 16px', marginBottom: '10px' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#fff', marginBottom: '4px' }}>
                  {fu.leadId?.firstName} {fu.leadId?.lastName}
                  <span style={{ marginLeft: '8px', fontSize: '11px', background: 'rgba(239,68,68,0.2)', color: '#f87171', padding: '1px 6px', borderRadius: '4px' }}>{fu.type}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{fu.leadId?.company}</div>
                <div style={{ fontSize: '12px', color: '#f87171', marginTop: '4px' }}>
                  Was due: {new Date(fu.scheduledAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Upcoming */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Clock size={16} color="#34d399" />
              <h3 style={{ fontWeight: '700', fontSize: '15px', color: '#34d399' }}>Upcoming ({fuOverview.upcoming?.length || 0})</h3>
            </div>
            {(!fuOverview.upcoming || fuOverview.upcoming.length === 0) ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', background: 'var(--bg-surface)', borderRadius: '10px' }}>
                No upcoming follow-ups scheduled.
              </div>
            ) : fuOverview.upcoming.map(fu => (
              <div key={fu._id} style={{ background: 'var(--bg-surface)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: '10px', padding: '14px 16px', marginBottom: '10px' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#fff', marginBottom: '4px' }}>
                  {fu.leadId?.firstName} {fu.leadId?.lastName}
                  <span style={{ marginLeft: '8px', fontSize: '11px', background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '1px 6px', borderRadius: '4px' }}>{fu.type}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{fu.leadId?.company}</div>
                <div style={{ fontSize: '12px', color: '#34d399', marginTop: '4px' }}>
                  {new Date(fu.scheduledAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 4: PIPELINE CONFIG                            */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'config' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>

          {/* Lead Sources */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={16} color="var(--primary)" />
              Lead Sources ({sources.length})
            </h3>
            <div style={{ background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
              {sources.map(s => (
                <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: s.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '13.5px', fontWeight: '500' }}>{s.name}</span>
                  {s.isDefault && <span style={{ fontSize: '10px', color: 'var(--text-dim)', background: 'rgba(148,163,184,0.1)', padding: '1px 6px', borderRadius: '4px' }}>Default</span>}
                  {!s.isDefault && hasPermission('settings:manage') && (
                    <button onClick={() => handleDeleteSource(s._id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
              {hasPermission('settings:manage') && (
                <form onSubmit={handleAddSource} style={{ padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'center', borderTop: '1px solid rgba(148,163,184,0.15)' }}>
                  <input type="color" value={newSourceColor} onChange={e => setNewSourceColor(e.target.value)}
                    style={{ width: '28px', height: '28px', cursor: 'pointer', border: 'none', background: 'transparent', borderRadius: '4px' }} />
                  <input type="text" className="input-control" placeholder="New source name..." value={newSourceName}
                    onChange={e => setNewSourceName(e.target.value)} style={{ flex: 1, padding: '7px 12px', fontSize: '13px' }} />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={configSaving || !newSourceName}>
                    <Plus size={13} /> Add
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Lead Statuses */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={16} color="var(--primary)" />
              Pipeline Stages ({statuses.length})
            </h3>
            <div style={{ background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
              {statuses.map(st => (
                <div key={st._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', width: '16px', textAlign: 'center' }}>{st.order + 1}</span>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: st.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '13.5px', fontWeight: '500' }}>{st.name}</span>
                  {st.isWon && <span style={{ fontSize: '10px', color: '#34d399', background: 'rgba(16,185,129,0.15)', padding: '1px 5px', borderRadius: '4px' }}>Won</span>}
                  {st.isLost && <span style={{ fontSize: '10px', color: '#f87171', background: 'rgba(239,68,68,0.15)', padding: '1px 5px', borderRadius: '4px' }}>Lost</span>}
                  {st.isDefault && <span style={{ fontSize: '10px', color: 'var(--text-dim)', background: 'rgba(148,163,184,0.1)', padding: '1px 6px', borderRadius: '4px' }}>Default</span>}
                  {!st.isDefault && hasPermission('settings:manage') && (
                    <button onClick={() => handleDeleteStatus(st._id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
              {hasPermission('settings:manage') && (
                <form onSubmit={handleAddStatus} style={{ padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'center', borderTop: '1px solid rgba(148,163,184,0.15)' }}>
                  <input type="color" value={newStatusColor} onChange={e => setNewStatusColor(e.target.value)}
                    style={{ width: '28px', height: '28px', cursor: 'pointer', border: 'none', background: 'transparent' }} />
                  <input type="text" className="input-control" placeholder="New stage name..." value={newStatusName}
                    onChange={e => setNewStatusName(e.target.value)} style={{ flex: 1, padding: '7px 12px', fontSize: '13px' }} />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={configSaving || !newStatusName}>
                    <Plus size={13} /> Add
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* MODAL: ADD LEAD                                    */}
      {/* ════════════════════════════════════════════════════ */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Add New Lead</h2>
                  <p className="text-muted" style={{ fontSize: '12px' }}>Capture lead intelligence, auto-score, and assign to pipeline.</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Live Score Preview */}
                <div style={{ textAlign: 'center' }}>
                  <ScoreRing score={liveScore} size={44} />
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>Live Score</div>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddLead} style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 140px)' }}>
              <div style={{ padding: '20px 24px' }}>

                {/* Duplicate Warning */}
                {duplicates.length > 0 && (
                  <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '8px', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontWeight: '700', fontSize: '13px', marginBottom: '8px' }}>
                      <AlertTriangle size={15} />
                      {duplicates.length} Potential Duplicate(s) Found
                    </div>
                    {duplicates.map(d => (
                      <div key={d._id} style={{ fontSize: '12px', color: '#e2e8f0', marginBottom: '4px' }}>
                        • {d.firstName} {d.lastName} ({d.email || d.phone}) — Status: {d.status?.name || 'Unknown'} — Assigned: {d.assignedTo?.firstName || 'Unassigned'}
                      </div>
                    ))}
                  </div>
                )}

                {addError && (
                  <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>
                    {addError}
                  </div>
                )}
                {addSuccess && (
                  <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', color: '#34d399', fontSize: '13px', marginBottom: '16px' }}>
                    {addSuccess}
                  </div>
                )}

                {/* Section 1: Identity */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={12} /> Identity
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label className="label">First Name *</label>
                      <input type="text" className="input-control" required placeholder="e.g. Rajesh"
                        value={addForm.firstName} onChange={e => setAddForm({ ...addForm, firstName: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Last Name</label>
                      <input type="text" className="input-control" placeholder="e.g. Kumar"
                        value={addForm.lastName} onChange={e => setAddForm({ ...addForm, lastName: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Company</label>
                      <input type="text" className="input-control" placeholder="ABC Enterprises"
                        value={addForm.company} onChange={e => setAddForm({ ...addForm, company: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Designation</label>
                      <input type="text" className="input-control" placeholder="CEO, Manager..."
                        value={addForm.designation} onChange={e => setAddForm({ ...addForm, designation: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input type="email" className="input-control" placeholder="rajesh@abc.com"
                        value={addForm.email}
                        onChange={e => { setAddForm({ ...addForm, email: e.target.value }); }}
                        onBlur={() => checkDuplicates(addForm.email, addForm.phone)} />
                    </div>
                    <div>
                      <label className="label">Phone</label>
                      <input type="text" className="input-control" placeholder="+91 98765 43210"
                        value={addForm.phone}
                        onChange={e => { setAddForm({ ...addForm, phone: e.target.value }); }}
                        onBlur={() => checkDuplicates(addForm.email, addForm.phone)} />
                    </div>
                    <div>
                      <label className="label">Secondary Phone</label>
                      <input type="text" className="input-control" placeholder="+91 98765 00000"
                        value={addForm.secondaryPhone} onChange={e => setAddForm({ ...addForm, secondaryPhone: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Industry</label>
                      <input type="text" className="input-control" placeholder="Software, Real Estate..."
                        value={addForm.industry} onChange={e => setAddForm({ ...addForm, industry: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Section 2: Location */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={12} /> Location
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label className="label">City</label>
                      <input type="text" className="input-control" placeholder="Bengaluru"
                        value={addForm.city} onChange={e => setAddForm({ ...addForm, city: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">State</label>
                      <input type="text" className="input-control" placeholder="Karnataka"
                        value={addForm.state} onChange={e => setAddForm({ ...addForm, state: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Country</label>
                      <input type="text" className="input-control" placeholder="India"
                        value={addForm.country} onChange={e => setAddForm({ ...addForm, country: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Section 3: Pipeline */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Target size={12} /> Pipeline
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label className="label">Lead Source</label>
                      <select className="input-control" value={addForm.source} onChange={e => setAddForm({ ...addForm, source: e.target.value })}>
                        <option value="">Select Source...</option>
                        {sources.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Pipeline Stage</label>
                      <select className="input-control" value={addForm.status} onChange={e => setAddForm({ ...addForm, status: e.target.value })}>
                        <option value="">Select Stage...</option>
                        {statuses.filter(s => !s.isWon && !s.isLost).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="label">Assignment Strategy</label>
                      <select className="input-control" value={addForm.assignmentStrategy}
                        onChange={e => setAddForm({ ...addForm, assignmentStrategy: e.target.value })}>
                        <option value="manual">Manual — Pick a specific agent</option>
                        <option value="round-robin">Round-Robin — Auto-rotate agents</option>
                        <option value="load-based">Load-Based — Assign to least busy</option>
                      </select>
                    </div>

                    {addForm.assignmentStrategy === 'manual' && (
                      <div>
                        <label className="label">Assign To</label>
                        <select className="input-control" value={addForm.assignedTo}
                          onChange={e => setAddForm({ ...addForm, assignedTo: e.target.value })}>
                          <option value="">Unassigned</option>
                          {users.filter(u => u.isActive).map(u => (
                            <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({u.department})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 4: Deal Info */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={12} /> Deal Intelligence
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label className="label">Expected Deal Value (₹)</label>
                      <input type="number" className="input-control" placeholder="500000"
                        value={addForm.expectedValue} onChange={e => setAddForm({ ...addForm, expectedValue: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Budget Disclosed (₹)</label>
                      <input type="number" className="input-control" placeholder="300000"
                        value={addForm.budget} onChange={e => setAddForm({ ...addForm, budget: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <input type="checkbox" id="demoReq" checked={addForm.demoRequested}
                      onChange={e => setAddForm({ ...addForm, demoRequested: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                    <label htmlFor="demoReq" style={{ fontSize: '13px', cursor: 'pointer', color: '#e2e8f0' }}>
                      Demo Requested by Lead (+20 score points)
                    </label>
                  </div>
                </div>

                {/* Section 5: Tags & Note */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tag size={12} /> Tags & Initial Note
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label className="label">Tags (comma-separated)</label>
                    <input type="text" className="input-control" placeholder="enterprise, urgent, saas, q4"
                      value={addForm.tags} onChange={e => setAddForm({ ...addForm, tags: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Initial Note (optional)</label>
                    <textarea className="input-control" rows={3}
                      placeholder="Key requirements, context, source details..."
                      value={addForm.initialNote} onChange={e => setAddForm({ ...addForm, initialNote: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Form Footer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(148,163,184,0.15)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'rgba(15,23,42,0.5)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                  {addLoading ? 'Creating Lead...' : `Create Lead (Score: ${liveScore})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* DRAWER: LEAD DETAIL                               */}
      {/* ════════════════════════════════════════════════════ */}
      {isDrawerOpen && selectedLead && (
        <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="drawer-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>

            {/* Drawer Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <ScoreRing score={selectedLead.score || 0} size={52} />
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>
                      {selectedLead.firstName} {selectedLead.lastName}
                    </h2>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{selectedLead.company}</div>
                    <div style={{ marginTop: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <TempBadge temperature={selectedLead.temperature || 'Cold'} />
                      {selectedLead.isConverted && (
                        <span className="badge badge-success">Converted</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {!selectedLead.isConverted && hasPermission('leads:edit') && (
                    <button className="btn btn-outline btn-sm" style={{ color: '#34d399', borderColor: 'rgba(16,185,129,0.3)' }}
                      onClick={() => handleConvertLead(selectedLead._id)}>
                      <ArrowUpRight size={14} /> Convert
                    </button>
                  )}
                  <button onClick={() => setIsDrawerOpen(false)}
                    style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Drawer Tabs */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'followups', label: `Follow-Ups (${followUps.length})` },
                  { key: 'notes', label: `Notes (${notes.length})` },
                  { key: 'details', label: 'Details' }
                ].map(t => (
                  <button key={t.key} onClick={() => setDrawerTab(t.key)}
                    style={{ padding: '7px 14px', fontSize: '12.5px', fontWeight: '600', borderRadius: '6px',
                      background: drawerTab === t.key ? 'var(--primary)' : 'rgba(148,163,184,0.1)',
                      color: drawerTab === t.key ? '#fff' : 'var(--text-muted)',
                      border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

              {/* Overview Tab */}
              {drawerTab === 'overview' && (
                <div>
                  {/* Contact Info */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: '700', marginBottom: '12px', letterSpacing: '0.06em' }}>Contact</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {[
                        { icon: Mail, label: 'Email', value: selectedLead.email },
                        { icon: Phone, label: 'Phone', value: selectedLead.phone },
                        { icon: MapPin, label: 'Location', value: [selectedLead.city, selectedLead.state, selectedLead.country].filter(Boolean).join(', ') },
                        { icon: Globe, label: 'Website', value: selectedLead.website }
                      ].map(({ icon: Icon, label, value }) => value ? (
                        <div key={label} style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '10px 14px', border: '1px solid rgba(148,163,184,0.1)' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</div>
                          <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Icon size={12} color="var(--primary)" />
                            {value}
                          </div>
                        </div>
                      ) : null)}
                    </div>
                  </div>

                  {/* Status Selector */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: '700', marginBottom: '8px', letterSpacing: '0.06em' }}>Pipeline Stage</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {statuses.map(s => (
                        <button key={s._id} onClick={() => handleStatusChange(s._id)}
                          style={{
                            padding: '5px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                            border: `1.5px solid ${s.color}`,
                            background: selectedLead.status?._id === s._id ? s.color : `${s.color}15`,
                            color: selectedLead.status?._id === s._id ? '#fff' : s.color,
                            transition: 'all 0.15s'
                          }}>
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Source & Assignee */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '12px 14px', border: '1px solid rgba(148,163,184,0.1)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Source</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {selectedLead.source && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: selectedLead.source.color }} />}
                        <span style={{ fontSize: '13.5px', fontWeight: '600' }}>{selectedLead.source?.name || 'Unknown'}</span>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '12px 14px', border: '1px solid rgba(148,163,184,0.1)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Assigned To</div>
                      <div style={{ fontSize: '13.5px', fontWeight: '600' }}>
                        {selectedLead.assignedTo ? `${selectedLead.assignedTo.firstName} ${selectedLead.assignedTo.lastName}` : 'Unassigned'}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {selectedLead.tags?.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>Tags</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {selectedLead.tags.map(tag => (
                          <span key={tag} style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '12px', background: 'var(--primary-light)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Follow-Ups Tab */}
              {drawerTab === 'followups' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ fontWeight: '700', fontSize: '14px' }}>Scheduled Follow-Ups</h4>
                    <button className="btn btn-primary btn-sm" onClick={() => setIsFuModalOpen(true)}>
                      <Plus size={13} /> Schedule
                    </button>
                  </div>

                  {followUps.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No follow-ups scheduled. Add one to keep the lead engaged!
                    </div>
                  ) : followUps.map(fu => (
                    <div key={fu._id} style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px',
                      border: `1px solid ${fu.isCompleted ? 'rgba(16,185,129,0.25)' : 'rgba(148,163,184,0.12)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ padding: '2px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '700',
                            background: fu.isCompleted ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                            color: fu.isCompleted ? '#34d399' : '#818cf8' }}>
                            {fu.type}
                          </span>
                          {fu.isCompleted && <span style={{ fontSize: '11px', color: '#34d399' }}>✓ Done</span>}
                        </div>
                        {!fu.isCompleted && (
                          <button onClick={() => handleCompleteFollowUp(fu._id)}
                            style={{ background: 'transparent', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px',
                              color: '#34d399', fontSize: '11px', cursor: 'pointer', padding: '4px 10px' }}>
                            <Check size={11} /> Complete
                          </button>
                        )}
                      </div>
                      {fu.subject && <div style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0', marginBottom: '4px' }}>{fu.subject}</div>}
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        📅 {new Date(fu.scheduledAt).toLocaleString()}
                      </div>
                      {fu.notes && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>{fu.notes}</div>}
                      {fu.outcome && <div style={{ fontSize: '12px', color: '#34d399', marginTop: '4px' }}>Outcome: {fu.outcome}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Notes Tab */}
              {drawerTab === 'notes' && (
                <div>
                  {/* Add Note */}
                  <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(148,163,184,0.12)', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <select className="input-control" value={noteType} onChange={e => setNoteType(e.target.value)} style={{ width: '160px', fontSize: '12px' }}>
                        {NOTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <textarea className="input-control" rows={3}
                      placeholder="Type your note, call outcome, or requirement..." value={noteText}
                      onChange={e => setNoteText(e.target.value)} style={{ width: '100%', marginBottom: '10px', fontSize: '13px' }} />
                    <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={noteLoading || !noteText.trim()}>
                      {noteLoading ? 'Adding...' : 'Add Note'}
                    </button>
                  </div>

                  {/* Notes Timeline */}
                  {notes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>No notes yet. Add your first note above.</div>
                  ) : (
                    <div style={{ position: 'relative', paddingLeft: '22px' }}>
                      <div style={{ position: 'absolute', left: '8px', top: '6px', bottom: '6px', width: '2px', background: 'rgba(148,163,184,0.15)' }} />
                      {notes.map(note => {
                        const typeColors = { 'note': '#818cf8', 'call-log': '#34d399', 'requirement': '#fbbf24', 'email-log': '#22d3ee', 'system': '#94a3b8' };
                        const color = typeColors[note.type] || '#818cf8';
                        return (
                          <div key={note._id} style={{ position: 'relative', marginBottom: '16px' }}>
                            <div style={{ position: 'absolute', left: '-18px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
                            <div style={{ background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '12px 14px', border: '1px solid rgba(148,163,184,0.1)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '1px 7px', borderRadius: '4px', background: `${color}20`, color }}>
                                    {NOTE_TYPES.find(t => t.value === note.type)?.label || note.type}
                                  </span>
                                  <span style={{ fontSize: '11.5px', color: '#e2e8f0', fontWeight: '600' }}>
                                    {note.createdBy?.firstName} {note.createdBy?.lastName}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                    {new Date(note.createdAt).toLocaleString()}
                                  </span>
                                  {note.type !== 'system' && (
                                    <button onClick={() => handleDeleteNote(note._id)}
                                      style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '2px' }}>
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>{note.content}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Details Tab */}
              {drawerTab === 'details' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                      { label: 'Expected Value', value: selectedLead.expectedValue > 0 ? `₹${selectedLead.expectedValue.toLocaleString('en-IN')}` : 'Not set' },
                      { label: 'Disclosed Budget', value: selectedLead.budget > 0 ? `₹${selectedLead.budget.toLocaleString('en-IN')}` : 'Not disclosed' },
                      { label: 'Demo Requested', value: selectedLead.demoRequested ? '✅ Yes' : '❌ No' },
                      { label: 'Lead Score', value: `${selectedLead.score}/100 — ${selectedLead.temperature}` },
                      { label: 'Department', value: selectedLead.department || 'Not assigned' },
                      { label: 'Website', value: selectedLead.website || '—' },
                      { label: 'Designation', value: selectedLead.designation || '—' },
                      { label: 'Created', value: new Date(selectedLead.createdAt).toLocaleString() },
                      { label: 'Last Activity', value: selectedLead.lastActivityAt ? new Date(selectedLead.lastActivityAt).toLocaleString() : '—' }
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '12px 14px', border: '1px solid rgba(148,163,184,0.1)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
                        <div style={{ fontSize: '13.5px', color: '#e2e8f0', fontWeight: '600' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* MODAL: SCHEDULE FOLLOW-UP                          */}
      {/* ════════════════════════════════════════════════════ */}
      {isFuModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setIsFuModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
              <h3 style={{ fontWeight: '800', fontSize: '16px' }}>Schedule Follow-Up</h3>
              <button onClick={() => setIsFuModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleAddFollowUp} style={{ padding: '20px 22px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label className="label">Activity Type *</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {FOLLOWUP_TYPES.map(type => (
                    <button key={type} type="button" onClick={() => setFuForm({ ...fuForm, type })}
                      style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', border: `1.5px solid`,
                        background: fuForm.type === type ? 'var(--primary)' : 'rgba(99,102,241,0.08)',
                        borderColor: fuForm.type === type ? 'var(--primary)' : 'rgba(99,102,241,0.2)',
                        color: fuForm.type === type ? '#fff' : 'var(--text-muted)' }}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="label">Subject</label>
                <input type="text" className="input-control" placeholder="e.g. Product Demo Call" value={fuForm.subject}
                  onChange={e => setFuForm({ ...fuForm, subject: e.target.value })} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="label">Schedule Date & Time *</label>
                <input type="datetime-local" className="input-control" required value={fuForm.scheduledAt}
                  onChange={e => setFuForm({ ...fuForm, scheduledAt: e.target.value })} />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="label">Notes (optional)</label>
                <textarea className="input-control" rows={2} placeholder="Pre-meeting notes, agenda..." value={fuForm.notes}
                  onChange={e => setFuForm({ ...fuForm, notes: e.target.value })} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsFuModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={fuLoading}>
                  {fuLoading ? 'Scheduling...' : 'Schedule Follow-Up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Action Toolbar */}
      <BulkActionBar
        entity="leads"
        selectedIds={selectedLeadIds}
        onClearSelection={() => setSelectedLeadIds([])}
        onSuccess={fetchAll}
        users={users}
        statuses={statuses}
      />

      {/* CSV / Excel Lead Import Wizard */}
      <LeadImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchAll}
      />

    </div>
  );
};

export default LeadsPage;
