import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  ArrowRight,
  TrendingUp,
  Edit2,
  Trash2,
  X,
  Building2,
  AlertCircle,
  Eye,
  Send,
  Sparkles,
  Receipt
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ItemQuickSelector from '../../components/common/ItemQuickSelector';
import PrintDocumentModal from '../../components/common/PrintDocumentModal';

const QuotationsPage = () => {
  const { hasPermission, organization } = useAuth();
  const navigate = useNavigate();
  const canManage = hasPermission('quotations:create') || hasPermission('quotations:edit');
  const currencySymbol = organization?.localization?.currencySymbol || '₹';

  // Data states
  const [quotations, setQuotations] = useState([]);
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Form State
  const initialForm = {
    customer: '',
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(+new Date() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [],
    termsAndConditions:
      '1. Prices are valid for 30 days from the issue date.\n2. Payment terms: 50% advance, 50% upon delivery/completion.\n3. Applicable taxes will be charged as per government regulations.',
    notes: '',
    status: 'Draft'
  };
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch Quotations, Stats, and Customers
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const [quotesRes, statsRes, custRes] = await Promise.all([
        axios.get(`/api/v1/quotations?${params.toString()}`, { headers }),
        axios.get('/api/v1/quotations/stats', { headers }),
        axios.get('/api/v1/customers', { headers })
      ]);

      if (quotesRes.data?.success) setQuotations(quotesRes.data.data.items || []);
      if (statsRes.data?.success) setStats(statsRes.data.data);
      if (custRes.data?.success) setCustomers(custRes.data.data.customers || custRes.data.data || []);
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, searchTerm]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingQuotation(null);
    setFormData({
      ...initialForm,
      customer: customers[0]?._id || ''
    });
    setFormError('');
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (quote) => {
    setEditingQuotation(quote);
    setFormData({
      customer: quote.customer?._id || quote.customer || '',
      issueDate: quote.issueDate ? new Date(quote.issueDate).toISOString().split('T')[0] : '',
      validUntil: quote.validUntil ? new Date(quote.validUntil).toISOString().split('T')[0] : '',
      items: quote.items || [],
      termsAndConditions: quote.termsAndConditions || '',
      notes: quote.notes || '',
      status: quote.status || 'Draft'
    });
    setFormError('');
    setShowCreateModal(true);
  };

  // Save Quotation
  const handleSaveQuotation = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.customer) {
      setFormError('Please select a customer account');
      return;
    }
    if (!formData.items || formData.items.length === 0) {
      setFormError('Please add at least one line item to the quotation');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingQuotation) {
        await axios.put(`/api/v1/quotations/${editingQuotation._id}`, formData, { headers });
      } else {
        await axios.post('/api/v1/quotations', formData, { headers });
      }

      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save quotation:', err);
      setFormError(err.response?.data?.message || 'Error saving quotation');
    } finally {
      setSubmitting(false);
    }
  };

  // 1-Click Convert to Invoice
  const handleConvertToInvoice = async (quote) => {
    if (quote.status === 'Converted') {
      alert('This quotation is already converted to an invoice.');
      return;
    }
    if (!window.confirm(`Convert Quotation "${quote.quotationNumber}" into an active Invoice?`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/v1/quotations/${quote._id}/convert`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        alert(`Successfully converted to Invoice ${res.data.data.invoice.invoiceNumber}! Redirecting to Invoices...`);
        navigate('/invoices');
      }
    } catch (err) {
      console.error('Failed to convert quotation:', err);
      alert(err.response?.data?.message || 'Failed to convert quotation to invoice');
    }
  };

  // Status quick update (e.g. mark Sent, Approved, Rejected)
  const handleStatusChange = async (quote, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/v1/quotations/${quote._id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.message || 'Failed to update quotation status');
    }
  };

  // Delete Quotation
  const handleDeleteQuotation = async (quote) => {
    if (!window.confirm(`Are you sure you want to delete quotation "${quote.quotationNumber}"?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/quotations/${quote._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error('Failed to delete quotation:', err);
    }
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>
              Quotations & Estimates
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
              Module 9
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '4px' }}>
            Create formal price quotes, export branded PDF estimates, and convert approved quotes to invoices in 1 click.
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: '#6366f1',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={16} />
            + New Quotation
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {/* Total Quotes */}
        <div
          style={{
            background: 'var(--card-bg, #111827)',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Total Quotations</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', marginTop: '2px' }}>
              {stats?.totalQuotes ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              All lifetime proposals
            </div>
          </div>
        </div>

        {/* Pipeline Value */}
        <div
          style={{
            background: 'var(--card-bg, #111827)',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Quote Pipeline Value</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', marginTop: '2px' }}>
              {currencySymbol} {(stats?.totalPipelineValue || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Total estimated gross value
            </div>
          </div>
        </div>

        {/* Approved Quotes */}
        <div
          style={{
            background: 'var(--card-bg, #111827)',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Approved Quotes</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#34d399', marginTop: '2px' }}>
              {stats?.approvedCount ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>
              Ready for conversion to invoice
            </div>
          </div>
        </div>

        {/* Converted Invoices */}
        <div
          style={{
            background: 'var(--card-bg, #111827)',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(168, 85, 247, 0.15)',
              color: '#c084fc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Receipt size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Converted to Invoices</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#c084fc', marginTop: '2px' }}>
              {stats?.convertedCount ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: '#a855f7', marginTop: '2px' }}>
              {stats?.conversionRate ?? 0}% Conversion Rate
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: 'var(--card-bg, #111827)',
          border: '1px solid rgba(148, 163, 184, 0.12)',
          borderRadius: '12px',
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Status Tabs */}
        <div
          style={{
            display: 'flex',
            background: '#0f172a',
            borderRadius: '8px',
            padding: '3px',
            border: '1px solid #334155'
          }}
        >
          {['all', 'Draft', 'Sent', 'Approved', 'Converted', 'Rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: statusFilter === st ? '600' : '500',
                background: statusFilter === st ? '#6366f1' : 'transparent',
                color: statusFilter === st ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {st === 'all' ? 'All Quotes' : st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '6px 12px',
            gap: '8px',
            minWidth: '240px'
          }}
        >
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by quote number or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f8fafc',
              fontSize: '13px',
              outline: 'none',
              width: '100%'
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Quotations Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid rgba(99, 102, 241, 0.2)',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite'
            }}
          />
          Loading quotations...
        </div>
      ) : quotations.length === 0 ? (
        <div
          style={{
            background: 'var(--card-bg, #111827)',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            padding: '50px 20px',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}
          >
            <FileText size={28} />
          </div>
          <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#f8fafc' }}>
            No quotations found
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '6px', maxWidth: '440px', margin: '6px auto 20px' }}>
            {searchTerm || statusFilter !== 'all'
              ? 'No quotations match the active filters.'
              : 'Create your first quotation by selecting products and services from your catalog.'}
          </p>
          {canManage && (
            <button
              onClick={handleOpenCreate}
              style={{
                padding: '9px 18px',
                backgroundColor: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              + Create First Quotation
            </button>
          )}
        </div>
      ) : (
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
                  <th style={{ padding: '12px 16px' }}>Quote #</th>
                  <th style={{ padding: '12px 16px' }}>Customer Account</th>
                  <th style={{ padding: '12px 16px' }}>Valid Until</th>
                  <th style={{ padding: '12px 16px' }}>Grand Total</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((quote) => {
                  const customer = quote.customer || {};
                  const isConverted = quote.status === 'Converted';
                  const isApproved = quote.status === 'Approved';

                  return (
                    <tr
                      key={quote._id}
                      style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.4)' }}
                    >
                      {/* Quote Number & Date */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={15} color="#818cf8" />
                          <span>{quote.quotationNumber}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Issued: {new Date(quote.issueDate).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '600', color: '#cbd5e1' }}>
                          {customer.companyName || customer.name || 'Unknown Customer'}
                        </div>
                        {customer.email && (
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {customer.email}
                          </div>
                        )}
                      </td>

                      {/* Valid Until */}
                      <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                        {new Date(quote.validUntil).toLocaleDateString()}
                      </td>

                      {/* Grand Total */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#38bdf8', fontSize: '14px' }}>
                          {currencySymbol} {Number(quote.grandTotal).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {quote.items?.length || 0} line items
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor:
                              quote.status === 'Approved'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : quote.status === 'Converted'
                                ? 'rgba(168, 85, 247, 0.15)'
                                : quote.status === 'Rejected'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : quote.status === 'Sent'
                                ? 'rgba(56, 189, 248, 0.15)'
                                : '#1e293b',
                            color:
                              quote.status === 'Approved'
                                ? '#34d399'
                                : quote.status === 'Converted'
                                ? '#c084fc'
                                : quote.status === 'Rejected'
                                ? '#f87171'
                                : quote.status === 'Sent'
                                ? '#38bdf8'
                                : '#94a3b8'
                          }}
                        >
                          ● {quote.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {/* 1-Click Convert to Invoice button */}
                          {!isConverted && (
                            <button
                              onClick={() => handleConvertToInvoice(quote)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: 'rgba(16, 185, 129, 0.12)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: '6px',
                                color: '#34d399',
                                padding: '5px 9px',
                                fontSize: '11.5px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                              title="Convert Quotation to Invoice"
                            >
                              <Receipt size={13} />
                              Convert
                            </button>
                          )}

                          {/* Print / Preview PDF */}
                          <button
                            onClick={() => setPreviewDoc(quote)}
                            style={{
                              background: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '6px',
                              color: '#38bdf8',
                              padding: '5px 8px',
                              cursor: 'pointer'
                            }}
                            title="Print / View PDF Document"
                          >
                            <Printer size={14} />
                          </button>

                          {/* Edit */}
                          {canManage && !isConverted && (
                            <button
                              onClick={() => handleOpenEdit(quote)}
                              style={{
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '6px',
                                color: '#cbd5e1',
                                padding: '5px 8px',
                                cursor: 'pointer'
                              }}
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}

                          {/* Delete */}
                          {canManage && (
                            <button
                              onClick={() => handleDeleteQuotation(quote)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '6px',
                                color: '#f87171',
                                padding: '5px 8px',
                                cursor: 'pointer'
                              }}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT QUOTATION MODAL */}
      {showCreateModal && (
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
              maxWidth: '860px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #1f2937',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#818cf8'
                  }}
                >
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#f8fafc' }}>
                    {editingQuotation ? `Edit Quotation ${editingQuotation.quotationNumber}` : 'Create New Quotation'}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Add customer details and select line items from your catalog.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveQuotation} style={{ padding: '24px' }}>
              {formError && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: '#f87171',
                    fontSize: '13px',
                    marginBottom: '16px'
                  }}
                >
                  {formError}
                </div>
              )}

              {/* Customer & Date Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    Customer Account *
                  </label>
                  <select
                    required
                    value={formData.customer}
                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select Customer</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.companyName || c.name} {c.email ? `(${c.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    Issue Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
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
                    Valid Until
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
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
              </div>

              {/* Status Switcher (if editing) */}
              {editingQuotation && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    Quotation Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{
                      width: '200px',
                      padding: '8px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              )}

              {/* Line Items Engine */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#f8fafc', marginBottom: '10px' }}>
                  Line Items (Products & Services)
                </label>
                <ItemQuickSelector
                  value={formData.items}
                  onChange={(newItems) => setFormData({ ...formData, items: newItems })}
                  currency={currencySymbol}
                />
              </div>

              {/* Terms and Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    Terms & Conditions
                  </label>
                  <textarea
                    rows="3"
                    value={formData.termsAndConditions}
                    onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12.5px',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    Internal Notes / Customer Message
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Optional message to client or internal deal reference..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12.5px',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '9px 18px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#cbd5e1',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '9px 24px',
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
                  {submitting ? 'Saving...' : editingQuotation ? 'Update Quotation' : 'Generate Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT / PREVIEW MODAL */}
      {previewDoc && (
        <PrintDocumentModal
          type="quotation"
          document={previewDoc}
          organization={organization}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
};

export default QuotationsPage;
