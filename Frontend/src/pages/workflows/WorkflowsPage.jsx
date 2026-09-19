import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Zap,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Trash2,
  Edit2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Layers,
  Check,
  UserCheck,
  Mail,
  Bell,
  Building,
  Calendar,
  X,
  Loader2,
  Settings,
  HelpCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

const TRIGGERS = [
  { id: 'lead.created', label: 'When a new Lead is created', icon: Zap, category: 'Leads' },
  { id: 'lead.status_changed', label: 'When Lead Status changes', icon: Layers, category: 'Leads' },
  { id: 'deal.created', label: 'When a new Deal is created', icon: Sparkles, category: 'Deals' },
  { id: 'deal.stage_changed', label: 'When Deal Stage changes (e.g. Won)', icon: CheckCircle2, category: 'Deals' },
  { id: 'invoice.paid', label: 'When Invoice Payment is recorded', icon: Building, category: 'Billing' }
];

const OPERATORS = [
  { id: 'equals', label: 'Equals (=)' },
  { id: 'not_equals', label: 'Does not equal (≠)' },
  { id: 'greater_than', label: 'Greater than (>)' },
  { id: 'less_than', label: 'Less than (<)' },
  { id: 'contains', label: 'Contains text' },
  { id: 'in', label: 'In list (comma separated)' }
];

const ACTION_TYPES = [
  { id: 'create_task', label: 'Create Follow-Up Task', icon: Calendar, color: '#f59e0b' },
  { id: 'send_notification', label: 'Send In-App Notification', icon: Bell, color: '#818cf8' },
  { id: 'send_email', label: 'Send Automated Email', icon: Mail, color: '#38bdf8' },
  { id: 'create_customer', label: 'Auto-Generate Customer Account', icon: Building, color: '#10b981' },
  { id: 'assign_user', label: 'Assign to Sales Rep / Team', icon: UserCheck, color: '#ec4899' },
  { id: 'update_field', label: 'Update Field Value', icon: Settings, color: '#a78bfa' }
];

