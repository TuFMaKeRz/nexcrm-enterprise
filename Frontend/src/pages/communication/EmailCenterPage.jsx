import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Server,
  FileText,
  Sparkles,
  RefreshCw,
  Eye,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Clock,
  History,
  X,
  Phone,
  Search,
  CheckCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const EmailCenterPage = () => {
  const { user, organization } = useAuth();
  const currencySymbol = organization?.localization?.currencySymbol || '₹';

  // Navigation tab: 'composer' | 'templates' | 'whatsapp' | 'logs' | 'tester'
  const [activeTab, setActiveTab] = useState('composer');

  // Common data
  const [templates, setTemplates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Email Composer State
  const [composerData, setComposerData] = useState({
    recipientType: 'customer', // 'customer' | 'lead' | 'custom'
    recipientId: '',
    to: '',
    recipientName: '',
    templateId: '',
    subject: '',
    bodyHtml: '',
    variables: {
      quotation_number: 'QT-2026-0001',
      invoice_number: 'INV-2026-0001',
      amount: '₹45,000',
      due_date: '30/09/2026',
      deal_name: 'Enterprise Cloud CRM'
    }
  });
  const [composerLoading, setComposerLoading] = useState(false);
  const [composerResult, setComposerResult] = useState(null);
  const [composerError, setComposerError] = useState('');

  // 2. WhatsApp Composer State
  const [whatsappData, setWhatsappData] = useState({
    recipientType: 'customer',
    phone: '',
    recipientName: '',
    message: 'Hello {{customer_name}}, thank you for partnering with {{company_name}}! Please let us know if you have any questions.',
    variables: {
      quotation_number: 'QT-2026-0001',
      amount: '₹45,000'
    }
  });
  const [whatsappResult, setWhatsappResult] = useState(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  // 3. Template Manager Modal State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'General',
    subject: '',
    bodyHtml: '',
    variables: 'customer_name, company_name, user_name'
  });

  // 4. SMTP Tester State
  const [testEmail, setTestEmail] = useState(user?.email || 'owner@acme.com');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState('');

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [tplRes, custRes, leadRes, logsRes] = await Promise.all([
        axios.get('/api/v1/communication/templates', { headers }),
        axios.get('/api/v1/customers', { headers }),
        axios.get('/api/v1/leads', { headers }),
        axios.get('/api/v1/communication/logs?limit=30', { headers })
      ]);

      if (tplRes.data?.success) setTemplates(tplRes.data.data || []);
      if (custRes.data?.success) setCustomers(custRes.data.data.customers || custRes.data.data || []);
      if (leadRes.data?.success) setLeads(leadRes.data.data.leads || leadRes.data.data || []);
      if (logsRes.data?.success) setLogs(logsRes.data.data.logs || []);
    } catch (err) {
      console.error('Failed to load communication hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Recipient selection in Composer
  const handleRecipientSelect = (id, type) => {
    if (type === 'customer') {
      const c = customers.find((cust) => cust._id === id);
      if (c) {
        setComposerData((prev) => ({
          ...prev,
          recipientId: c._id,
          to: c.email || '',
          recipientName: c.companyName || c.name || ''
        }));
      }
    } else if (type === 'lead') {
      const l = leads.find((lead) => lead._id === id);
      if (l) {
        setComposerData((prev) => ({
          ...prev,
          recipientId: l._id,
          to: l.email || '',
          recipientName: `${l.firstName} ${l.lastName}`
        }));
      }
    }
  };

  // Handle Template selection in Composer
  const handleSelectTemplate = (templateId) => {
    const tpl = templates.find((t) => t._id === templateId);
    if (tpl) {
      setComposerData((prev) => ({
        ...prev,
        templateId,
        subject: tpl.subject,
        bodyHtml: tpl.bodyHtml
      }));
    } else {
      setComposerData((prev) => ({ ...prev, templateId: '', subject: '', bodyHtml: '' }));
    }
  };

  // Send Direct Email
  const handleSendEmail = async (e) => {
    e.preventDefault();
    setComposerError('');
    setComposerResult(null);
    setComposerLoading(true);

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        to: composerData.to,
        recipientName: composerData.recipientName,
        subject: composerData.subject,
        templateId: composerData.templateId || undefined,
        bodyHtml: composerData.bodyHtml,
        variables: composerData.variables,
        relatedCustomer: composerData.recipientType === 'customer' ? composerData.recipientId : undefined,
        relatedLead: composerData.recipientType === 'lead' ? composerData.recipientId : undefined
      };

      const res = await axios.post('/api/v1/communication/email/send', payload, { headers });
      if (res.data?.success) {
        setComposerResult(res.data.data);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to send email:', err);
      setComposerError(err.response?.data?.message || 'Error dispatching email');
    } finally {
      setComposerLoading(false);
    }
  };

  // Dispatch WhatsApp Message
  const handleSendWhatsApp = async (e) => {
    e.preventDefault();
    setWhatsappResult(null);
    setWhatsappLoading(true);

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        phone: whatsappData.phone,
        recipientName: whatsappData.recipientName,
        message: whatsappData.message,
        variables: whatsappData.variables
      };

      const res = await axios.post('/api/v1/communication/whatsapp/send', payload, { headers });
      if (res.data?.success) {
        setWhatsappResult(res.data.data);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to send WhatsApp message:', err);
      alert(err.response?.data?.message || 'Error creating WhatsApp message');
    } finally {
      setWhatsappLoading(false);
    }
  };

  // Template Save / Create
  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        ...templateForm,
        variables: templateForm.variables.split(',').map((v) => v.trim()).filter(Boolean)
      };

      if (editingTemplate) {
        await axios.put(`/api/v1/communication/templates/${editingTemplate._id}`, payload, { headers });
      } else {
        await axios.post('/api/v1/communication/templates', payload, { headers });
      }

      setShowTemplateModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save template:', err);
      alert(err.response?.data?.message || 'Error saving template');
    }
  };

  // Delete Template
  const handleDeleteTemplate = async (tpl) => {
    if (!window.confirm(`Delete template "${tpl.name}"?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/communication/templates/${tpl._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  // Test SMTP
  const handleTestSmtp = async (e) => {
    e.preventDefault();
    setTestError('');
    setTestResult(null);
    setTestLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        '/api/v1/communication/email/test',
        { toEmail: testEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        setTestResult(res.data.data);
      }
    } catch (err) {
      setTestError(err.response?.data?.message || 'SMTP test failed');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>
            Communication & Notification Center
          </h1>
          <span
            style={{
              fontSize: '12px',
              fontWeight: '600',
              padding: '3px 9px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}
          >
            Module 10
          </span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '4px' }}>
          Dispatch transactional emails with dynamic templates, launch WhatsApp client chats, and view historical communication logs.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
          marginBottom: '24px',
          flexWrap: 'wrap'
        }}
      >
        {[
          { id: 'composer', label: 'Email Composer', icon: Mail },
          { id: 'templates', label: `Templates (${templates.length})`, icon: FileText },
          { id: 'whatsapp', label: 'WhatsApp Messaging', icon: MessageSquare },
          { id: 'logs', label: `Communication Logs (${logs.length})`, icon: History },
          { id: 'tester', label: 'SMTP Connection', icon: Server }
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
                padding: '9px 16px',
                borderRadius: '8px 8px 0 0',
                border: '1px solid transparent',
                borderBottom: isActive ? '2px solid #6366f1' : 'none',
                background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                color: isActive ? '#f8fafc' : '#94a3b8',
                fontWeight: isActive ? '600' : '500',
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} color={isActive ? '#818cf8' : '#94a3b8'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: EMAIL COMPOSER */}
      {activeTab === 'composer' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          {/* Left: Composer Form */}
          <div
            style={{
              background: 'var(--card-bg, #111827)',
              border: '1px solid rgba(148, 163, 184, 0.12)',
              borderRadius: '12px',
              padding: '24px'
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={18} color="#818cf8" />
              Direct Email Composer
            </h3>

            {composerResult && (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  color: '#34d399',
                  fontSize: '13px',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>Email dispatched successfully!</span>
                {composerResult.previewUrl && (
                  <a
                    href={composerResult.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#fff', textDecoration: 'underline', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    View Ethereal Preview <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}

            {composerError && (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#f87171',
                  fontSize: '13px',
                  marginBottom: '16px'
                }}
              >
                {composerError}
              </div>
            )}

            <form onSubmit={handleSendEmail}>
              {/* Recipient Source Selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    Recipient Type
                  </label>
                  <select
                    value={composerData.recipientType}
                    onChange={(e) => setComposerData({ ...composerData, recipientType: e.target.value, recipientId: '', to: '', recipientName: '' })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  >
                    <option value="customer">Customer</option>
                    <option value="lead">Lead</option>
                    <option value="custom">Custom Address</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    Select Record
                  </label>
                  {composerData.recipientType === 'customer' ? (
                    <select
                      value={composerData.recipientId}
                      onChange={(e) => handleRecipientSelect(e.target.value, 'customer')}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    >
                      <option value="">-- Choose Customer --</option>
                      {customers.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.companyName || c.name} ({c.email})
                        </option>
                      ))}
                    </select>
                  ) : composerData.recipientType === 'lead' ? (
                    <select
                      value={composerData.recipientId}
                      onChange={(e) => handleRecipientSelect(e.target.value, 'lead')}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    >
                      <option value="">-- Choose Lead --</option>
                      {leads.map((l) => (
                        <option key={l._id} value={l._id}>
                          {l.firstName} {l.lastName} - {l.company} ({l.email})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="email"
                      placeholder="client@company.com"
                      value={composerData.to}
                      onChange={(e) => setComposerData({ ...composerData, to: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Template Picker */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  Load Reusable Template
                </label>
                <select
                  value={composerData.templateId}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                >
                  <option value="">-- Custom Email / No Template --</option>
                  {templates.map((tpl) => (
                    <option key={tpl._id} value={tpl._id}>
                      [{tpl.category}] {tpl.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  Email Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quotation #QT-2026-0001 from Acme Corp"
                  value={composerData.subject}
                  onChange={(e) => setComposerData({ ...composerData, subject: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Body HTML */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  HTML / Text Message Content *
                </label>
                <textarea
                  rows="7"
                  required
                  placeholder="Enter message body or HTML content..."
                  value={composerData.bodyHtml}
                  onChange={(e) => setComposerData({ ...composerData, bodyHtml: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={composerLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 22px',
                    background: '#6366f1',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
                  }}
                >
                  <Send size={15} />
                  {composerLoading ? 'Sending...' : 'Dispatch Email'}
                </button>
              </div>
            </form>
          </div>

          {/* Right: Variable Reference & Preview */}
          <div
            style={{
              background: 'var(--card-bg, #111827)',
              border: '1px solid rgba(148, 163, 184, 0.12)',
              borderRadius: '12px',
              padding: '24px'
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', marginBottom: '12px' }}>
              Dynamic Variables Preview
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
              Use these variable tags inside subjects and templates. They will automatically be replaced upon sending.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {[
                { tag: '{{customer_name}}', val: composerData.recipientName || 'Valued Client' },
                { tag: '{{company_name}}', val: organization?.name || 'NexCRM Enterprise' },
                { tag: '{{user_name}}', val: user?.fullName || 'Sales Team' },
                { tag: '{{quotation_number}}', val: composerData.variables.quotation_number },
                { tag: '{{invoice_number}}', val: composerData.variables.invoice_number },
                { tag: '{{amount}}', val: composerData.variables.amount },
                { tag: '{{due_date}}', val: composerData.variables.due_date }
              ].map((v) => (
                <div
                  key={v.tag}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                >
                  <code style={{ color: '#818cf8', fontWeight: '600' }}>{v.tag}</code>
                  <span style={{ color: '#cbd5e1' }}>{v.val}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: '14px',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#a5b4fc',
                lineHeight: 1.5
              }}
            >
              💡 <strong>Tip:</strong> All sent emails are automatically recorded in the customer's 360° communication timeline and audit log!
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEMPLATE CATALOG */}
      {activeTab === 'templates' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ color: '#94a3b8', fontSize: '13px' }}>
              Create reusable email templates with placeholder variables for quick sales outreach.
            </div>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setTemplateForm({ name: '', category: 'General', subject: '', bodyHtml: '', variables: 'customer_name, company_name, user_name' });
                setShowTemplateModal(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: '#6366f1',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Plus size={15} /> + New Template
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
            {templates.map((tpl) => (
              <div
                key={tpl._id}
                style={{
                  background: 'var(--card-bg, #111827)',
                  border: '1px solid rgba(148, 163, 184, 0.12)',
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '15.5px', fontWeight: '700', color: '#f8fafc' }}>{tpl.name}</h4>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: '#818cf8'
                      }}
                    >
                      {tpl.category}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>
                    <strong>Subject:</strong> {tpl.subject}
                  </div>

                  <div
                    style={{
                      padding: '10px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      color: '#64748b',
                      marginBottom: '12px',
                      maxHeight: '100px',
                      overflowY: 'auto'
                    }}
                    dangerouslySetInnerHTML={{ __html: tpl.bodyHtml }}
                  />

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
                    {(tpl.variables || []).map((v) => (
                      <span key={v} style={{ fontSize: '10.5px', background: '#1e293b', color: '#818cf8', padding: '1px 5px', borderRadius: '3px' }}>
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
                  <button
                    onClick={() => {
                      setEditingTemplate(tpl);
                      setTemplateForm({
                        name: tpl.name,
                        category: tpl.category,
                        subject: tpl.subject,
                        bodyHtml: tpl.bodyHtml,
                        variables: (tpl.variables || []).join(', ')
                      });
                      setShowTemplateModal(true);
                    }}
                    style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#cbd5e1', padding: '4px 8px', cursor: 'pointer' }}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(tpl)}
                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', color: '#f87171', padding: '4px 8px', cursor: 'pointer' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: WHATSAPP HUB */}
      {activeTab === 'whatsapp' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          <div
            style={{
              background: 'var(--card-bg, #111827)',
              border: '1px solid rgba(148, 163, 184, 0.12)',
              borderRadius: '12px',
              padding: '24px'
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} color="#22c55e" />
              WhatsApp Message Dispatcher
            </h3>

            {whatsappResult && (
              <div
                style={{
                  padding: '14px 16px',
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  color: '#4ade80',
                  fontSize: '13px',
                  marginBottom: '16px'
                }}
              >
                <div>Message logged in communication history!</div>
                {whatsappResult.clickToChatUrl && (
                  <div style={{ marginTop: '8px' }}>
                    <a
                      href={whatsappResult.clickToChatUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#22c55e',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '12px'
                      }}
                    >
                      <span>Open WhatsApp Web Chat</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSendWhatsApp}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  Recipient Phone (with country code) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+919876543210"
                  value={whatsappData.phone}
                  onChange={(e) => setWhatsappData({ ...whatsappData, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  Recipient Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={whatsappData.recipientName}
                  onChange={(e) => setWhatsappData({ ...whatsappData, recipientName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  WhatsApp Template Message *
                </label>
                <textarea
                  rows="4"
                  required
                  value={whatsappData.message}
                  onChange={(e) => setWhatsappData({ ...whatsappData, message: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={whatsappLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 20px',
                    background: '#16a34a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <MessageSquare size={15} />
                  Send & Launch WhatsApp
                </button>
              </div>
            </form>
          </div>

          {/* WhatsApp API Architecture info */}
          <div
            style={{
              background: 'var(--card-bg, #111827)',
              border: '1px solid rgba(148, 163, 184, 0.12)',
              borderRadius: '12px',
              padding: '24px'
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', marginBottom: '12px' }}>
              WhatsApp Business API Architecture
            </h3>
            <div style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: 1.6 }}>
              <p style={{ marginBottom: '12px' }}>
                NexCRM provides an API-ready webhook and messaging architecture for verified WhatsApp Business Cloud API providers (Meta Cloud API, Twilio, Gupshup).
              </p>
              <div
                style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '14px',
                  fontFamily: 'monospace',
                  fontSize: '11.5px',
                  color: '#38bdf8'
                }}
              >
                Webhook URL: /api/v1/communication/whatsapp/webhook
              </div>
              <p>
                Messages sent via both Cloud API and direct click-to-chat links are recorded in the customer's communication history.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COMMUNICATION LOGS */}
      {activeTab === 'logs' && (
        <div
          style={{
            background: 'var(--card-bg, #111827)',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 16px' }}>Channel</th>
                  <th style={{ padding: '12px 16px' }}>Recipient</th>
                  <th style={{ padding: '12px 16px' }}>Subject / Template</th>
                  <th style={{ padding: '12px 16px' }}>Dispatched At</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Preview</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                      No communication logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.4)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: log.channel === 'WhatsApp' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                            color: log.channel === 'WhatsApp' ? '#4ade80' : '#818cf8'
                          }}
                        >
                          {log.channel}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '600', color: '#f8fafc' }}>
                          {log.recipientName || log.recipientEmail || log.recipientPhone}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {log.recipientEmail || log.recipientPhone}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                        {log.subject || log.templateName || 'Direct Message'}
                      </td>

                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '12px' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: '600',
                            color: log.status === 'Sent' || log.status === 'Delivered' ? '#34d399' : '#f87171'
                          }}
                        >
                          ● {log.status}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {log.previewUrl && (
                          <a
                            href={log.previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#818cf8', fontSize: '12px', textDecoration: 'underline' }}
                          >
                            Ethereal View ↗
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: SMTP TESTER */}
      {activeTab === 'tester' && (
        <div style={{ maxWidth: '600px' }}>
          <div
            style={{
              background: 'var(--card-bg, #111827)',
              border: '1px solid rgba(148, 163, 184, 0.12)',
              borderRadius: '12px',
              padding: '24px'
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={18} color="#818cf8" />
              Verify SMTP Connection
            </h3>

            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '18px' }}>
              Trigger a live test email to verify your organization's SMTP server host, port, and authentication credentials.
            </p>

            {testResult && (
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  color: '#34d399',
                  fontSize: '13px',
                  marginBottom: '16px'
                }}
              >
                <div>✓ SMTP test verification email dispatched successfully!</div>
                {testResult.previewUrl && (
                  <div style={{ marginTop: '8px' }}>
                    <a
                      href={testResult.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#fff', textDecoration: 'underline', fontSize: '12px' }}
                    >
                      Open Ethereal Mailbox Preview ↗
                    </a>
                  </div>
                )}
              </div>
            )}

            {testError && (
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#f87171',
                  fontSize: '13px',
                  marginBottom: '16px'
                }}
              >
                {testError}
              </div>
            )}

            <form onSubmit={handleTestSmtp}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  Target Verification Email
                </label>
                <input
                  type="email"
                  required
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={testLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  background: '#6366f1',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <Server size={15} />
                {testLoading ? 'Verifying...' : 'Send Live Test Email'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TEMPLATE CREATE / EDIT MODAL */}
      {showTemplateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#111827',
              border: '1px solid #334155',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '640px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #1f2937',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>
                {editingTemplate ? 'Edit Template' : 'New Email Template'}
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lead Follow-Up"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    Category
                  </label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  >
                    <option value="Lead">Lead</option>
                    <option value="Quotation">Quotation</option>
                    <option value="Invoice">Invoice</option>
                    <option value="Deal">Deal</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  Email Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Updates on {{quotation_number}} for {{customer_name}}"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  HTML Content *
                </label>
                <textarea
                  rows="6"
                  required
                  placeholder="<p>Dear {{customer_name}}, ...</p>"
                  value={templateForm.bodyHtml}
                  onChange={(e) => setTemplateForm({ ...templateForm, bodyHtml: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  Variables (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="customer_name, company_name, quotation_number, amount"
                  value={templateForm.variables}
                  onChange={(e) => setTemplateForm({ ...templateForm, variables: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  style={{ padding: '8px 16px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#cbd5e1', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', background: '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailCenterPage;
