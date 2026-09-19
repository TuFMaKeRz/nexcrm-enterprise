import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import {
  Building,
  Code,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  Calendar,
  DollarSign,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowRight,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  Layers,
  Check,
  X,
  Loader2,
  Tag,
  Shield,
  Send,
  Kanban
} from 'lucide-react';

const PACK_CARDS = [
  {
    id: 'real_estate',
    name: 'Real Estate & Property Development',
    tagline: 'Property types, site visit dispatching, broker commissions & localities',
    icon: Building,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)'
  },
  {
    id: 'agency_software',
    name: 'Digital Agency & Software Engineering',
    tagline: 'Project discovery briefs, tech stack tagger, milestone scopes & retainers',
    icon: Code,
    color: '#818cf8',
    bg: 'rgba(129, 140, 248, 0.15)'
  },
  {
    id: 'education_consultancy',
    name: 'Education Consultancy & Study Abroad',
    tagline: 'Target universities, country preferences, intake sessions & 5-stage visa journey',
    icon: GraduationCap,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)'
  },
  {
    id: 'general_b2b',
    name: 'Enterprise B2B & General Sales',
    tagline: 'Universal high-velocity B2B sales pipeline, quotations and multi-tier billing',
    icon: Briefcase,
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.15)'
  }
];

const IndustryPacksPage = () => {
  const [activePack, setActivePack] = useState('real_estate');
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  // Real Estate State
  const [siteVisits, setSiteVisits] = useState([]);
  const [visitSummary, setVisitSummary] = useState({});
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [visitForm, setVisitForm] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    propertyName: '',
    propertyType: '3 BHK Luxury Apartment',
    locality: 'Whitefield',
    propertyBudget: 15000000,
    scheduledDate: '',
    brokerName: '',
    brokerPhone: '',
    brokerCommissionRate: 2.0
  });

  // Agency Scope State
  const [agencyCalc, setAgencyCalc] = useState({
    projectName: 'Custom Cloud SaaS Enterprise Application',
    selectedTechStacks: ['React', 'Next.js', 'Node.js', 'AWS / Cloud', 'AI / LLM Integration'],
    estimatedHours: 180,
    hourlyRate: 2500,
    contractMonths: 6,
    billingModel: 'Monthly Dedicated Retainer'
  });
  const [scopeResult, setScopeResult] = useState(null);

  // Education Consultancy State
  const [applications, setApplications] = useState([]);
  const [eduSummary, setEduSummary] = useState({});
  const [isEduModalOpen, setIsEduModalOpen] = useState(false);
  const [eduForm, setEduForm] = useState({
    studentName: '',
    studentPhone: '',
    studentEmail: '',
    targetCountry: 'United States',
    targetUniversity: 'Northeastern University, Boston',
    courseName: 'M.S. in Computer Science',
    courseType: 'Master of Science (MS)',
    intakeSession: 'Fall 2026',
    tuitionFeeEstimate: 3200000
  });

  const fetchPackData = useCallback(async () => {
    try {
      setLoading(true);
      const [configRes, visitsRes, eduRes] = await Promise.all([
        api.get('/industry-packs'),
        api.get('/industry/site-visits'),
        api.get('/industry/education-applications')
      ]);

      if (configRes.data?.success) {
        setActivePack(configRes.data.data.activePack);
        setConfig(configRes.data.data.config);
      }
      if (visitsRes.data?.success) {
        setSiteVisits(visitsRes.data.data.visits || []);
        setVisitSummary(visitsRes.data.data.summary || {});
      }
      if (eduRes.data?.success) {
        setApplications(eduRes.data.data.applications || []);
        setEduSummary(eduRes.data.data.stageBreakdown || {});
      }
    } catch (err) {
      console.error('Failed to load industry packs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackData();
  }, [fetchPackData]);

  // Recalculate Agency Scope
  const runAgencyCalculation = useCallback(async () => {
    try {
      const res = await api.post('/industry/agency-scopes', agencyCalc);
      if (res.data?.success) {
        setScopeResult(res.data.data);
      }
    } catch (err) {
      console.error('Failed to calculate agency scope:', err);
    }
  }, [agencyCalc]);

  useEffect(() => {
    runAgencyCalculation();
  }, [runAgencyCalculation]);

  const handleActivatePack = async (packId) => {
    try {
      setActivePack(packId);
      setSwitching(true);
      const res = await api.post('/industry-packs/activate', { packType: packId });
      if (res.data?.success) {
        setConfig(res.data.data.config);
      }
    } catch (err) {
      console.error('Failed to activate pack:', err);
    } finally {
      setSwitching(false);
    }
  };

  const handleCreateSiteVisit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/industry/site-visits', visitForm);
      if (res.data?.success) {
        setSiteVisits([res.data.data, ...siteVisits]);
        setIsVisitModalOpen(false);
        fetchPackData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to schedule site visit');
    }
  };

  const handleUpdateVisitStatus = async (visitId, status) => {
    try {
      const res = await api.patch(`/industry/site-visits/${visitId}/status`, { status });
      if (res.data?.success) {
        setSiteVisits((prev) => prev.map((v) => (v._id === visitId ? res.data.data : v)));
      }
    } catch (err) {
      console.error('Failed to update visit status:', err);
    }
  };

  const handleCreateEduApplication = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/industry/education-applications', eduForm);
      if (res.data?.success) {
        setApplications([res.data.data, ...applications]);
        setIsEduModalOpen(false);
        fetchPackData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register education application');
    }
  };

  const handleUpdateEduStage = async (appId, visaStage) => {
    try {
      const res = await api.patch(`/industry/education-applications/${appId}/stage`, { visaStage });
      if (res.data?.success) {
        setApplications((prev) => prev.map((a) => (a._id === appId ? res.data.data : a)));
        fetchPackData();
      }
    } catch (err) {
      console.error('Failed to update visa stage:', err);
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
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8'
            }}
          >
            <Layers size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#fff' }}>
              Industry Customization Packs
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13.5px' }}>
              Tailor NexCRM for your specific vertical: Real Estate, Digital Agency / Software, or Education Consultancy
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={fetchPackData}
          style={{ gap: '6px' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── 1-CLICK INDUSTRY PACK SWITCHER CARDS ────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}
      >
        {PACK_CARDS.map((pack) => {
          const Icon = pack.icon;
          const isActive = activePack === pack.id;
          return (
            <div
              key={pack.id}
              onClick={() => handleActivatePack(pack.id)}
              style={{
                backgroundColor: '#0f172a',
                border: isActive ? `2px solid ${pack.color}` : '1px solid rgba(148, 163, 184, 0.15)',
                borderRadius: '14px',
                padding: '18px',
                cursor: 'pointer',
                position: 'relative',
                boxShadow: isActive ? `0 0 20px -5px ${pack.color}44` : 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
                transform: isActive ? 'translateY(-2px)' : 'none'
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: `${pack.color}22`,
                    color: pack.color,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '700'
                  }}
                >
                  <Check size={12} />
                  <span>ACTIVE</span>
                </div>
              )}

              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: pack.bg,
                  color: pack.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}
              >
                <Icon size={20} />
              </div>

              <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
                {pack.name}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                {pack.tagline}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── ACTIVE INDUSTRY PACK WORKSPACE ─────────────────────── */}
      {activePack === 'real_estate' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Real Estate KPI Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <Calendar size={22} />
              </div>
              <div className="kpi-content">
                <div className="kpi-title">Total Site Visits</div>
                <div className="kpi-value">{visitSummary.totalVisits || 0}</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <CheckCircle2 size={22} />
              </div>
              <div className="kpi-content">
                <div className="kpi-title">Units Booked</div>
                <div className="kpi-value">{visitSummary.bookedUnits || 0}</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                <DollarSign size={22} />
              </div>
              <div className="kpi-content">
                <div className="kpi-title">Broker Commissions</div>
                <div className="kpi-value">₹{(visitSummary.totalCommissions || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          {/* Site Visit Scheduler & Commission Ledger */}
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              borderRadius: '14px',
              padding: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>
                  Site Visit Bookings & Broker Commission Ledger
                </div>
                <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                  Manage client property tours, assigned representatives, and channel partner commission payouts.
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsVisitModalOpen(true)}
                style={{ gap: '6px' }}
              >
                <Plus size={14} />
                <span>Book Site Visit</span>
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#131d33', color: '#94a3b8', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                    <th style={{ padding: '10px 14px' }}>Client</th>
                    <th style={{ padding: '10px 14px' }}>Property & Type</th>
                    <th style={{ padding: '10px 14px' }}>Locality</th>
                    <th style={{ padding: '10px 14px' }}>Scheduled Date</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px' }}>Broker & Commission</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {siteVisits.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                        No site visits scheduled yet. Click "Book Site Visit" above.
                      </td>
                    </tr>
                  ) : (
                    siteVisits.map((v) => (
                      <tr key={v._id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: '600', color: '#fff' }}>{v.clientName}</div>
                          <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>{v.clientPhone}</div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ color: '#cbd5e1' }}>{v.propertyName}</div>
                          <div style={{ fontSize: '11.5px', color: '#818cf8' }}>{v.propertyType}</div>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{v.locality}</td>
                        <td style={{ padding: '10px 14px', color: '#fbbf24', fontSize: '12px' }}>
                          {new Date(v.scheduledDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            className="badge"
                            style={{
                              backgroundColor:
                                v.status === 'Booked Unit'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : v.status === 'Completed'
                                  ? 'rgba(99, 102, 241, 0.15)'
                                  : v.status === 'Cancelled'
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : 'rgba(245, 158, 11, 0.15)',
                              color:
                                v.status === 'Booked Unit'
                                  ? '#34d399'
                                  : v.status === 'Completed'
                                  ? '#818cf8'
                                  : v.status === 'Cancelled'
                                  ? '#f87171'
                                  : '#fbbf24'
                            }}
                          >
                            {v.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {v.brokerName ? (
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>
                                {v.brokerName} ({v.brokerCommissionRate}%)
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#34d399' }}>
                                Payout: ₹{v.brokerCommissionAmount?.toLocaleString('en-IN')}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '12px' }}>Direct Client</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <select
                            value={v.status}
                            onChange={(e) => handleUpdateVisitStatus(v._id, e.target.value)}
                            style={{
                              backgroundColor: '#131d33',
                              border: '1px solid rgba(148, 163, 184, 0.2)',
                              color: '#fff',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '11.5px',
                              outline: 'none'
                            }}
                          >
                            <option value="Scheduled">Scheduled</option>
                            <option value="Completed">Completed</option>
                            <option value="Booked Unit">Booked Unit 🎉</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── AGENCY & SOFTWARE WORKSPACE ───────────────────────── */}
      {activePack === 'agency_software' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {/* Tech Stack Tagger & Scoping Parameters */}
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              borderRadius: '14px',
              padding: '20px'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
              Project Discovery & Tech Stack Scoping
            </div>
            <div style={{ fontSize: '12.5px', color: '#94a3b8', marginBottom: '16px' }}>
              Configure architecture tech tags, hourly rates, and milestone deliverables.
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                Project Title:
              </label>
              <input
                type="text"
                value={agencyCalc.projectName}
                onChange={(e) => setAgencyCalc({ ...agencyCalc, projectName: e.target.value })}
                className="input-control"
              />
            </div>

            {/* Tech Stack Badges */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                Architecture Tech Stack Tags:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {config?.agencySettings?.techStacks?.map((tech) => {
                  const isSelected = agencyCalc.selectedTechStacks.includes(tech);
                  return (
                    <button
                      key={tech}
                      type="button"
                      onClick={() => {
                        const next = isSelected
                          ? agencyCalc.selectedTechStacks.filter((t) => t !== tech)
                          : [...agencyCalc.selectedTechStacks, tech];
                        setAgencyCalc({ ...agencyCalc, selectedTechStacks: next });
                      }}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '20px',
                        border: isSelected ? '1px solid #818cf8' : '1px solid rgba(148, 163, 184, 0.15)',
                        backgroundColor: isSelected ? 'rgba(129, 140, 248, 0.2)' : '#131d33',
                        color: isSelected ? '#fff' : '#94a3b8',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {tech}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Estimated Hours:
                </label>
                <input
                  type="number"
                  value={agencyCalc.estimatedHours}
                  onChange={(e) => setAgencyCalc({ ...agencyCalc, estimatedHours: parseFloat(e.target.value) || 0 })}
                  className="input-control"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Hourly Rate (₹):
                </label>
                <input
                  type="number"
                  value={agencyCalc.hourlyRate}
                  onChange={(e) => setAgencyCalc({ ...agencyCalc, hourlyRate: parseFloat(e.target.value) || 0 })}
                  className="input-control"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Contract Duration:
                </label>
                <select
                  value={agencyCalc.contractMonths}
                  onChange={(e) => setAgencyCalc({ ...agencyCalc, contractMonths: parseInt(e.target.value, 10) })}
                  className="input-control"
                >
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={12}>12 Months (Annual AMC)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Billing Model:
                </label>
                <select
                  value={agencyCalc.billingModel}
                  onChange={(e) => setAgencyCalc({ ...agencyCalc, billingModel: e.target.value })}
                  className="input-control"
                >
                  <option value="Monthly Dedicated Retainer">Monthly Retainer</option>
                  <option value="Fixed Milestone Price">Fixed Milestone</option>
                  <option value="Hourly Time & Material">Hourly T&M</option>
                </select>
              </div>
            </div>
          </div>

          {/* Scope Output & Retainer Breakdown Card */}
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(129, 140, 248, 0.3)',
              borderRadius: '14px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
                Estimated Budget & Milestone Breakdown
              </div>
              <div style={{ fontSize: '12.5px', color: '#94a3b8', marginBottom: '16px' }}>
                Auto-calculated proposal estimate based on selected engineering scope.
              </div>

              <div
                style={{
                  backgroundColor: '#131d33',
                  padding: '16px',
                  borderRadius: '10px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>
                  Total Project Engineering Cost
                </div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#34d399', margin: '4px 0 10px' }}>
                  ₹{(scopeResult?.totalDevelopmentCost || 0).toLocaleString('en-IN')}
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#cbd5e1' }}>
                  <div>
                    Monthly Retainer: <strong>₹{(scopeResult?.monthlyRetainer || 0).toLocaleString('en-IN')}/mo</strong>
                  </div>
                  <div>
                    Contract: <strong>{agencyCalc.contractMonths} Months</strong>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
                Suggested Milestone Deliverables:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {scopeResult?.suggestedMilestones?.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'rgba(129, 140, 248, 0.08)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '12.5px'
                    }}
                  >
                    <span style={{ color: '#cbd5e1', fontWeight: '500' }}>{m.milestone}</span>
                    <span style={{ color: '#818cf8', fontWeight: '700' }}>
                      ₹{m.amount.toLocaleString('en-IN')} ({m.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => alert('Scope estimate attached to Quotations generator!')}
                style={{ width: '100%', gap: '6px' }}
              >
                <Sparkles size={16} />
                <span>Generate Branded Agency Quotation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDUCATION CONSULTANCY WORKSPACE ────────────────────── */}
      {activePack === 'education_consultancy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Visual 5-Stage Visa Journey Pipeline Kanban */}
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              borderRadius: '14px',
              padding: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>
                  Student University & 5-Stage Visa Journey Pipeline
                </div>
                <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                  Track admissions from Application Submission to Visa Approval & Flight Booking.
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsEduModalOpen(true)}
                style={{ gap: '6px' }}
              >
                <Plus size={14} />
                <span>Register Student Application</span>
              </button>
            </div>

            {/* 5-Stage Pipeline Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {config?.educationSettings?.visaStages?.map((stage, sIdx) => {
                const stageApps = applications.filter((a) => a.visaStage === stage);
                return (
                  <div
                    key={stage}
                    style={{
                      backgroundColor: '#131d33',
                      borderRadius: '10px',
                      padding: '12px',
                      border: '1px solid rgba(148, 163, 184, 0.12)'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px',
                        borderBottom: '2px solid #10b981',
                        paddingBottom: '6px'
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>
                        {sIdx + 1}. {stage.split(' ')[0]}
                      </span>
                      <span
                        style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.2)',
                          color: '#34d399',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '1px 6px',
                          borderRadius: '8px'
                        }}
                      >
                        {stageApps.length}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '120px' }}>
                      {stageApps.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#64748b', fontSize: '11px', padding: '20px 0' }}>
                          No students
                        </div>
                      ) : (
                        stageApps.map((app) => (
                          <div
                            key={app._id}
                            style={{
                              backgroundColor: '#0f172a',
                              border: '1px solid rgba(148, 163, 184, 0.15)',
                              borderRadius: '8px',
                              padding: '10px',
                              fontSize: '12px'
                            }}
                          >
                            <div style={{ fontWeight: '700', color: '#fff' }}>{app.studentName}</div>
                            <div style={{ color: '#818cf8', fontSize: '11.5px', marginTop: '2px' }}>
                              {app.targetUniversity}
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                              {app.targetCountry} • {app.intakeSession}
                            </div>

                            {sIdx < 4 && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateEduStage(
                                    app._id,
                                    config.educationSettings.visaStages[sIdx + 1]
                                  )
                                }
                                style={{
                                  marginTop: '8px',
                                  width: '100%',
                                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                  color: '#34d399',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '4px',
                                  padding: '4px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                              >
                                <span>Advance Stage</span>
                                <ArrowRight size={11} />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SCHEDULE SITE VISIT ─────────────────────────── */}
      {isVisitModalOpen && (
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
              maxWidth: '560px',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>
                Book Real Estate Site Visit
              </div>
              <button
                onClick={() => setIsVisitModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSiteVisit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Malhotra"
                    value={visitForm.clientName}
                    onChange={(e) => setVisitForm({ ...visitForm, clientName: e.target.value })}
                    className="input-control"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                    Client Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 43210"
                    value={visitForm.clientPhone}
                    onChange={(e) => setVisitForm({ ...visitForm, clientPhone: e.target.value })}
                    className="input-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                    Property Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Emerald Peak Heights"
                    value={visitForm.propertyName}
                    onChange={(e) => setVisitForm({ ...visitForm, propertyName: e.target.value })}
                    className="input-control"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                    Property Type
                  </label>
                  <select
                    value={visitForm.propertyType}
                    onChange={(e) => setVisitForm({ ...visitForm, propertyType: e.target.value })}
                    className="input-control"
                  >
                    {config?.realEstateSettings?.propertyTypes?.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                    Locality
                  </label>
                  <select
                    value={visitForm.locality}
                    onChange={(e) => setVisitForm({ ...visitForm, locality: e.target.value })}
                    className="input-control"
                  >
                    {config?.realEstateSettings?.localities?.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                    Visit Scheduled Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={visitForm.scheduledDate}
                    onChange={(e) => setVisitForm({ ...visitForm, scheduledDate: e.target.value })}
                    className="input-control"
                  />
                </div>
              </div>

              {/* Broker Section */}
              <div style={{ backgroundColor: '#131d33', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#fbbf24', marginBottom: '8px' }}>
                  Channel Partner / Broker Commission Tracking
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Broker Name (optional)"
                    value={visitForm.brokerName}
                    onChange={(e) => setVisitForm({ ...visitForm, brokerName: e.target.value })}
                    className="input-control"
                  />
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Commission Rate (e.g. 2%)"
                    value={visitForm.brokerCommissionRate}
                    onChange={(e) => setVisitForm({ ...visitForm, brokerCommissionRate: parseFloat(e.target.value) || 2 })}
                    className="input-control"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsVisitModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Schedule Visit & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTER STUDENT APPLICATION ───────────────── */}
      {isEduModalOpen && (
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
              maxWidth: '560px',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>
                Register Student University Application
              </div>
              <button
                onClick={() => setIsEduModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEduApplication}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                    Student Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ananya Sen"
                    value={eduForm.studentName}
                    onChange={(e) => setEduForm({ ...eduForm, studentName: e.target.value })}
                    className="input-control"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                    Student Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98450 11223"
                    value={eduForm.studentPhone}
                    onChange={(e) => setEduForm({ ...eduForm, studentPhone: e.target.value })}
                    className="input-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                    Target Country *
                  </label>
                  <select
                    value={eduForm.targetCountry}
                    onChange={(e) => setEduForm({ ...eduForm, targetCountry: e.target.value })}
                    className="input-control"
                  >
                    {config?.educationSettings?.targetCountries?.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                    Intake Session
                  </label>
                  <select
                    value={eduForm.intakeSession}
                    onChange={(e) => setEduForm({ ...eduForm, intakeSession: e.target.value })}
                    className="input-control"
                  >
                    {config?.educationSettings?.intakeSessions?.map((intake) => (
                      <option key={intake} value={intake}>
                        {intake}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                  Target University *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Technical University of Munich (TUM)"
                  value={eduForm.targetUniversity}
                  onChange={(e) => setEduForm({ ...eduForm, targetUniversity: e.target.value })}
                  className="input-control"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                  Course Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. M.Sc. in Robotics and Cognitive Systems"
                  value={eduForm.courseName}
                  onChange={(e) => setEduForm({ ...eduForm, courseName: e.target.value })}
                  className="input-control"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsEduModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Register Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndustryPacksPage;