const WorkflowsPage = () => {
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'templates' | 'logs'
  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testRule, setTestRule] = useState(null);
  const [testPayload, setTestPayload] = useState('{\n  "expectedValue": 75000,\n  "source": "Website",\n  "status": "Won",\n  "temperature": "Very Hot"\n}');
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  // Rule Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger: 'lead.created',
    conditionLogic: 'AND',
    conditions: [{ field: 'expectedValue', operator: 'greater_than', value: '50000' }],
    actions: [{ actionType: 'create_task', params: { title: 'Follow-up with Lead', dueInHours: 2, priority: 'High' } }],
    isActive: true
  });

  const fetchAll = useCallback(async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [rulesRes, templatesRes, logsRes] = await Promise.all([
        axios.get('/api/v1/workflows', { headers }),
        axios.get('/api/v1/workflows/templates', { headers }),
        axios.get('/api/v1/workflows/logs?limit=50', { headers })
      ]);

      if (rulesRes.data?.success) setRules(rulesRes.data.data);
      if (templatesRes.data?.success) setTemplates(templatesRes.data.data);
      if (logsRes.data?.success) setLogs(logsRes.data.data.logs || []);
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleToggleRule = async (ruleId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.patch(
        `/api/v1/workflows/${ruleId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        setRules((prev) => prev.map((r) => (r._id === ruleId ? res.data.data : r)));
      }
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this workflow rule?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/workflows/${ruleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRules((prev) => prev.filter((r) => r._id !== ruleId));
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const handleInstallTemplate = async (tmpl) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        '/api/v1/workflows',
        {
          name: tmpl.name,
          description: tmpl.description,
          trigger: tmpl.trigger,
          conditionLogic: tmpl.conditionLogic,
          conditions: tmpl.conditions,
          actions: tmpl.actions,
          isActive: true
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        setRules((prev) => [res.data.data, ...prev]);
        setActiveTab('rules');
      }
    } catch (err) {
      console.error('Failed to install template:', err);
    }
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/v1/workflows', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setRules((prev) => [res.data.data, ...prev]);
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to save rule:', err);
      alert(err.response?.data?.message || 'Failed to save workflow rule');
    } finally {
      setSaving(false);
    }
  };

  const handleSimulateRule = async () => {
    try {
      const parsed = JSON.parse(testPayload);
      const token = localStorage.getItem('token');
      const res = await axios.post(
        '/api/v1/workflows/test',
        { rule: testRule, sampleData: parsed },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        setTestResult(res.data.data);
      }
    } catch (err) {
      alert('Invalid JSON payload or simulation error');
    }
  };

  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [...formData.conditions, { field: 'status', operator: 'equals', value: '' }]
    });
  };

  const removeCondition = (index) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index)
    });
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [
        ...formData.actions,
        { actionType: 'send_notification', params: { title: 'Workflow Alert', message: '' } }
      ]
    });
  };

  const removeAction = (index) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="page-container" style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* ── Page Header ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(249, 115, 22, 0.2))',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24'
            }}
          >
            <Zap size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#fff' }}>
              Automation & Workflow Engine
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13.5px' }}>
              Create event-driven automation rules: Trigger ➔ Condition Evaluation ➔ Multi-Action Chain
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchAll}
            style={{ gap: '6px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setFormData({
                name: '',
                description: '',
                trigger: 'lead.created',
                conditionLogic: 'AND',
                conditions: [{ field: 'expectedValue', operator: 'greater_than', value: '50000' }],
                actions: [{ actionType: 'create_task', params: { title: 'Follow-up with Lead', dueInHours: 2, priority: 'High' } }],
                isActive: true
              });
              setIsModalOpen(true);
            }}
            style={{ gap: '6px' }}
          >
            <Plus size={16} />
            <span>Create Automation Rule</span>
          </button>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
          marginBottom: '24px'
        }}
      >
        {[
          { id: 'rules', label: 'Active Workflow Rules', icon: Layers, count: rules.length },
          { id: 'templates', label: 'Pre-Built Templates Library', icon: Sparkles, count: templates.length },
          { id: 'logs', label: 'Execution Audit Logs', icon: Clock, count: logs.length }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                color: isActive ? '#fff' : 'var(--text-muted)',
                fontWeight: isActive ? '700' : '500',
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <Icon size={16} color={isActive ? 'var(--primary)' : '#64748b'} />
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  backgroundColor: isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(148, 163, 184, 0.1)',
                  color: isActive ? '#818cf8' : '#94a3b8'
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: ACTIVE WORKFLOW RULES ────────────────────────── */}
      {activeTab === 'rules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {rules.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <Zap size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#cbd5e1' }}>
                No active automation rules
              </div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>
                Create a custom rule or install one from the Pre-Built Templates library.
              </div>
            </div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule._id}
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  borderRadius: '14px',
                  padding: '20px',
                  boxShadow: 'var(--shadow-md)',
                  transition: 'border-color 0.2s'
                }}
              >
                {/* Rule Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={() => handleToggleRule(rule._id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: rule.isActive ? '#10b981' : '#64748b'
                      }}
                      title={rule.isActive ? 'Active - Click to disable' : 'Inactive - Click to enable'}
                    >
                      {rule.isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                    </button>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>
                          {rule.name}
                        </span>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: rule.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                            color: rule.isActive ? '#34d399' : '#94a3b8'
                          }}
                        >
                          {rule.isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                        {rule.description || 'Automated CRM execution playbook'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Executed: <strong>{rule.executionCount || 0} times</strong>
                    </span>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setTestRule(rule);
                        setIsTestModalOpen(true);
                        setTestResult(null);
                      }}
                      style={{ gap: '6px' }}
                    >
                      <Play size={13} color="#818cf8" />
                      <span>Simulate</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDeleteRule(rule._id)}
                      style={{ color: '#f87171' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Visual Trigger - Condition - Action Chain */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '12px',
                    backgroundColor: '#131d33',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(148, 163, 184, 0.1)'
                  }}
                >
                  {/* WHEN Trigger */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#fbbf24', textTransform: 'uppercase', marginBottom: '6px' }}>
                      ⚡ 1. When Trigger Occurs
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(234, 179, 8, 0.15)', padding: '5px 10px', borderRadius: '6px', fontSize: '12.5px', color: '#fbbf24', fontWeight: '600' }}>
                      <Zap size={14} />
                      <span>{rule.trigger}</span>
                    </div>
                  </div>

                  {/* IF Conditions */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#818cf8', textTransform: 'uppercase', marginBottom: '6px' }}>
                      🔍 2. If Conditions Match ({rule.conditionLogic || 'AND'})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {rule.conditions && rule.conditions.length > 0 ? (
                        rule.conditions.map((c, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '12px',
                              backgroundColor: 'rgba(99, 102, 241, 0.12)',
                              color: '#cbd5e1',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontFamily: 'monospace'
                            }}
                          >
                            <strong>{c.field}</strong> {c.operator} <strong>"{String(c.value)}"</strong>
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>All events (No filters)</span>
                      )}
                    </div>
                  </div>

                  {/* THEN Actions Chain */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#34d399', textTransform: 'uppercase', marginBottom: '6px' }}>
                      🚀 3. Execute Action Chain
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {rule.actions.map((act, idx) => (
                        <span
                          key={idx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}
                        >
                          <Check size={12} />
                          <span>{act.actionType.replace('_', ' ')}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB 2: PRE-BUILT TEMPLATES ─────────────────────────── */}
      {activeTab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '14px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(99, 102, 241, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#818cf8'
                    }}
                  >
                    <Sparkles size={16} />
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>
                    {tmpl.name}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.4', marginBottom: '14px' }}>
                  {tmpl.description}
                </p>

                <div style={{ backgroundColor: '#131d33', padding: '10px', borderRadius: '8px', fontSize: '12px', color: '#cbd5e1', marginBottom: '16px' }}>
                  <div style={{ color: '#fbbf24', fontWeight: '600', marginBottom: '4px' }}>
                    Trigger: {tmpl.trigger}
                  </div>
                  <div>
                    Actions: {tmpl.actions.map((a) => a.actionType.replace('_', ' ')).join(' ➔ ')}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleInstallTemplate(tmpl)}
                style={{ width: '100%', gap: '6px' }}
              >
                <Plus size={14} />
                <span>Install Automation Playbook</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB 3: EXECUTION AUDIT LOGS ────────────────────────── */}
      {activeTab === 'logs' && (
        <div
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            borderRadius: '14px',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(148, 163, 184, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>
              Workflow Execution Audit Trail
            </div>
            <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>
              Showing latest {logs.length} execution events
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#131d33', color: '#94a3b8', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                  <th style={{ padding: '10px 16px' }}>Timestamp</th>
                  <th style={{ padding: '10px 16px' }}>Rule Name</th>
                  <th style={{ padding: '10px 16px' }}>Trigger Event</th>
                  <th style={{ padding: '10px 16px' }}>Status</th>
                  <th style={{ padding: '10px 16px' }}>Actions Executed</th>
                  <th style={{ padding: '10px 16px' }}>Latency</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                      No workflow execution events recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
                      <td style={{ padding: '10px 16px', color: '#94a3b8', fontSize: '12px' }}>
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}{' '}
                        {new Date(log.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '10px 16px', fontWeight: '600', color: '#fff' }}>
                        {log.ruleName}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#fbbf24', fontFamily: 'monospace' }}>
                        {log.trigger}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span
                          className="badge"
                          style={{
                            backgroundColor:
                              log.status === 'Success'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : log.status === 'Skipped'
                                ? 'rgba(148, 163, 184, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                            color:
                              log.status === 'Success'
                                ? '#34d399'
                                : log.status === 'Skipped'
                                ? '#94a3b8'
                                : '#f87171'
                          }}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#cbd5e1' }}>
                        {log.actionsExecuted && log.actionsExecuted.length > 0 ? (
                          log.actionsExecuted.map((a) => a.replace('_', ' ')).join(', ')
                        ) : (
                          <span style={{ color: '#64748b' }}>None (Conditions skipped)</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#94a3b8', fontSize: '12px' }}>
                        {log.executionTimeMs || 1}ms
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE WORKFLOW RULE ────────────────────────── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh'
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
                backgroundColor: '#131d33'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={20} color="var(--primary)" />
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>
                  Create Automation Rule
                </span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveRule} style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Rule Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High-Value Website Lead Auto-Assign"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-control"
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Briefly describe what this rule accomplishes"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-control"
                />
              </div>

              {/* Step 1: Trigger */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#fbbf24', marginBottom: '6px' }}>
                  ⚡ Step 1: Select Event Trigger *
                </label>
                <select
                  value={formData.trigger}
                  onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                  className="input-control"
                >
                  {TRIGGERS.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.category}] {t.label} ({t.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Conditions */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#818cf8' }}>
                    🔍 Step 2: Define Conditions (Filter Criteria)
                  </label>
                  <button
                    type="button"
                    onClick={addCondition}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 8px', fontSize: '11.5px', gap: '4px' }}
                  >
                    <Plus size={12} /> Add Condition
                  </button>
                </div>

                {formData.conditions.map((cond, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Field (e.g. expectedValue, status, source)"
                      value={cond.field}
                      onChange={(e) => {
                        const next = [...formData.conditions];
                        next[idx].field = e.target.value;
                        setFormData({ ...formData, conditions: next });
                      }}
                      className="input-control"
                      style={{ flex: 1 }}
                    />

                    <select
                      value={cond.operator}
                      onChange={(e) => {
                        const next = [...formData.conditions];
                        next[idx].operator = e.target.value;
                        setFormData({ ...formData, conditions: next });
                      }}
                      className="input-control"
                      style={{ width: '150px' }}
                    >
                      {OPERATORS.map((op) => (
                        <option key={op.id} value={op.id}>
                          {op.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Value (e.g. 50000, Won)"
                      value={cond.value}
                      onChange={(e) => {
                        const next = [...formData.conditions];
                        next[idx].value = e.target.value;
                        setFormData({ ...formData, conditions: next });
                      }}
                      className="input-control"
                      style={{ flex: 1 }}
                    />

                    <button
                      type="button"
                      onClick={() => removeCondition(idx)}
                      style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Step 3: Actions Chain */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#34d399' }}>
                    🚀 Step 3: Action Execution Chain *
                  </label>
                  <button
                    type="button"
                    onClick={addAction}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 8px', fontSize: '11.5px', gap: '4px' }}
                  >
                    <Plus size={12} /> Add Action
                  </button>
                </div>

                {formData.actions.map((act, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      marginBottom: '8px',
                      backgroundColor: '#131d33',
                      padding: '10px',
                      borderRadius: '8px',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8' }}>
                      #{idx + 1}
                    </span>

                    <select
                      value={act.actionType}
                      onChange={(e) => {
                        const next = [...formData.actions];
                        next[idx].actionType = e.target.value;
                        setFormData({ ...formData, actions: next });
                      }}
                      className="input-control"
                      style={{ flex: 1 }}
                    >
                      {ACTION_TYPES.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>

                    {formData.actions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAction(idx)}
                        style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>

                <button type="submit" disabled={saving} className="btn btn-primary" style={{ gap: '6px' }}>
                  {saving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
                  <span>Save & Activate Rule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: SIMULATE RULE ───────────────────────────────── */}
      {isTestModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '500px',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>
                Simulate Rule: {testRule?.name}
              </div>
              <button
                onClick={() => setIsTestModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '12.5px', color: '#94a3b8', marginBottom: '12px' }}>
              Enter sample payload JSON to test condition matching:
            </div>

            <textarea
              rows={6}
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              className="input-control"
              style={{ fontFamily: 'monospace', fontSize: '12.5px', marginBottom: '14px' }}
            />

            {testResult && (
              <div
                style={{
                  backgroundColor: testResult.conditionOutcome === 'MATCHED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${testResult.conditionOutcome === 'MATCHED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '14px',
                  fontSize: '13px'
                }}
              >
                <div style={{ fontWeight: '700', color: testResult.conditionOutcome === 'MATCHED' ? '#34d399' : '#f87171' }}>
                  Outcome: {testResult.conditionOutcome}
                </div>
                {testResult.conditionOutcome === 'MATCHED' && (
                  <div style={{ color: '#cbd5e1', fontSize: '12px', marginTop: '4px' }}>
                    Actions triggered: {testResult.willExecuteActions.join(', ')}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsTestModalOpen(false)}
              >
                Close
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSimulateRule}
                style={{ gap: '6px' }}
              >
                <Play size={14} />
                <span>Run Simulation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowsPage;
