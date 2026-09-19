import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2, Plus, Search, Filter, RefreshCw, MoreVertical,
  Phone, Mail, Globe, MapPin, User, Users, FileText,
  DollarSign, CheckCircle2, Clock, Trash2, Edit3, Eye,
  X, ChevronRight, Upload, Download, Paperclip, Star,
  Briefcase, Shield, AlertCircle, Sparkles, MessageSquare,
  Calendar, Layers, Tag, ExternalLink, ArrowRight, Check
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const INDUSTRY_OPTIONS = [
  'Software & IT', 'Real Estate', 'Healthcare', 'Education',
  'Finance & Banking', 'Manufacturing', 'Retail & E-commerce',
  'Consulting', 'Marketing & Advertising', 'Logistics', 'Other'
];

const DOCUMENT_CATEGORIES = ['Contract', 'Proposal', 'NDA', 'Invoice', 'ID Proof', 'Other'];

export default function CustomersPage() {
  const { user } = useAuth();

  // ── States ──────────────────────────────────────────────────
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, newThisMonth: 0, industriesCount: 0 });
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [drawerTab, setDrawerTab] = useState('overview');

  // Sub-resources for 360 View
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [customerContacts, setCustomerContacts] = useState([]);
  const [customerNotes, setCustomerNotes] = useState([]);
  const [customerDocuments, setCustomerDocuments] = useState([]);
  const [customerDeals, setCustomerDeals] = useState([]);

  // Form states
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docCategory, setDocCategory] = useState('Contract');
  const fileInputRef = useRef(null);

  // Notifications
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ── Data Fetching ──────────────────────────────────────────
  const fetchStats = async () => {
    try {
      const res = await api.get('/customers/stats');
      if (res.data) setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users?limit=100');
      if (res.data?.users) setUsersList(res.data.users);
      else if (Array.isArray(res.data)) setUsersList(res.data);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (industryFilter) params.append('industry', industryFilter);
      if (managerFilter) params.append('accountManager', managerFilter);
      if (statusFilter === 'active') params.append('isActive', 'true');
      if (statusFilter === 'inactive') params.append('isActive', 'false');
      params.append('page', page);
      params.append('limit', 12);

      const res = await api.get(`/customers?${params.toString()}`);
      if (res.data) {
        setCustomers(res.data.customers || []);
        setTotalPages(res.data.pagination?.pages || 1);
      }
    } catch (err) {
      showToast(err.customMessage || 'Failed to load customers', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, industryFilter, managerFilter, statusFilter, page]);

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Load Sub-resources when 360 View is opened
  const openCustomer360 = async (customer) => {
    try {
      const [res, dealsRes] = await Promise.all([
        api.get(`/customers/${customer._id}`),
        api.get(`/deals?customerId=${customer._id}`).catch(() => ({ data: { deals: [] } }))
      ]);

      const fullCustomer = res.data?.customer || customer;
      setViewingCustomer(fullCustomer);
      setCustomerContacts(res.data?.contacts || []);
      setCustomerNotes(res.data?.notes || []);
      setCustomerDocuments(res.data?.documents || []);
      setCustomerDeals(dealsRes.data?.deals || []);
      setDrawerTab('overview');
    } catch (err) {
      showToast('Failed to load customer details', 'error');
    }
  };

  const reloadCustomerDetails = async (customerId) => {
    try {
      const [res, dealsRes] = await Promise.all([
        api.get(`/customers/${customerId}`),
        api.get(`/deals?customerId=${customerId}`).catch(() => ({ data: { deals: [] } }))
      ]);
      if (res.data?.customer) setViewingCustomer(res.data.customer);
      if (res.data?.contacts) setCustomerContacts(res.data.contacts);
      if (res.data?.notes) setCustomerNotes(res.data.notes);
      if (res.data?.documents) setCustomerDocuments(res.data.documents);
      if (dealsRes.data?.deals) setCustomerDeals(dealsRes.data.deals);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Contact Management ─────────────────────────────────────
  const handleSaveContact = async (contactData) => {
    if (!viewingCustomer) return;
    try {
      if (editingContact) {
        await api.put(`/customers/${viewingCustomer._id}/contacts/${editingContact._id}`, contactData);
        showToast('Contact updated successfully');
      } else {
        await api.post(`/customers/${viewingCustomer._id}/contacts`, contactData);
        showToast('Contact added successfully');
      }
      setShowAddContactModal(false);
      setEditingContact(null);
      await reloadCustomerDetails(viewingCustomer._id);
      fetchCustomers();
    } catch (err) {
      showToast(err.customMessage || 'Failed to save contact', 'error');
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await api.delete(`/customers/${viewingCustomer._id}/contacts/${contactId}`);
      showToast('Contact deleted');
      await reloadCustomerDetails(viewingCustomer._id);
      fetchCustomers();
    } catch (err) {
      showToast(err.customMessage || 'Failed to delete contact', 'error');
    }
  };

  const handleSetPrimaryContact = async (contactId) => {
    try {
      await api.patch(`/customers/${viewingCustomer._id}/contacts/${contactId}/primary`);
      showToast('Primary contact updated');
      await reloadCustomerDetails(viewingCustomer._id);
      fetchCustomers();
    } catch (err) {
      showToast(err.customMessage || 'Failed to set primary contact', 'error');
    }
  };

  // ── Note / Activity Timeline ───────────────────────────────
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim() || !viewingCustomer) return;
    try {
      await api.post(`/customers/${viewingCustomer._id}/notes`, {
        content: noteContent,
        type: noteType
      });
      setNoteContent('');
      showToast('Activity logged');
      await reloadCustomerDetails(viewingCustomer._id);
    } catch (err) {
      showToast(err.customMessage || 'Failed to add activity', 'error');
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await api.delete(`/customers/${viewingCustomer._id}/notes/${noteId}`);
      showToast('Note deleted');
      await reloadCustomerDetails(viewingCustomer._id);
    } catch (err) {
      showToast(err.customMessage || 'Failed to delete note', 'error');
    }
  };

  // ── Document Management ────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !viewingCustomer) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', docCategory);

    setUploadingDoc(true);
    try {
      await api.post(`/customers/${viewingCustomer._id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast('Document uploaded successfully');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await reloadCustomerDetails(viewingCustomer._id);
    } catch (err) {
      showToast(err.customMessage || 'Failed to upload document', 'error');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDownloadDoc = (doc) => {
    window.open(`/api/v1/customers/${viewingCustomer._id}/documents/${doc._id}/download`, '_blank');
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/customers/${viewingCustomer._id}/documents/${docId}`);
      showToast('Document deleted');
      await reloadCustomerDetails(viewingCustomer._id);
    } catch (err) {
      showToast(err.customMessage || 'Failed to delete document', 'error');
    }
  };

  // ── Delete Customer ────────────────────────────────────────
  const handleDeleteCustomer = async (customerId, e) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to archive/delete this customer account?')) return;
    try {
      await api.delete(`/customers/${customerId}`);
      showToast('Customer archived successfully');
      if (viewingCustomer?._id === customerId) setViewingCustomer(null);
      fetchCustomers();
      fetchStats();
    } catch (err) {
      showToast(err.customMessage || 'Failed to delete customer', 'error');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
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
              <Building2 size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Customer & Account Management
              </h1>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13.5 }}>
                Unified 360° customer intelligence, multi-contact directory, deals, documents & activity timeline
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => { setRefreshing(true); fetchCustomers(); fetchStats(); }}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8 }}
            disabled={refreshing}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => { setEditingCustomer(null); setShowAddModal(true); }}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, fontWeight: 600 }}
          >
            <Plus size={18} />
            Add Customer
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MetricCard
          label="Total Customer Accounts"
          value={stats.total}
          icon={Building2}
          color="#6366f1"
          bg="rgba(99, 102, 241, 0.1)"
        />
        <MetricCard
          label="Active Accounts"
          value={stats.active}
          icon={CheckCircle2}
          color="#10b981"
          bg="rgba(16, 185, 129, 0.1)"
        />
        <MetricCard
          label="New This Month"
          value={stats.newThisMonth}
          icon={Sparkles}
          color="#f59e0b"
          bg="rgba(245, 158, 11, 0.1)"
        />
        <MetricCard
          label="Industries Covered"
          value={stats.industriesCount}
          icon={Layers}
          color="#a855f7"
          bg="rgba(168, 85, 247, 0.1)"
        />
      </div>

      {/* ── Filters & Search Bar ───────────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: '14px 18px',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 20
        }}
      >
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Search company, tax ID, industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ width: '100%', paddingLeft: 36, height: 38, fontSize: 13.5 }}
          />
        </div>

        <select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="input"
          style={{ width: 170, height: 38, fontSize: 13.5 }}
        >
          <option value="">All Industries</option>
          {INDUSTRY_OPTIONS.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>

        <select
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          className="input"
          style={{ width: 180, height: 38, fontSize: 13.5 }}
        >
          <option value="">All Managers</option>
          {usersList.map((u) => (
            <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input"
          style={{ width: 130, height: 38, fontSize: 13.5 }}
        >
          <option value="active">Active Only</option>
          <option value="inactive">Inactive</option>
          <option value="all">All Records</option>
        </select>

        {(search || industryFilter || managerFilter || statusFilter !== 'active') && (
          <button
            onClick={() => { setSearch(''); setIndustryFilter(''); setManagerFilter(''); setStatusFilter('active'); }}
            className="btn btn-outline"
            style={{ height: 38, padding: '0 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* ── Customer Accounts Table ────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div className="animate-spin" style={{ width: 36, height: 36, border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 16px' }} />
          Loading customer accounts...
        </div>
      ) : customers.length === 0 ? (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border-strong)',
            borderRadius: 12,
            padding: '60px 20px',
            textAlign: 'center'
          }}
        >
          <Building2 size={44} style={{ color: 'var(--text-dim)', marginBottom: 14 }} />
          <h3 style={{ margin: '0 0 6px', color: 'var(--text-main)', fontSize: 18 }}>No Customers Found</h3>
          <p style={{ margin: '0 0 18px', color: 'var(--text-muted)', fontSize: 14 }}>
            {search || industryFilter || managerFilter ? 'Try adjusting your filters.' : 'Get started by creating your first customer account or converting a lead.'}
          </p>
          <button
            onClick={() => { setEditingCustomer(null); setShowAddModal(true); }}
            className="btn btn-primary"
            style={{ padding: '9px 20px', borderRadius: 8, fontWeight: 600 }}
          >
            <Plus size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
            Add Customer
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Industry</th>
                <th>Primary Contact</th>
                <th>Contacts</th>
                <th>Account Manager</th>
                <th>Tax / ID</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const primaryContact = c.primaryContact;
                return (
                  <tr
                    key={c._id}
                    onClick={() => openCustomer360(c)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#818cf8',
                            fontWeight: 700,
                            fontSize: 15,
                            flexShrink: 0
                          }}
                        >
                          {c.companyName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {c.companyName}
                            {c.convertedFromLead && (
                              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                Converted
                              </span>
                            )}
                          </div>
                          {c.website && (
                            <a
                              href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{ fontSize: 12, color: '#818cf8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2 }}
                            >
                              <Globe size={11} />
                              {c.website.replace(/^https?:\/\//, '')}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                        {c.industry || 'General'}
                      </span>
                    </td>
                    <td>
                      {primaryContact ? (
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 13 }}>
                            {primaryContact.firstName} {primaryContact.lastName}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                            {primaryContact.designation || primaryContact.email || primaryContact.phone || 'Contact'}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: 12.5, fontStyle: 'italic' }}>No contacts yet</span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 12,
                          background: 'rgba(148, 163, 184, 0.1)',
                          fontSize: 12,
                          color: 'var(--text-muted)'
                        }}
                      >
                        <Users size={12} />
                        {c.contactCount || (primaryContact ? 1 : 0)}
                      </span>
                    </td>
                    <td>
                      {c.accountManager ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              background: '#6366f1',
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {c.accountManager.firstName?.charAt(0)}
                          </div>
                          <span style={{ fontSize: 13, color: 'var(--text-main)' }}>
                            {c.accountManager.firstName} {c.accountManager.lastName}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: 12.5 }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {c.gstin ? `GST: ${c.gstin}` : c.taxId ? `TAX: ${c.taxId}` : c.panNumber ? `PAN: ${c.panNumber}` : '—'}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${c.isActive ? 'badge-success' : 'badge-inactive'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openCustomer360(c)}
                          className="btn btn-outline"
                          style={{ padding: '6px 10px', borderRadius: 6, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title="Open 360° View"
                        >
                          <Eye size={13} />
                          360°
                        </button>
                        <button
                          onClick={() => { setEditingCustomer(c); setShowAddModal(true); }}
                          className="btn btn-outline"
                          style={{ padding: '6px 8px', borderRadius: 6 }}
                          title="Edit Customer"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteCustomer(c._id, e)}
                          className="btn btn-outline"
                          style={{ padding: '6px 8px', borderRadius: 6, color: '#ef4444' }}
                          title="Archive Customer"
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

      {/* ── Pagination ────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-outline"
            style={{ padding: '6px 14px', fontSize: 13 }}
          >
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, color: 'var(--text-muted)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn btn-outline"
            style={{ padding: '6px 14px', fontSize: 13 }}
          >
            Next
          </button>
        </div>
      )}

      {/* ── Add / Edit Customer Modal ──────────────────────────── */}
      {showAddModal && (
        <CustomerFormModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          customer={editingCustomer}
          usersList={usersList}
          onSaved={() => {
            setShowAddModal(false);
            fetchCustomers();
            fetchStats();
            showToast(editingCustomer ? 'Customer updated!' : 'Customer created!');
          }}
        />
      )}

      {/* ── Customer 360° Unified View Drawer ──────────────────── */}
      {viewingCustomer && (
        <Customer360Drawer
          customer={viewingCustomer}
          contacts={customerContacts}
          notes={customerNotes}
          documents={customerDocuments}
          deals={customerDeals}
          drawerTab={drawerTab}
          setDrawerTab={setDrawerTab}
          onClose={() => setViewingCustomer(null)}
          onEdit={() => { setEditingCustomer(viewingCustomer); setShowAddModal(true); }}
          onAddContact={() => { setEditingContact(null); setShowAddContactModal(true); }}
          onEditContact={(c) => { setEditingContact(c); setShowAddContactModal(true); }}
          onDeleteContact={handleDeleteContact}
          onSetPrimaryContact={handleSetPrimaryContact}
          noteContent={noteContent}
          setNoteContent={setNoteContent}
          noteType={noteType}
          setNoteType={setNoteType}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
          docCategory={docCategory}
          setDocCategory={setDocCategory}
          onFileUpload={handleFileUpload}
          onDownloadDoc={handleDownloadDoc}
          onDeleteDoc={handleDeleteDoc}
          uploadingDoc={uploadingDoc}
          fileInputRef={fileInputRef}
        />
      )}

      {/* ── Add / Edit Contact Sub-Modal ───────────────────────── */}
      {showAddContactModal && (
        <ContactFormModal
          isOpen={showAddContactModal}
          onClose={() => setShowAddContactModal(false)}
          contact={editingContact}
          onSave={handleSaveContact}
        />
      )}
    </div>
  );
}

