import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import {
  Globe,
  Code,
  Webhook,
  Plus,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Send,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCode,
  Layers,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  Clock,
  Trash2,
  Edit2,
  X,
  Loader2,
  Activity,
  Terminal,
  ShieldCheck
} from 'lucide-react';

const LeadCaptureWebhooksPage = () => {
  const [activeTab, setActiveTab] = useState('forms'); // 'forms' | 'webhooks' | 'logs'
  const [forms, setForms] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Drawers
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSnippetModalOpen, setIsSnippetModalOpen] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [isPayloadModalOpen, setIsPayloadModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [selectedPayload, setSelectedPayload] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [revealedSecrets, setRevealedSecrets] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [testPingResult, setTestPingResult] = useState(null);

  // Form State
  const [formConfig, setFormConfig] = useState({
    title: 'Get In Touch & Free Consultation',
    description: 'Leave your details below and our product specialist will reach out within 2 hours.',
    submitButtonText: 'Submit & Get Callback',
    primaryColor: '#6366f1',
    defaultLeadSource: 'Website',
    thankYouMessage: '🎉 Thank you! Your inquiry has been received. Our team will contact you shortly.'
  });

  // Webhook State
  const [webhookConfig, setWebhookConfig] = useState({
    name: 'Zapier / Make Inbound Sync',
    targetUrl: 'https://webhook.site/demo-endpoint',
    events: ['lead.created', 'deal.won', 'payment.received']
  });

  // Fetch All Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [formsRes, webhooksRes, logsRes] = await Promise.all([
        api.get('/lead-forms'),
        api.get('/webhooks'),
        api.get('/webhooks/logs')
      ]);

      const formsData = formsRes?.data?.forms || formsRes?.forms || formsRes?.data || [];
      const webhooksData = webhooksRes?.data?.webhooks || webhooksRes?.webhooks || [];
      const eventsData = webhooksRes?.data?.availableEvents || webhooksRes?.availableEvents || [];
      const logsData = logsRes?.data?.logs || logsRes?.logs || [];

      setForms(Array.isArray(formsData) ? formsData : []);
      setWebhooks(Array.isArray(webhooksData) ? webhooksData : []);
      setAvailableEvents(Array.isArray(eventsData) ? eventsData : []);
      setLogs(Array.isArray(logsData) ? logsData : []);
    } catch (err) {
      console.error('Failed to load lead capture & webhooks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Copy Snippet Helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Toggle Secret Reveal
  const toggleSecret = (id) => {
    setRevealedSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Create Form
  const handleCreateForm = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await api.post('/lead-forms', formConfig);
      if (res?.success || res?.data?.success) {
        setIsFormModalOpen(false);
        fetchData();
      }
    } catch (err) {
      alert(err.customMessage || err.response?.data?.message || 'Failed to create lead capture form');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Form
  const handleDeleteForm = async (id) => {
    if (!window.confirm('Delete this lead capture form? Website embeds using this slug will cease to work.')) return;
    try {
      await api.delete(`/lead-forms/${id}`);
      setForms((prev) => prev.filter((f) => f._id !== id));
    } catch (err) {
      alert(err.customMessage || err.response?.data?.message || 'Failed to delete form');
    }
  };

  // Create Webhook
  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await api.post('/webhooks', webhookConfig);
      if (res?.success || res?.data?.success) {
        setIsWebhookModalOpen(false);
        setWebhookConfig({
          name: 'Zapier / Make Inbound Sync',
          targetUrl: 'https://webhook.site/demo-endpoint',
          events: ['lead.created', 'deal.won', 'payment.received']
        });
        fetchData();
      }
    } catch (err) {
      alert(err.customMessage || err.response?.data?.message || 'Failed to register webhook subscription');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Webhook
  const handleDeleteWebhook = async (id) => {
    if (!window.confirm('Delete this webhook endpoint subscription?')) return;
    try {
      await api.delete(`/webhooks/${id}`);
      setWebhooks((prev) => prev.filter((w) => w._id !== id));
    } catch (err) {
      alert(err.customMessage || err.response?.data?.message || 'Failed to delete webhook');
    }
  };

  // Trigger Test Ping
  const handleTestPing = async (webhook) => {
    try {
      setActionLoading(true);
      setTestPingResult(null);
      const res = await api.post(`/webhooks/${webhook._id}/test-ping`);
      const payload = res?.data || res;
      setTestPingResult({
        webhookId: webhook._id,
        success: payload?.success !== false,
        statusCode: payload?.statusCode || 200,
        latency: payload?.executionTimeMs || 45,
        message: payload?.message || 'Ping dispatched'
      });
      fetchData();
    } catch (err) {
      alert(err.customMessage || err.response?.data?.message || 'Failed to dispatch test ping');
    } finally {
      setActionLoading(false);
    }
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
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(99, 102, 241, 0.2))',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}
          >
            <Globe size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#fff' }}>
                Lead Capture & Developer Webhooks
              </h1>
              <span
                style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '700'
                }}
              >
                Inbound & Outbound
              </span>
            </div>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13.5px' }}>
              Embed branded lead capture widgets on your website and stream real-time events to Zapier, Make, and internal servers
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchData}
            style={{ gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          {activeTab === 'forms' ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsFormModalOpen(true)}
              style={{ gap: '6px' }}
            >
              <Plus size={16} />
              <span>Create Web Lead Form</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsWebhookModalOpen(true)}
              style={{ gap: '6px' }}
            >
              <Plus size={16} />
              <span>Register Webhook Endpoint</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
          marginBottom: '24px'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('forms')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'forms' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'forms' ? '#fff' : 'var(--text-muted)',
            fontWeight: activeTab === 'forms' ? '700' : '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Globe size={16} />
          <span>Embeddable Web Lead Forms ({forms.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('webhooks')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'webhooks' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'webhooks' ? '#fff' : 'var(--text-muted)',
            fontWeight: activeTab === 'webhooks' ? '700' : '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Webhook size={16} />
          <span>Outbound Webhook Endpoints ({webhooks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'logs' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'logs' ? '#fff' : 'var(--text-muted)',
            fontWeight: activeTab === 'logs' ? '700' : '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Activity size={16} />
          <span>Delivery Audit Logs ({logs.length})</span>
        </button>
      </div>

      {/* ── TAB 1: EMBEDDABLE LEAD FORMS ────────────────────────── */}
      {activeTab === 'forms' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {forms.map((form) => {
            const publicUrl = `http://localhost:5173/forms/${form.slug}`;
            return (
              <div
                key={form._id}
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  borderRadius: '16px',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span
                      style={{
                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}
                    >
                      Slug: /{form.slug}
                    </span>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: '8px 0 4px' }}>
                      {form.title}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleDeleteForm(form._id)}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                      title="Delete Form"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px', flex: '1' }}>
                  {form.description}
                </p>

                {/* Form Stats Bar */}
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12.5px'
                  }}
                >
                  <span style={{ color: '#94a3b8' }}>Total Inbound Leads:</span>
                  <strong style={{ color: '#10b981', fontSize: '14px' }}>
                    {form.submissionCount || 0} Submissions
                  </strong>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setSelectedForm(form);
                      setIsSnippetModalOpen(true);
                    }}
                    style={{ flex: 1, gap: '6px', fontSize: '12.5px' }}
                  >
                    <Code size={14} />
                    <span>Get Embed Code</span>
                  </button>

                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ gap: '6px', fontSize: '12.5px' }}
                  >
                    <ExternalLink size={14} />
                    <span>Open Form</span>
                  </a>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCopy(publicUrl, `url-${form._id}`)}
                    style={{ gap: '6px', fontSize: '12.5px' }}
                  >
                    {copiedKey === `url-${form._id}` ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{copiedKey === `url-${form._id}` ? 'Copied Link' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 2: OUTBOUND WEBHOOK ENDPOINTS ────────────────────── */}
      {activeTab === 'webhooks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {testPingResult && (
            <div
              style={{
                backgroundColor: testPingResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${testPingResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                padding: '12px 16px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#fff' }}>
                {testPingResult.success ? <CheckCircle2 size={18} color="#10b981" /> : <XCircle size={18} color="#f87171" />}
                <span>
                  Test ping dispatched — HTTP Status: <strong>{testPingResult.statusCode}</strong> (Latency: {testPingResult.latency}ms)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTestPingResult(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {webhooks.length === 0 ? (
            <div
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                borderRadius: '16px',
                padding: '40px',
                textAlign: 'center',
                color: 'var(--text-muted)'
              }}
            >
              <Webhook size={40} color="#818cf8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '6px' }}>No Webhooks Configured</h3>
              <p style={{ fontSize: '13.5px', marginBottom: '16px' }}>
                Stream real-time lead, deal, and payment updates to Zapier, Make.com, or your custom endpoints.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsWebhookModalOpen(true)}
              >
                Register Your First Webhook
              </button>
            </div>
          ) : (
            webhooks.map((webhook) => {
              const isRevealed = revealedSecrets[webhook._id];
              return (
                <div
                  key={webhook._id}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(148, 163, 184, 0.15)',
                    borderRadius: '14px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: 0 }}>
                          {webhook.name}
                        </h3>
                        <span
                          style={{
                            backgroundColor: webhook.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: webhook.isActive ? '#10b981' : '#f87171',
                            padding: '1px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '700'
                          }}
                        >
                          {webhook.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#38bdf8', marginTop: '4px', fontFamily: 'monospace' }}>
                        POST {webhook.targetUrl}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => handleTestPing(webhook)}
                        disabled={actionLoading}
                        style={{ gap: '6px', color: '#818cf8', borderColor: 'rgba(129, 140, 248, 0.3)' }}
                      >
                        <Send size={12} />
                        <span>Send Test Ping</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteWebhook(webhook._id)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                        title="Delete Webhook"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Subscribed Events Pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Events:</span>
                    {webhook.events?.map((ev) => (
                      <span
                        key={ev}
                        style={{
                          backgroundColor: '#1e293b',
                          color: '#cbd5e1',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontFamily: 'monospace'
                        }}
                      >
                        {ev}
                      </span>
                    ))}
                  </div>

                  {/* Secret Key & HMAC Bar */}
                  <div
                    style={{
                      backgroundColor: '#131d33',
                      border: '1px solid rgba(148, 163, 184, 0.1)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Lock size={13} color="#f59e0b" />
                      <span style={{ color: 'var(--text-muted)' }}>HMAC Secret:</span>
                      <code style={{ color: '#fff', fontSize: '12px' }}>
                        {isRevealed ? webhook.secretKey : '••••••••••••••••••••••••••••••••'}
                      </code>
                      <button
                        type="button"
                        onClick={() => toggleSecret(webhook._id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 4px' }}
                      >
                        {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Sent: <strong style={{ color: '#fff' }}>{webhook.deliveryStats?.totalSent || 0}</strong> (Success: {webhook.deliveryStats?.totalSuccess || 0})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(webhook.secretKey, `secret-${webhook._id}`)}
                        className="btn btn-secondary btn-xs"
                        style={{ gap: '4px' }}
                      >
                        {copiedKey === `secret-${webhook._id}` ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        <span>{copiedKey === `secret-${webhook._id}` ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Developer Verification Quick Reference */}
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.12)',
              borderRadius: '14px',
              padding: '20px',
              marginTop: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Terminal size={18} color="#38bdf8" />
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', margin: 0 }}>
                Verifying Webhook Signatures (HMAC SHA-256)
              </h4>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
              NexCRM signs every outbound payload with your secret key and passes the hash in header <code style={{ color: '#38bdf8' }}>X-NexCRM-Signature</code>.
            </p>
            <pre
              style={{
                backgroundColor: '#1e293b',
                padding: '12px',
                borderRadius: '8px',
                color: '#cbd5e1',
                fontSize: '12px',
                overflowX: 'auto',
                margin: 0
              }}
            >
{`// Node.js Verification Example:
const crypto = require('crypto');
const signature = req.headers['x-nexcrm-signature'];
const expected = crypto.createHmac('sha256', SECRET_KEY).update(JSON.stringify(req.body)).digest('hex');
if (signature === expected) {
  // Webhook is authentic and unmodified from NexCRM
}`}
            </pre>
          </div>
        </div>
      )}

      {/* ── TAB 3: DELIVERY AUDIT LOGS ──────────────────────────── */}
      {activeTab === 'logs' && (
        <div
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: '14px',
            overflow: 'hidden'
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#131d33', borderBottom: '1px solid rgba(148, 163, 184, 0.12)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>Event Name</th>
                <th style={{ padding: '12px 16px' }}>Target Webhook URL</th>
                <th style={{ padding: '12px 16px' }}>HTTP Status</th>
                <th style={{ padding: '12px 16px' }}>Latency</th>
                <th style={{ padding: '12px 16px' }}>Timestamp</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Payload</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No webhook delivery events logged yet. Trigger a Test Ping or create a lead.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isSuccess = log.status === 'success' || (log.statusCode >= 200 && log.statusCode < 300);
                  return (
                    <tr key={log._id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <code style={{ color: '#38bdf8', fontWeight: '700' }}>{log.event}</code>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#cbd5e1', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.targetUrl}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            backgroundColor: isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isSuccess ? '#10b981' : '#f87171',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700'
                          }}
                        >
                          {log.statusCode || 'N/A'} {isSuccess ? 'OK' : 'ERR'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                        {log.executionTimeMs} ms
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => {
                            setSelectedPayload(log);
                            setIsPayloadModalOpen(true);
                          }}
                          style={{ gap: '4px' }}
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL: EMBED CODE SNIPPETS ──────────────────────────── */}
      {isSnippetModalOpen && selectedForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '680px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code size={20} color="#38bdf8" />
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>
                  Embed Code Snippets: {selectedForm.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSnippetModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Option 1: Direct Link */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                🌐 Direct Shareable Link (No Code Required)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={selectedForm.snippets?.publicUrl || `http://localhost:5173/forms/${selectedForm.slug}`}
                  style={{ flex: 1, padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '12.5px' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleCopy(selectedForm.snippets?.publicUrl || `http://localhost:5173/forms/${selectedForm.slug}`, 'modal-direct')}
                >
                  {copiedKey === 'modal-direct' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Option 2: HTML Form */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>
                  📋 Standard HTML Form Snippet (Full CSS & Field Control)
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => handleCopy(selectedForm.snippets?.htmlSnippet || '', 'modal-html')}
                  style={{ gap: '4px' }}
                >
                  {copiedKey === 'modal-html' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  <span>{copiedKey === 'modal-html' ? 'Copied' : 'Copy HTML'}</span>
                </button>
              </div>
              <pre
                style={{
                  backgroundColor: '#1e293b',
                  padding: '12px',
                  borderRadius: '8px',
                  color: '#cbd5e1',
                  fontSize: '11.5px',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  margin: 0
                }}
              >
                {selectedForm.snippets?.htmlSnippet}
              </pre>
            </div>

            {/* Option 3: iFrame Embed */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>
                  🖼️ Responsive iFrame Embed
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => handleCopy(selectedForm.snippets?.iframeSnippet || '', 'modal-iframe')}
                  style={{ gap: '4px' }}
                >
                  {copiedKey === 'modal-iframe' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  <span>{copiedKey === 'modal-iframe' ? 'Copied' : 'Copy iFrame'}</span>
                </button>
              </div>
              <pre
                style={{
                  backgroundColor: '#1e293b',
                  padding: '12px',
                  borderRadius: '8px',
                  color: '#cbd5e1',
                  fontSize: '11.5px',
                  margin: 0
                }}
              >
                {selectedForm.snippets?.iframeSnippet}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE FORM ─────────────────────────────────── */}
      {isFormModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>
                Create Lead Capture Form
              </h3>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateForm}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Form Title *
                </label>
                <input
                  type="text"
                  required
                  value={formConfig.title}
                  onChange={(e) => setFormConfig({ ...formConfig, title: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Description / Subtitle
                </label>
                <textarea
                  rows={2}
                  value={formConfig.description}
                  onChange={(e) => setFormConfig({ ...formConfig, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                ></textarea>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                    Submit Button Text
                  </label>
                  <input
                    type="text"
                    value={formConfig.submitButtonText}
                    onChange={(e) => setFormConfig({ ...formConfig, submitButtonText: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                    Primary Color
                  </label>
                  <input
                    type="color"
                    value={formConfig.primaryColor}
                    onChange={(e) => setFormConfig({ ...formConfig, primaryColor: e.target.value })}
                    style={{ width: '100%', height: '38px', padding: '2px 4px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsFormModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary btn-sm"
                >
                  {actionLoading ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                  <span>Create Form</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTER WEBHOOK ─────────────────────────────── */}
      {isWebhookModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '540px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Webhook size={20} color="#818cf8" />
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>
                  Register Webhook Endpoint
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWebhookModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateWebhook}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Subscription Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zapier Lead Router"
                  value={webhookConfig.name}
                  onChange={(e) => setWebhookConfig({ ...webhookConfig, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Target Endpoint URL (HTTPS recommended) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://your-api.com/webhooks/nexcrm"
                  value={webhookConfig.targetUrl}
                  onChange={(e) => setWebhookConfig({ ...webhookConfig, targetUrl: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Subscribe to Events:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {availableEvents.map((ev) => {
                    const isChecked = webhookConfig.events.includes(ev.id);
                    return (
                      <label
                        key={ev.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          backgroundColor: isChecked ? 'rgba(129, 140, 248, 0.12)' : '#1e293b',
                          border: isChecked ? '1px solid #818cf8' : '1px solid rgba(148, 163, 184, 0.1)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newEvents = e.target.checked
                              ? [...webhookConfig.events, ev.id]
                              : webhookConfig.events.filter((x) => x !== ev.id);
                            setWebhookConfig({ ...webhookConfig, events: newEvents });
                          }}
                        />
                        <span>{ev.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsWebhookModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary btn-sm"
                >
                  {actionLoading ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                  <span>Register Endpoint</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: INSPECT LOG PAYLOAD ──────────────────────────── */}
      {isPayloadModalOpen && selectedPayload && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '600px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} color="#38bdf8" />
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>
                  Event Payload: {selectedPayload.event}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPayloadModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Target: <code style={{ color: '#38bdf8' }}>{selectedPayload.targetUrl}</code> • Latency: {selectedPayload.executionTimeMs}ms
            </div>

            <pre
              style={{
                backgroundColor: '#1e293b',
                padding: '14px',
                borderRadius: '8px',
                color: '#cbd5e1',
                fontSize: '12px',
                maxHeight: '320px',
                overflowY: 'auto'
              }}
            >
              {JSON.stringify(selectedPayload.payload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadCaptureWebhooksPage;
