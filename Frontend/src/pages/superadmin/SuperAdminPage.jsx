import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import {
  ShieldAlert,
  Building,
  Users,
  DollarSign,
  Activity,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Layers,
  ArrowUpRight,
  HardDrive,
  Cpu,
  Clock,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
  Loader2,
  Award,
  Globe,
  Mail,
  ChevronRight
} from 'lucide-react';

const SuperAdminPage = () => {
  const [activeTab, setActiveTab] = useState('tenants'); // 'tenants' | 'plans' | 'health'
  const [dashboardData, setDashboardData] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Forms
  const [provisionForm, setProvisionForm] = useState({
    name: '',
    slug: '',
    industry: 'Software & IT',
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPassword: 'Password123!',
    plan: 'business',
    trialDays: 30
  });

  const [upgradePlan, setUpgradePlan] = useState('enterprise');

  // Fetch Dashboard & Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, tenantsRes, plansRes, healthRes] = await Promise.all([
        api.get('/super-admin/dashboard'),
        api.get('/super-admin/tenants'),
        api.get('/super-admin/plans'),
        api.get('/super-admin/system-health')
      ]);

      const dashData = dashRes?.data || dashRes;
      const tenantsData = tenantsRes?.data?.tenants || tenantsRes?.tenants || tenantsRes?.data || [];
      const plansData = plansRes?.data?.plans || plansRes?.plans || plansRes?.data || [];
      const healthData = healthRes?.data || healthRes;

      if (dashData) setDashboardData(dashData);
      if (tenantsData) setTenants(Array.isArray(tenantsData) ? tenantsData : []);
      if (plansData) setPlans(Array.isArray(plansData) ? plansData : []);
      if (healthData) setSystemHealth(healthData);
    } catch (err) {
      console.error('Failed to load Super-Admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Provisioning
  const handleProvisionTenant = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await api.post('/super-admin/tenants/provision', provisionForm);
      if (res?.success || res?.data?.success) {
        setIsProvisionModalOpen(false);
        setProvisionForm({
          name: '',
          slug: '',
          industry: 'Software & IT',
          ownerFirstName: '',
          ownerLastName: '',
          ownerEmail: '',
          ownerPassword: 'Password123!',
          plan: 'business',
          trialDays: 30
        });
        fetchData();
      }
    } catch (err) {
      alert(err.customMessage || err.response?.data?.message || 'Failed to provision tenant workspace');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Status Toggle (Suspend / Reactivate)
  const handleToggleTenantStatus = async (tenant) => {
    const newStatus = !tenant.isActive;
    const confirmMsg = newStatus
      ? `Reactivate workspace "${tenant.name}"? Users will regain platform access.`
      : `Suspend workspace "${tenant.name}"? All tenant users will be blocked immediately.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setActionLoading(true);
      const res = await api.patch(`/super-admin/tenants/${tenant._id}/status`, {
        isActive: newStatus,
        status: newStatus ? 'active' : 'cancelled'
      });
      if (res.data?.success) {
        setTenants((prev) =>
          prev.map((t) => (t._id === tenant._id ? { ...t, isActive: newStatus } : t))
        );
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update tenant status');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Plan Upgrade
  const handleUpgradeTenantPlan = async (e) => {
    e.preventDefault();
    if (!selectedTenant) return;

    try {
      setActionLoading(true);
      const res = await api.patch(`/super-admin/tenants/${selectedTenant._id}/plan`, {
        plan: upgradePlan,
        extendDays: 30
      });
      if (res.data?.success) {
        setIsUpgradeModalOpen(false);
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upgrade subscription plan');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Tenants List
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlan = planFilter === 'all' || t.subscription?.plan === planFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && t.isActive && t.subscription?.status === 'active') ||
      (statusFilter === 'trial' && t.isActive && t.subscription?.status === 'trial') ||
      (statusFilter === 'suspended' && !t.isActive);

    return matchesSearch && matchesPlan && matchesStatus;
  });

  const m = dashboardData?.metrics || {};
  const sys = systemHealth || dashboardData?.systemHealth || {};

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
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(249, 115, 22, 0.2))',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171'
            }}
          >
            <ShieldAlert size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#fff' }}>
                SaaS Super-Admin
              </h1>
              <span
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '700'
                }}
              >
                Platform Operator
              </span>
            </div>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13.5px' }}>
              Global commercial workspace oversight, platform MRR & ARR, server telemetry, and tenant provisioning
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
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setIsProvisionModalOpen(true)}
            style={{
              gap: '6px',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              border: 'none',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
            }}
          >
            <Plus size={16} />
            <span>Provision New Tenant</span>
          </button>
        </div>
      </div>

      {/* ── Top Executive KPI Cards ─────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {/* Card 1: Total Tenants */}
        <div
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            padding: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}
          >
            <Building size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Workspaces
            </span>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
              {m.totalOrgs || 0}
            </div>
            <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <span>{m.activeOrgs || 0} Active</span>
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span style={{ color: '#fbbf24' }}>{m.trialOrgs || 0} Trial</span>
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span style={{ color: '#f87171' }}>{m.suspendedOrgs || 0} Suspended</span>
            </div>
          </div>
        </div>

        {/* Card 2: Platform MRR */}
        <div
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            padding: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981'
            }}
          >
            <DollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Platform MRR
            </span>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
              ₹{(m.mrrINR || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <TrendingUp size={12} />
              <span>ARR: ₹{(m.arrINR || 0).toLocaleString()} (~${m.arrUSD || 0})</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Platform Users */}
        <div
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            padding: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: 'rgba(129, 140, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8'
            }}
          >
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Multi-Tenant Users
            </span>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
              {m.totalUsers || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Across {m.totalOrgs || 0} company organizations
            </div>
          </div>
        </div>

        {/* Card 4: System Health */}
        <div
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            padding: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#22c55e'
            }}
          >
            <Activity size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              System Health
            </span>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#22c55e', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }}></span>
              100% Operational
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Uptime: {sys.nodeProcess?.uptimeFormatted || sys.uptimeFormatted || 'Active'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
          marginBottom: '20px'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('tenants')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'tenants' ? '2px solid #818cf8' : '2px solid transparent',
            color: activeTab === 'tenants' ? '#fff' : 'var(--text-muted)',
            fontWeight: activeTab === 'tenants' ? '700' : '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Building size={16} />
          <span>Tenant Directory ({tenants.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'plans' ? '2px solid #818cf8' : '2px solid transparent',
            color: activeTab === 'plans' ? '#fff' : 'var(--text-muted)',
            fontWeight: activeTab === 'plans' ? '700' : '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Award size={16} />
          <span>Subscription Plans Master</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('health')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'health' ? '2px solid #818cf8' : '2px solid transparent',
            color: activeTab === 'health' ? '#fff' : 'var(--text-muted)',
            fontWeight: activeTab === 'health' ? '700' : '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Server size={16} />
          <span>Server Telemetry & Diagnostics</span>
        </button>
      </div>

      {/* ── TAB 1: TENANTS DIRECTORY ────────────────────────────── */}
      {activeTab === 'tenants' && (
        <div>
          {/* Filter Bar */}
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.12)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                placeholder="Search tenant name, slug, email, industry..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Plan:</span>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px'
                }}
              >
                <option value="all">All Plans</option>
                <option value="starter">Starter</option>
                <option value="business">Business</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px'
                }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Tenants Data Table */}
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.12)',
              borderRadius: '12px',
              overflow: 'hidden'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#131d33', borderBottom: '1px solid rgba(148, 163, 184, 0.12)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 16px' }}>Organization / Workspace</th>
                  <th style={{ padding: '14px 16px' }}>Industry</th>
                  <th style={{ padding: '14px 16px' }}>Subscription Plan</th>
                  <th style={{ padding: '14px 16px' }}>Usage (Users / Leads)</th>
                  <th style={{ padding: '14px 16px' }}>Workspace Status</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No tenant workspaces found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => {
                    const planName = t.subscription?.plan || 'business';
                    const isSuspended = !t.isActive;
                    const planColor =
                      planName === 'enterprise' ? '#10b981' :
                      planName === 'professional' ? '#f59e0b' :
                      planName === 'business' ? '#818cf8' : '#38bdf8';

                    return (
                      <tr
                        key={t._id}
                        style={{
                          borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
                          backgroundColor: isSuspended ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                          transition: 'background-color 0.15s'
                        }}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{t.name}</span>
                            {isSuspended && (
                              <span style={{ fontSize: '10px', backgroundColor: '#ef444422', color: '#ef4444', padding: '1px 6px', borderRadius: '4px' }}>
                                Suspended
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '8px' }}>
                            <span>app.nexcrm.com/{t.slug}</span>
                            <span>•</span>
                            <span>{t.owner?.email || t.email}</span>
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>
                          {t.industry}
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              backgroundColor: `${planColor}22`,
                              color: planColor,
                              border: `1px solid ${planColor}44`
                            }}
                          >
                            {planName}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{t.userCount || 1} / {t.subscription?.maxUsers || 10} Users</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {t.leadCount || 0} / {(t.subscription?.maxLeads || 10000).toLocaleString()} Leads
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          {isSuspended ? (
                            <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                              <XCircle size={14} /> Suspended
                            </span>
                          ) : t.subscription?.status === 'trial' ? (
                            <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                              <Clock size={14} /> Trial (Active)
                            </span>
                          ) : (
                            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                              <CheckCircle2 size={14} /> Active (Paid)
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTenant(t);
                                setUpgradePlan(t.subscription?.plan || 'business');
                                setIsUpgradeModalOpen(true);
                              }}
                              className="btn btn-secondary btn-xs"
                              style={{ color: '#818cf8', borderColor: 'rgba(129, 140, 248, 0.3)' }}
                              title="Upgrade / Change Plan"
                            >
                              <Zap size={13} />
                              <span>Plan</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleTenantStatus(t)}
                              className="btn btn-secondary btn-xs"
                              style={{
                                color: t.isActive ? '#f87171' : '#10b981',
                                borderColor: t.isActive ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'
                              }}
                              title={t.isActive ? 'Suspend Workspace' : 'Reactivate Workspace'}
                            >
                              {t.isActive ? 'Suspend' : 'Reactivate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: SUBSCRIPTION PLANS MASTER ────────────────────── */}
      {activeTab === 'plans' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px'
          }}
        >
          {plans.map((plan) => {
            return (
              <div
                key={plan.id}
                style={{
                  backgroundColor: '#0f172a',
                  border: `1px solid ${plan.color}44`,
                  borderRadius: '16px',
                  padding: '24px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: `0 8px 30px -10px ${plan.color}22`
                }}
              >
                {plan.badge && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      backgroundColor: `${plan.color}22`,
                      color: plan.color,
                      border: `1px solid ${plan.color}66`,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '700'
                    }}
                  >
                    {plan.badge}
                  </div>
                )}

                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: '0 0 4px' }}>
                  {plan.name}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                  {plan.tagline}
                </p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '32px', fontWeight: '800', color: '#fff' }}>
                    ₹{plan.priceMonthlyINR?.toLocaleString()}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>/ month (${plan.priceMonthlyUSD}/mo)</span>
                </div>

                <div
                  style={{
                    backgroundColor: '#1e293b',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12.5px'
                  }}
                >
                  <span style={{ color: '#94a3b8' }}>Subscribed Workspaces:</span>
                  <strong style={{ color: plan.color }}>{plan.activeSubscribers || 0} Orgs</strong>
                </div>

                <div style={{ flex: '1', borderTop: '1px solid rgba(148, 163, 184, 0.12)', paddingTop: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Plan Limits & Features
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li style={{ fontSize: '13px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Check size={14} color={plan.color} />
                      <strong>Max {plan.maxUsers} Users</strong>
                    </li>
                    <li style={{ fontSize: '13px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Check size={14} color={plan.color} />
                      <strong>{(plan.maxLeads || 0).toLocaleString()} Leads Capacity</strong>
                    </li>
                    <li style={{ fontSize: '13px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Check size={14} color={plan.color} />
                      <span>{plan.storage} Cloud Document Storage</span>
                    </li>
                    {plan.features?.map((f, i) => (
                      <li key={i} style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Check size={14} color="#10b981" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 3: SERVER TELEMETRY & RUNTIME HEALTH ─────────────── */}
      {activeTab === 'health' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {/* Node.js Process & Memory Box */}
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.12)',
              borderRadius: '14px',
              padding: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Cpu size={20} color="#818cf8" />
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: 0 }}>
                Node.js Runtime & Memory Utilization
              </h3>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                <span>Heap Memory Used</span>
                <strong style={{ color: '#fff' }}>
                  {sys.nodeProcess?.memory?.heapUsedMB || sys.memory?.heapUsedMB || 0} MB / {sys.nodeProcess?.memory?.heapTotalMB || sys.memory?.heapTotalMB || 0} MB
                </strong>
              </div>
              <div style={{ height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${sys.nodeProcess?.memory?.heapUsagePercent || 45}%`,
                    backgroundColor: '#818cf8',
                    borderRadius: '4px'
                  }}
                ></div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(148, 163, 184, 0.08)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Node.js Version:</span>
                <span style={{ color: '#fff', fontWeight: '600' }}>{sys.nodeProcess?.version || sys.nodeVersion}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(148, 163, 184, 0.08)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Process RSS Memory:</span>
                <span style={{ color: '#fff', fontWeight: '600' }}>{sys.nodeProcess?.memory?.rssMB || sys.memory?.rssMB || 0} MB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(148, 163, 184, 0.08)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Process Uptime:</span>
                <span style={{ color: '#10b981', fontWeight: '600' }}>{sys.nodeProcess?.uptimeFormatted || sys.uptimeFormatted}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Host Platform:</span>
                <span style={{ color: '#fff', fontWeight: '600' }}>{sys.platform || 'Windows / Node.js'}</span>
              </div>
            </div>
          </div>

          {/* Database Connection Status Box */}
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.12)',
              borderRadius: '14px',
              padding: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <HardDrive size={20} color="#10b981" />
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: 0 }}>
                MongoDB Database Engine
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(148, 163, 184, 0.08)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Connection Status:</span>
                <span style={{ color: '#10b981', fontWeight: '700' }}>{sys.database?.status || 'Connected (Optimal)'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(148, 163, 184, 0.08)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Cluster Host:</span>
                <span style={{ color: '#fff', fontWeight: '600' }}>{sys.database?.host || 'localhost:27017'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(148, 163, 184, 0.08)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Database Name:</span>
                <span style={{ color: '#fff', fontWeight: '600' }}>{sys.database?.dbName || sys.database?.name || 'nex_crm_db'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Average Ping Latency:</span>
                <span style={{ color: '#38bdf8', fontWeight: '600' }}>~3.8 ms (Local Cluster)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PROVISION NEW TENANT ─────────────────────────── */}
      {isProvisionModalOpen && (
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
              maxWidth: '560px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={20} color="#818cf8" />
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>
                  Provision Tenant Workspace
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProvisionModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleProvisionTenant}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Global Tech"
                    value={provisionForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                      setProvisionForm({ ...provisionForm, name, slug });
                    }}
                    style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Workspace Subdomain Slug *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. apex-global"
                    value={provisionForm.slug}
                    onChange={(e) => setProvisionForm({ ...provisionForm, slug: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Owner First Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="John"
                    value={provisionForm.ownerFirstName}
                    onChange={(e) => setProvisionForm({ ...provisionForm, ownerFirstName: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Owner Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Doe"
                    value={provisionForm.ownerLastName}
                    onChange={(e) => setProvisionForm({ ...provisionForm, ownerLastName: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Owner Admin Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@company.com"
                  value={provisionForm.ownerEmail}
                  onChange={(e) => setProvisionForm({ ...provisionForm, ownerEmail: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Initial Subscription Plan
                  </label>
                  <select
                    value={provisionForm.plan}
                    onChange={(e) => setProvisionForm({ ...provisionForm, plan: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                  >
                    <option value="starter">Starter (3 Users / 2.5k Leads)</option>
                    <option value="business">Business (10 Users / 10k Leads)</option>
                    <option value="professional">Professional (25 Users / 50k Leads)</option>
                    <option value="enterprise">Enterprise (100 Users / 500k Leads)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Industry Vertical
                  </label>
                  <select
                    value={provisionForm.industry}
                    onChange={(e) => setProvisionForm({ ...provisionForm, industry: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                  >
                    <option value="Software & IT">Software & IT</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Digital Marketing Agency">Digital Marketing Agency</option>
                    <option value="Education & Immigration">Education & Immigration</option>
                    <option value="Financial Services">Financial Services</option>
                    <option value="Generic Business">Generic Business</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsProvisionModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary btn-sm"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: 'none', gap: '6px' }}
                >
                  {actionLoading ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                  <span>Provision Workspace</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: UPGRADE / CHANGE PLAN ────────────────────────── */}
      {isUpgradeModalOpen && selectedTenant && (
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
              maxWidth: '480px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={20} color="#f59e0b" />
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>
                  Upgrade Subscription Plan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Target Tenant: <strong style={{ color: '#fff' }}>{selectedTenant.name}</strong> ({selectedTenant.slug})
            </p>

            <form onSubmit={handleUpgradeTenantPlan}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {['starter', 'business', 'professional', 'enterprise'].map((pId) => {
                  const pObj = plans.find((p) => p.id === pId) || {};
                  const isSelected = upgradePlan === pId;
                  return (
                    <div
                      key={pId}
                      onClick={() => setUpgradePlan(pId)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #818cf8' : '1px solid rgba(148, 163, 184, 0.15)',
                        backgroundColor: isSelected ? 'rgba(129, 140, 248, 0.1)' : '#1e293b',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', color: '#fff', textTransform: 'capitalize' }}>
                          {pId} Plan
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Max {pObj.maxUsers || 10} Users • {(pObj.maxLeads || 10000).toLocaleString()} Leads
                        </div>
                      </div>
                      <div style={{ fontWeight: '800', color: isSelected ? '#818cf8' : '#fff' }}>
                        ₹{(pObj.priceMonthlyINR || 0).toLocaleString()}/mo
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsUpgradeModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary btn-sm"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', gap: '6px' }}
                >
                  {actionLoading ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                  <span>Confirm Plan Upgrade</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPage;
