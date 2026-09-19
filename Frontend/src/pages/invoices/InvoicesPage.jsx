import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  CreditCard,
  Building2,
  DollarSign,
  TrendingUp,
  Edit2,
  Trash2,
  X,
  History,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ItemQuickSelector from '../../components/common/ItemQuickSelector';
import PrintDocumentModal from '../../components/common/PrintDocumentModal';

const PAYMENT_METHODS = ['Bank Transfer', 'UPI', 'Card', 'Cash', 'Cheque', 'Other'];
const PAYMENT_TERMS = ['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Custom'];

const InvoicesPage = () => {
  const { hasPermission, organization } = useAuth();
  const canManage = hasPermission('invoices:create') || hasPermission('invoices:edit');
  const canRecordPayment = hasPermission('payments:record') || canManage;
  const currencySymbol = organization?.localization?.currencySymbol || '₹';

  // Data states
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedInvoiceForHistory, setSelectedInvoiceForHistory] = useState(null);

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'UPI',
    referenceNumber: '',
    notes: ''
  });

  // Invoice Form State
  const initialInvoiceForm = {
    customer: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(+new Date() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentTerms: 'Net 15',
    items: [],
    bankDetails: {
      accountName: organization?.name || '',
      accountNumber: '',
      bankName: '',
      ifscSwiftCode: '',
      upiId: ''
    },
    termsAndConditions:
      '1. Please remit payment via Bank Transfer or UPI quoting this invoice number.\n2. Overdue payments are subject to a 1.5% interest per month.\n3. Thank you for your business!',
    notes: ''
  };
  const [formData, setFormData] = useState(initialInvoiceForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch Invoices, Stats & Customers
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const [invRes, statsRes, custRes] = await Promise.all([
        axios.get(`/api/v1/invoices?${params.toString()}`, { headers }),
        axios.get('/api/v1/invoices/stats', { headers }),
        axios.get('/api/v1/customers', { headers })
      ]);

      if (invRes.data?.success) setInvoices(invRes.data.data.items || []);
      if (statsRes.data?.success) setStats(statsRes.data.data);
      if (custRes.data?.success) setCustomers(custRes.data.data.customers || custRes.data.data || []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, searchTerm]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingInvoice(null);
    setFormData({
      ...initialInvoiceForm,
      customer: customers[0]?._id || '',
      bankDetails: {
        accountName: organization?.name || '',
        accountNumber: organization?.bankDetails?.accountNumber || '',
        bankName: organization?.bankDetails?.bankName || '',
        ifscSwiftCode: organization?.bankDetails?.ifscSwiftCode || '',
        upiId: organization?.bankDetails?.upiId || ''
      }
    });
    setFormError('');
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (inv) => {
    setEditingInvoice(inv);
    setFormData({
      customer: inv.customer?._id || inv.customer || '',
      issueDate: inv.issueDate ? new Date(inv.issueDate).toISOString().split('T')[0] : '',
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
      paymentTerms: inv.paymentTerms || 'Net 15',
      items: inv.items || [],
      bankDetails: inv.bankDetails || initialInvoiceForm.bankDetails,
      termsAndConditions: inv.termsAndConditions || '',
      notes: inv.notes || ''
    });
    setFormError('');
    setShowCreateModal(true);
  };

  // Save Invoice
  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.customer) {
      setFormError('Please select a customer account');
      return;
    }
    if (!formData.items || formData.items.length === 0) {
      setFormError('Please add at least one line item to the invoice');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingInvoice) {
        await axios.put(`/api/v1/invoices/${editingInvoice._id}`, formData, { headers });
      } else {
        await axios.post('/api/v1/invoices', formData, { headers });
      }

      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save invoice:', err);
      setFormError(err.response?.data?.message || 'Error saving invoice');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Payment Modal
  const handleOpenPayment = (inv) => {
    setSelectedInvoiceForPayment(inv);
    setPaymentForm({
      amount: inv.balanceDue,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'UPI',
      referenceNumber: '',
      notes: `Payment for ${inv.invoiceNumber}`
    });
    setShowPaymentModal(true);
  };

  // Submit Payment Record
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.post(
        `/api/v1/invoices/${selectedInvoiceForPayment._id}/payments`,
        paymentForm,
        { headers }
      );

      if (res.data?.success) {
        setShowPaymentModal(false);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to record payment:', err);
      alert(err.response?.data?.message || 'Error recording payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Invoice
  const handleDeleteInvoice = async (inv) => {
    if (!window.confirm(`Are you sure you want to delete invoice "${inv.invoiceNumber}"?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/invoices/${inv._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error('Failed to delete invoice:', err);
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
              Invoices & Payment Tracker
            </h1>
            <span
              style={{
                fontSize: '12px',
                fontWeight: '600',
                padding: '3px 9px',
                borderRadius: '12px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)'
              }}
            >
              Module 9
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '4px' }}>
            Track client billings, record partial/full payments (UPI, Wire, Card, Cash), and manage outstanding receivables.
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
              backgroundColor: '#0284c7',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={16} />
            + New Invoice
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
        {/* Total Invoiced */}
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
            <Receipt size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Total Invoiced</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', marginTop: '2px' }}>
              {currencySymbol} {(stats?.totalInvoiced || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              {stats?.totalInvoices ?? 0} Invoices generated
            </div>
          </div>
        </div>

        {/* Total Collected */}
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
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Total Collected</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#34d399', marginTop: '2px' }}>
              {currencySymbol} {(stats?.totalCollected || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>
              {stats?.paidCount ?? 0} Paid Invoices
            </div>
          </div>
        </div>

        {/* Outstanding Receivables */}
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
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Outstanding Receivables</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#fbbf24', marginTop: '2px' }}>
              {currencySymbol} {(stats?.totalReceivables || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Pending client payments
            </div>
          </div>
        </div>

        {/* Overdue Count */}
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
              background: (stats?.overdueCount || 0) > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(100, 116, 139, 0.15)',
              color: (stats?.overdueCount || 0) > 0 ? '#f87171' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Overdue Invoices</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: (stats?.overdueCount || 0) > 0 ? '#ef4444' : '#f8fafc', marginTop: '2px' }}>
              {stats?.overdueCount ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: (stats?.overdueCount || 0) > 0 ? '#f87171' : '#64748b', marginTop: '2px' }}>
              {(stats?.overdueCount || 0) > 0 ? 'Action required: Follow up' : 'All invoices on schedule'}
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
          {[
            { id: 'all', label: 'All Invoices' },
            { id: 'unpaid', label: 'Unpaid' },
            { id: 'partially_paid', label: 'Partially Paid' },
            { id: 'paid', label: 'Paid' },
            { id: 'overdue', label: 'Overdue' }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: statusFilter === st.id ? '600' : '500',
                background: statusFilter === st.id ? '#0284c7' : 'transparent',
                color: statusFilter === st.id ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {st.label}
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
            placeholder="Search by invoice # or notes..."
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

      {/* Invoices Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid rgba(56, 189, 248, 0.2)',
              borderTopColor: '#38bdf8',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite'
            }}
          />
          Loading invoices...
        </div>
      ) : invoices.length === 0 ? (
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
              background: 'rgba(56, 189, 248, 0.1)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}
          >
            <Receipt size={28} />
          </div>
          <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#f8fafc' }}>
            No invoices found
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '6px', maxWidth: '440px', margin: '6px auto 20px' }}>
            {searchTerm || statusFilter !== 'all'
              ? 'No invoices match the active filter criteria.'
              : 'Create an invoice directly or convert an approved quotation.'}
          </p>
          {canManage && (
            <button
              onClick={handleOpenCreate}
              style={{
                padding: '9px 18px',
                backgroundColor: '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              + Create First Invoice
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
                  <th style={{ padding: '12px 16px' }}>Invoice #</th>
                  <th style={{ padding: '12px 16px' }}>Customer</th>
                  <th style={{ padding: '12px 16px' }}>Due Date</th>
                  <th style={{ padding: '12px 16px' }}>Amount & Balance</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const customer = inv.customer || {};
                  const isOverdue = inv.status === 'Overdue' || (inv.status !== 'Paid' && new Date(inv.dueDate) < new Date());
                  const paidPct = inv.grandTotal > 0 ? Math.min(100, Math.round(((inv.paidAmount || 0) / inv.grandTotal) * 100)) : 0;

                  return (
                    <tr
                      key={inv._id}
                      style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.4)' }}
                    >
                      {/* Invoice # & Date */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Receipt size={15} color="#38bdf8" />
                          <span>{inv.invoiceNumber}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Issued: {new Date(inv.issueDate).toLocaleDateString()}
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

                      {/* Due Date */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ color: isOverdue ? '#f87171' : '#cbd5e1', fontWeight: isOverdue ? '600' : '400' }}>
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </div>
                        {isOverdue && (
                          <span style={{ fontSize: '10.5px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                            <AlertTriangle size={11} /> Overdue
                          </span>
                        )}
                      </td>

                      {/* Amount & Balance Progress */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', color: '#f8fafc' }}>
                            {currencySymbol} {Number(inv.grandTotal).toLocaleString()}
                          </span>
                          <span style={{ fontSize: '11px', color: inv.balanceDue > 0 ? '#fbbf24' : '#34d399' }}>
                            Due: {currencySymbol} {Number(inv.balanceDue).toLocaleString()}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div
                          style={{
                            height: '5px',
                            background: '#334155',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            width: '140px'
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${paidPct}%`,
                              backgroundColor: paidPct === 100 ? '#10b981' : '#38bdf8',
                              transition: 'width 0.3s ease'
                            }}
                          />
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
                              inv.status === 'Paid'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : inv.status === 'Partially Paid'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : isOverdue
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(56, 189, 248, 0.15)',
                            color:
                              inv.status === 'Paid'
                                ? '#34d399'
                                : inv.status === 'Partially Paid'
                                ? '#fbbf24'
                                : isOverdue
                                ? '#f87171'
                                : '#38bdf8'
                          }}
                        >
                          ● {inv.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {/* Record Payment Button */}
                          {canRecordPayment && inv.status !== 'Paid' && (
                            <button
                              onClick={() => handleOpenPayment(inv)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: 'rgba(56, 189, 248, 0.15)',
                                border: '1px solid rgba(56, 189, 248, 0.35)',
                                borderRadius: '6px',
                                color: '#38bdf8',
                                padding: '5px 9px',
                                fontSize: '11.5px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                              title="Record Payment"
                            >
                              <CreditCard size={13} />
                              Pay
                            </button>
                          )}

                          {/* Payment History Button */}
                          {inv.payments && inv.payments.length > 0 && (
                            <button
                              onClick={() => {
                                setSelectedInvoiceForHistory(inv);
                                setShowHistoryModal(true);
                              }}
                              style={{
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '6px',
                                color: '#a5b4fc',
                                padding: '5px 8px',
                                cursor: 'pointer'
                              }}
                              title="View Payment History"
                            >
                              <History size={14} />
                            </button>
                          )}

                          {/* Print / View PDF */}
                          <button
                            onClick={() => setPreviewDoc(inv)}
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
                          {canManage && (
                            <button
                              onClick={() => handleOpenEdit(inv)}
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
                              onClick={() => handleDeleteInvoice(inv)}
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

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && selectedInvoiceForPayment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#111827',
              border: '1px solid #334155',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '480px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="#34d399" />
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>
                  Record Payment
                </h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} style={{ padding: '20px' }}>
              {/* Invoice Summary Box */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ fontWeight: '600', color: '#f8fafc', fontSize: '14px' }}>
                  {selectedInvoiceForPayment.invoiceNumber} — {selectedInvoiceForPayment.customer?.companyName || selectedInvoiceForPayment.customer?.name}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total: {currencySymbol} {Number(selectedInvoiceForPayment.grandTotal).toLocaleString()}</span>
                  <span>
                    Balance Due: <strong style={{ color: '#fbbf24' }}>{currencySymbol} {Number(selectedInvoiceForPayment.balanceDue).toLocaleString()}</strong>
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  Payment Amount ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  max={selectedInvoiceForPayment.balanceDue}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#34d399',
                    fontSize: '15px',
                    fontWeight: '700',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Payment Method & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    Payment Method
                  </label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    style={{
                      width: '100%',
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
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
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

              {/* Reference ID */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  Transaction / Reference # (UTR / Cheque No)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-98214421, CHQ-10492"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
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

              {/* Notes */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  Payment Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional note"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
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
                  onClick={() => setShowPaymentModal(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#cbd5e1',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 20px',
                    background: '#10b981',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  {submitting ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT HISTORY DRAWER / MODAL */}
      {showHistoryModal && selectedInvoiceForHistory && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#111827',
              border: '1px solid #334155',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '560px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} color="#a5b4fc" />
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>
                  Payment History — {selectedInvoiceForHistory.invoiceNumber}
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '8px 10px' }}>Date</th>
                    <th style={{ padding: '8px 10px' }}>Method</th>
                    <th style={{ padding: '8px 10px' }}>Ref #</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoiceForHistory.payments || []).map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.4)' }}>
                      <td style={{ padding: '10px' }}>{new Date(p.paymentDate).toLocaleDateString()}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td style={{ padding: '10px', color: '#94a3b8' }}>{p.referenceNumber || '—'}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700', color: '#34d399' }}>
                        {currencySymbol} {Number(p.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#cbd5e1',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT DIRECT INVOICE MODAL */}
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
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8'
                  }}
                >
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#f8fafc' }}>
                    {editingInvoice ? `Edit Invoice ${editingInvoice.invoiceNumber}` : 'Create Direct Invoice'}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Generate a formal invoice and assign line items from catalog.
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
            <form onSubmit={handleSaveInvoice} style={{ padding: '24px' }}>
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

              {/* Customer, Issue Date, Due Date, Terms */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
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
                        {c.companyName || c.name}
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
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
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
                    Payment Terms
                  </label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    style={{
                      width: '100%',
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
                    {PAYMENT_TERMS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Line Items */}
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

              {/* Bank Details */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '20px'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc', marginBottom: '10px' }}>
                  Remittance Bank Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                      Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank, Chase"
                      value={formData.bankDetails.bankName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bankDetails: { ...formData.bankDetails, bankName: e.target.value }
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        background: '#0b1120',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '12.5px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                      Account Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 50100234901928"
                      value={formData.bankDetails.accountNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bankDetails: { ...formData.bankDetails, accountNumber: e.target.value }
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        background: '#0b1120',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '12.5px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                      IFSC / SWIFT / UPI
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234 or upi@bank"
                      value={formData.bankDetails.ifscSwiftCode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bankDetails: { ...formData.bankDetails, ifscSwiftCode: e.target.value }
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        background: '#0b1120',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '12.5px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Terms & Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    Payment Terms & Conditions
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
                    Notes / Remarks
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Optional message to client..."
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
                    background: '#0284c7',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)'
                  }}
                >
                  {submitting ? 'Generating...' : editingInvoice ? 'Update Invoice' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT / PREVIEW MODAL */}
      {previewDoc && (
        <PrintDocumentModal
          type="invoice"
          document={previewDoc}
          organization={organization}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
};

export default InvoicesPage;