// ================================================================
// KPI Metric Card Component
// ================================================================
function MetricCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</p>
        <h3 style={{ margin: '6px 0 0', fontSize: 24, fontWeight: 700, color: 'var(--text-main)' }}>{value}</h3>
      </div>
      <div
        style={{
          width: 46,
          height: 46,
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
// Customer Form Modal (Add / Edit)
// ================================================================
function CustomerFormModal({ isOpen, onClose, customer, usersList, onSaved }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    companyName: customer?.companyName || '',
    industry: customer?.industry || '',
    website: customer?.website || '',
    accountManager: customer?.accountManager?._id || customer?.accountManager || '',
    taxId: customer?.taxId || '',
    gstin: customer?.gstin || '',
    panNumber: customer?.panNumber || '',
    tags: customer?.tags?.join(', ') || '',
    billingStreet: customer?.billingAddress?.street || '',
    billingCity: customer?.billingAddress?.city || '',
    billingState: customer?.billingAddress?.state || '',
    billingZip: customer?.billingAddress?.zip || '',
    billingCountry: customer?.billingAddress?.country || '',
    sameAsbilling: customer?.sameAsbilling || false,
    shippingStreet: customer?.shippingAddress?.street || '',
    shippingCity: customer?.shippingAddress?.city || '',
    shippingState: customer?.shippingAddress?.state || '',
    shippingZip: customer?.shippingAddress?.zip || '',
    shippingCountry: customer?.shippingAddress?.country || '',
    contactFirstName: '',
    contactLastName: '',
    contactEmail: '',
    contactPhone: '',
    contactDesignation: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.companyName.trim()) {
      setError('Company name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        companyName: formData.companyName,
        industry: formData.industry,
        website: formData.website,
        accountManager: formData.accountManager || null,
        taxId: formData.taxId,
        gstin: formData.gstin,
        panNumber: formData.panNumber,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        billingAddress: {
          street: formData.billingStreet,
          city: formData.billingCity,
          state: formData.billingState,
          zip: formData.billingZip,
          country: formData.billingCountry
        },
        sameAsbilling: formData.sameAsbilling,
        shippingAddress: formData.sameAsbilling
          ? {
              street: formData.billingStreet,
              city: formData.billingCity,
              state: formData.billingState,
              zip: formData.billingZip,
              country: formData.billingCountry
            }
          : {
              street: formData.shippingStreet,
              city: formData.shippingCity,
              state: formData.shippingState,
              zip: formData.shippingZip,
              country: formData.shippingCountry
            }
      };

      if (!customer && formData.contactFirstName) {
        payload.primaryContact = {
          firstName: formData.contactFirstName,
          lastName: formData.contactLastName,
          email: formData.contactEmail,
          phone: formData.contactPhone,
          designation: formData.contactDesignation
        };
      }

      if (customer) {
        await api.put(`/customers/${customer._id}`, payload);
      } else {
        await api.post('/customers', payload);
      }

      onSaved();
    } catch (err) {
      setError(err.customMessage || 'Failed to save customer');
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
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
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
          maxWidth: 720,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={20} style={{ color: '#818cf8' }} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-main)' }}>
              {customer ? 'Edit Customer Account' : 'Create New Customer Account'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: '0 24px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.4)' }}>
          {[
            { id: 'profile', label: 'Company Profile' },
            { id: 'tax', label: 'Tax & Legal' },
            { id: 'address', label: 'Addresses' },
            ...(!customer ? [{ id: 'contact', label: 'Primary Contact' }] : [])
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--text-main)' : 'var(--text-dim)',
                fontWeight: activeTab === tab.id ? 600 : 500,
                fontSize: 13.5,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {activeTab === 'profile' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Company Name *</label>
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="e.g. Acme Corporation" className="input" required />
                </div>
                <div>
                  <label className="label">Industry</label>
                  <select name="industry" value={formData.industry} onChange={handleChange} className="input">
                    <option value="">Select Industry</option>
                    {INDUSTRY_OPTIONS.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Website</label>
                  <input type="text" name="website" value={formData.website} onChange={handleChange} placeholder="https://acme.com" className="input" />
                </div>
                <div>
                  <label className="label">Account Manager</label>
                  <select name="accountManager" value={formData.accountManager} onChange={handleChange} className="input">
                    <option value="">Assign Account Manager</option>
                    {usersList.map((u) => (
                      <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Tags (comma separated)</label>
                  <input type="text" name="tags" value={formData.tags} onChange={handleChange} placeholder="Enterprise, Tech" className="input" />
                </div>
              </div>
            )}

            {activeTab === 'tax' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="label">Tax ID / EIN</label>
                  <input type="text" name="taxId" value={formData.taxId} onChange={handleChange} placeholder="12-3456789" className="input" />
                </div>
                <div>
                  <label className="label">GSTIN (India)</label>
                  <input type="text" name="gstin" value={formData.gstin} onChange={handleChange} placeholder="22AAAAA0000A1Z5" className="input" />
                </div>
                <div>
                  <label className="label">PAN Number</label>
                  <input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange} placeholder="ABCDE1234F" className="input" />
                </div>
              </div>
            )}

            {activeTab === 'address' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--text-main)' }}>Billing Address</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <input type="text" name="billingStreet" value={formData.billingStreet} onChange={handleChange} placeholder="Street Address" className="input" />
                    </div>
                    <input type="text" name="billingCity" value={formData.billingCity} onChange={handleChange} placeholder="City" className="input" />
                    <input type="text" name="billingState" value={formData.billingState} onChange={handleChange} placeholder="State" className="input" />
                    <input type="text" name="billingZip" value={formData.billingZip} onChange={handleChange} placeholder="ZIP Code" className="input" />
                    <input type="text" name="billingCountry" value={formData.billingCountry} onChange={handleChange} placeholder="Country" className="input" />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="sameAsbilling" name="sameAsbilling" checked={formData.sameAsbilling} onChange={handleChange} />
                  <label htmlFor="sameAsbilling" style={{ fontSize: 13.5, color: 'var(--text-muted)', cursor: 'pointer' }}>
                    Shipping address is identical to Billing address
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'contact' && !customer && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="label">First Name</label>
                  <input type="text" name="contactFirstName" value={formData.contactFirstName} onChange={handleChange} placeholder="John" className="input" />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input type="text" name="contactLastName" value={formData.contactLastName} onChange={handleChange} placeholder="Doe" className="input" />
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} placeholder="john@company.com" className="input" />
                </div>
                <div>
                  <label className="label">Direct Phone</label>
                  <input type="text" name="contactPhone" value={formData.contactPhone} onChange={handleChange} placeholder="+1 555-0199" className="input" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Designation / Role</label>
                  <input type="text" name="contactDesignation" value={formData.contactDesignation} onChange={handleChange} placeholder="VP of Technology" className="input" />
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'rgba(15, 23, 42, 0.4)' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 120 }}>
              {saving ? 'Saving...' : customer ? 'Update Customer' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ================================================================
// Customer 360° Unified View Drawer
// ================================================================
function Customer360Drawer({
  customer,
  contacts,
  notes,
  documents,
  deals,
  drawerTab,
  setDrawerTab,
  onClose,
  onEdit,
  onAddContact,
  onEditContact,
  onDeleteContact,
  onSetPrimaryContact,
  noteContent,
  setNoteContent,
  noteType,
  setNoteType,
  onAddNote,
  onDeleteNote,
  docCategory,
  setDocCategory,
  onFileUpload,
  onDownloadDoc,
  onDeleteDoc,
  uploadingDoc,
  fileInputRef
}) {
  const tabs = [
    { id: 'overview', label: '1. Overview', icon: Building2 },
    { id: 'contacts', label: `2. Contacts (${contacts.length})`, icon: Users },
    { id: 'deals', label: `3. Deals (${deals.length})`, icon: DollarSign },
    { id: 'quotations', label: '4. Quotations & Invoices', icon: FileText },
    { id: 'activity', label: `5. Activity (${notes.length})`, icon: Clock },
    { id: 'documents', label: `6. Documents (${documents.length})`, icon: Paperclip }
  ];

  const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0];
  const totalDealsValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

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
          maxWidth: 900,
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 700
                }}
              >
                {customer.companyName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>
                    {customer.companyName}
                  </h2>
                  <span className={`badge ${customer.isActive ? 'badge-success' : 'badge-inactive'}`}>
                    {customer.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, color: 'var(--text-muted)', fontSize: 13 }}>
                  <span><Briefcase size={13} style={{ verticalAlign: -2 }} /> {customer.industry || 'General Industry'}</span>
                  {customer.website && (
                    <a href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`} target="_blank" rel="noreferrer" style={{ color: '#818cf8', textDecoration: 'none' }}>
                      <Globe size={13} style={{ verticalAlign: -2 }} /> {customer.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>
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

          <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = drawerTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setDrawerTab(tab.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                    color: isActive ? '#818cf8' : 'var(--text-muted)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Drawer Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* TAB 1: OVERVIEW */}
          {drawerTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 14, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Total Contacts</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)', marginTop: 4 }}>{contacts.length}</div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 14, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Active Deals</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#34d399', marginTop: 4 }}>{deals.length}</div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 14, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Pipeline Value</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#818cf8', marginTop: 6 }}>₹{totalDealsValue.toLocaleString()}</div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 14, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Documents</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)', marginTop: 4 }}>{documents.length}</div>
                </div>
              </div>

              {/* Primary Contact Card */}
              <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 14, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Star size={15} style={{ color: '#f59e0b' }} /> Key Decision Maker / Primary Contact
                  </h4>
                  {primaryContact && (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                      Primary
                    </span>
                  )}
                </div>
                {primaryContact ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)' }}>
                        {primaryContact.firstName} {primaryContact.lastName}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {primaryContact.designation || 'Key Contact'} {primaryContact.department ? `• ${primaryContact.department}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {primaryContact.phone && (
                        <a href={`tel:${primaryContact.phone}`} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                          <Phone size={13} /> {primaryContact.phone}
                        </a>
                      )}
                      {primaryContact.email && (
                        <a href={`mailto:${primaryContact.email}`} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                          <Mail size={13} /> {primaryContact.email}
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-dim)', fontSize: 13, fontStyle: 'italic' }}>
                    No primary contact assigned.
                  </div>
                )}
              </div>

              {/* Addresses & Tax Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 16, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 13.5, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={14} style={{ color: '#818cf8' }} /> Billing Address
                  </h4>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    {customer.billingAddress?.street && <div>{customer.billingAddress.street}</div>}
                    <div>
                      {[customer.billingAddress?.city, customer.billingAddress?.state, customer.billingAddress?.zip].filter(Boolean).join(', ') || 'No address provided'}
                    </div>
                    {customer.billingAddress?.country && <div>{customer.billingAddress.country}</div>}
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 16, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 13.5, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Shield size={14} style={{ color: '#10b981' }} /> Tax & Compliance
                  </h4>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div><strong>Tax ID / EIN:</strong> {customer.taxId || '—'}</div>
                    <div><strong>GSTIN:</strong> {customer.gstin || '—'}</div>
                    <div><strong>PAN Number:</strong> {customer.panNumber || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTACTS */}
          {drawerTab === 'contacts' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>Contact Directory</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>Personnel associated with {customer.companyName}</p>
                </div>
                <button onClick={onAddContact} className="btn btn-primary" style={{ padding: '7px 14px', fontSize: 13, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={15} /> Add Contact
                </button>
              </div>

              {contacts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <Users size={36} style={{ color: 'var(--text-dim)', marginBottom: 8 }} />
                  <p>No contacts added yet.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                  {contacts.map((c) => (
                    <div
                      key={c._id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.4)',
                        border: c.isPrimary ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
                        borderRadius: 12,
                        padding: 16,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 16
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: '50%',
                            background: c.isPrimary ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#334155',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 15
                          }}
                        >
                          {c.firstName.charAt(0)}{c.lastName ? c.lastName.charAt(0) : ''}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14 }}>
                              {c.firstName} {c.lastName}
                            </span>
                            {c.isPrimary && (
                              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                                Primary
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 2 }}>
                            {c.designation || 'Staff'} {c.department ? `(${c.department})` : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {!c.isPrimary && (
                          <button onClick={() => onSetPrimaryContact(c._id)} className="btn btn-outline" style={{ padding: '5px 9px', fontSize: 11, borderRadius: 6 }}>
                            <Star size={12} style={{ marginRight: 4 }} /> Make Primary
                          </button>
                        )}
                        <button onClick={() => onEditContact(c)} className="btn btn-outline" style={{ padding: '6px 8px', borderRadius: 6 }}>
                          <Edit3 size={13} />
                        </button>
                        <button onClick={() => onDeleteContact(c._id)} className="btn btn-outline" style={{ padding: '6px 8px', borderRadius: 6, color: '#ef4444' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DEALS (LIVE INTEGRATION) */}
          {drawerTab === 'deals' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>Deals Pipeline Opportunities</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>Active, won, and lost sales deals tied to this account</p>
                </div>
                <a href="/deals" className="btn btn-primary" style={{ padding: '7px 14px', fontSize: 13, borderRadius: 8, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={15} /> Open Deals Kanban
                </a>
              </div>

              {deals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, border: '1px dashed var(--border-strong)' }}>
                  <DollarSign size={36} style={{ color: 'var(--text-dim)', marginBottom: 8 }} />
                  <p>No deals created for this customer yet.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                  {deals.map((d) => (
                    <div
                      key={d._id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.4)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 10,
                        padding: '14px 18px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14 }}>{d.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
                          Win Probability: <strong>{d.probability}%</strong> • Expected: {d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString() : 'No date'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#34d399' }}>₹ {d.value?.toLocaleString()}</div>
                          <span
                            className={`badge ${
                              d.status === 'Won' ? 'badge-success' :
                              d.status === 'Lost' ? 'badge-inactive' : ''
                            }`}
                            style={d.status === 'Open' ? { background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' } : {}}
                          >
                            {d.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: QUOTATIONS */}
          {drawerTab === 'quotations' && (
            <div>
              <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, padding: 30, textAlign: 'center', border: '1px dashed var(--border-strong)' }}>
                <FileText size={40} style={{ color: '#10b981', marginBottom: 10 }} />
                <h4 style={{ margin: '0 0 6px', color: 'var(--text-main)', fontSize: 16 }}>Financial Invoicing Hub</h4>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13.5 }}>
                  Quotations and Invoices created in Module 9 will automatically aggregate here.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: ACTIVITY TIMELINE */}
          {drawerTab === 'activity' && (
            <div>
              <form onSubmit={onAddNote} style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {['note', 'call-log', 'email-log', 'meeting'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNoteType(t)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: noteType === t ? '#6366f1' : 'rgba(148, 163, 184, 0.1)',
                        color: noteType === t ? '#fff' : 'var(--text-muted)',
                        fontSize: 12,
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
                  placeholder={`Log a ${noteType}...`}
                  rows={2}
                  className="input"
                  style={{ width: '100%', resize: 'vertical', fontSize: 13.5, marginBottom: 10 }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13, borderRadius: 6 }}>
                    Post Activity
                  </button>
                </div>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {notes.map((n) => (
                  <div key={n._id} style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 14, display: 'flex', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MessageSquare size={14} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
                          {n.createdBy ? `${n.createdBy.firstName} ${n.createdBy.lastName}` : 'System'}
                        </span>
                        <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{n.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: DOCUMENTS */}
          {drawerTab === 'documents' && (
            <div>
              <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px dashed var(--border-strong)', borderRadius: 12, padding: 18, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Upload size={16} style={{ color: '#818cf8' }} /> Attach Document
                  </h4>
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)' }}>Upload contracts, NDAs, proposals (Max 10MB)</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <select value={docCategory} onChange={(e) => setDocCategory(e.target.value)} className="input" style={{ height: 36, fontSize: 12.5 }}>
                    {DOCUMENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input type="file" ref={fileInputRef} onChange={onFileUpload} style={{ display: 'none' }} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-primary" disabled={uploadingDoc} style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
                    {uploadingDoc ? 'Uploading...' : 'Choose File'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                {documents.map((d) => (
                  <div key={d._id} style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <FileText size={20} style={{ color: '#818cf8' }} />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 13.5 }}>{d.name || d.originalName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{d.category} • {(d.fileSize / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => onDownloadDoc(d)} className="btn btn-outline" style={{ padding: '6px 10px', fontSize: 12 }}>
                        <Download size={13} style={{ marginRight: 4 }} /> Download
                      </button>
                      <button onClick={() => onDeleteDoc(d._id)} className="btn btn-outline" style={{ padding: '6px 8px', color: '#ef4444' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// Add / Edit Contact Sub-Modal
// ================================================================
function ContactFormModal({ isOpen, onClose, contact, onSave }) {
  const [formData, setFormData] = useState({
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    designation: contact?.designation || '',
    department: contact?.department || '',
    isPrimary: contact?.isPrimary || false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.firstName.trim()) return;
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 14, width: '100%', maxWidth: 500, padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>{contact ? 'Edit Contact' : 'Add Contact'}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First Name *" className="input" required />
            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last Name" className="input" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="input" />
            <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone" className="input" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input type="text" name="designation" value={formData.designation} onChange={handleChange} placeholder="Designation" className="input" />
            <input type="text" name="department" value={formData.department} onChange={handleChange} placeholder="Department" className="input" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="isPrimary" name="isPrimary" checked={formData.isPrimary} onChange={handleChange} />
            <label htmlFor="isPrimary" style={{ fontSize: 13, color: 'var(--text-muted)' }}>Make Primary Contact</label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-primary">{contact ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
