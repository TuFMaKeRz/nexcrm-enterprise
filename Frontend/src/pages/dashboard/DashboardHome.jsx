import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Users,
  Target,
  Kanban,
  DollarSign,
  TrendingUp,
  Shield,
  Building,
  CheckCircle,
  ArrowUpRight,
  Clock,
  Sparkles,
  Calendar,
  AlertTriangle,
  Award,
  Layers,
  Phone,
  Receipt,
  FileText,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const DashboardHome = () => {
  const { user, organization } = useAuth();
  const navigate = useNavigate();
  const currencySymbol = organization?.localization?.currencySymbol || '₹';

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/v1/analytics/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const kpis = dashboardData?.kpis || {};
  const funnelStages = dashboardData?.funnelStages || [];
  const monthlyRevenue = dashboardData?.monthlyRevenue || [];
  const actionCenter = dashboardData?.todayActionCenter || {};

  return (
    <div className="page-container">
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(148, 163, 184, 0.15)',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ maxWidth: '640px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '999px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '12px',
              fontWeight: '600',
              marginBottom: '10px'
            }}
          >
            <CheckCircle size={13} />
            <span>Workspace Active • Multi-Tenant Isolated</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#f8fafc', marginBottom: '6px' }}>
            Welcome back, {user?.firstName}! 👋
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '13.5px', lineHeight: 1.5 }}>
            Executive sales overview for <strong style={{ color: '#fff' }}>{organization?.name}</strong>. Here is your team's real-time performance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link
            to="/reports"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '8px',
              color: '#a5b4fc',
              fontSize: '13px',
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            <TrendingUp size={15} />
            View Full Reports
          </Link>
          <Link
            to="/deals"
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
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
            }}
          >
            <Kanban size={15} />
            Sales Pipeline
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid-responsive-4" style={{ marginBottom: '24px' }}>
        {/* Total Leads */}
        <div style={{ background: '#111827', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '12px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '500' }}>Total Inflow Leads</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', marginTop: '2px' }}>
              {kpis.totalLeads ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: '#34d399', marginTop: '2px' }}>
              {kpis.leadConversionRate ?? 0}% Conversion Rate
            </div>
          </div>
        </div>

        {/* Active Pipeline Value */}
        <div style={{ background: '#111827', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '12px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Kanban size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '500' }}>Active Pipeline Value</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#38bdf8', marginTop: '2px' }}>
              {currencySymbol} {(kpis.activePipelineValue || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              {kpis.openDealsCount ?? 0} Open Opportunities
            </div>
          </div>
        </div>

        {/* Won Revenue Month */}
        <div style={{ background: '#111827', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '12px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '500' }}>Won Deals Value</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#34d399', marginTop: '2px' }}>
              {currencySymbol} {(kpis.wonDealsValue || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#34d399', marginTop: '2px' }}>
              {kpis.wonDealsCount ?? 0} Closed Won Deals
            </div>
          </div>
        </div>

        {/* Total Collected Revenue */}
        <div style={{ background: '#111827', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '12px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '500' }}>Collected Revenue</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#fbbf24', marginTop: '2px' }}>
              {currencySymbol} {(kpis.totalCollected || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              Total Invoiced: {currencySymbol} {(kpis.totalInvoiced || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Visual Sales Funnel & Monthly Revenue Trend */}
      <div className="grid-responsive-2" style={{ marginBottom: '24px' }}>
        {/* Visual Sales Funnel */}
        <div
          style={{
            background: 'var(--card-bg, #111827)',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            padding: '22px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#818cf8" />
              Visual Sales Funnel
            </h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Pipeline Velocity</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {funnelStages.map((stg, idx) => (
              <div key={stg.id || idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600', color: '#f8fafc' }}>
                    {idx + 1}. {stg.name}
                  </span>
                  <span style={{ color: '#94a3b8' }}>
                    <strong style={{ color: '#38bdf8' }}>{stg.count} deals</strong> • {currencySymbol} {Number(stg.value).toLocaleString()}
                  </span>
                </div>
                <div style={{ height: '8px', background: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(8, (stg.count / (kpis.openDealsCount + kpis.wonDealsCount || 1)) * 100))}%`,
                      background: stg.color || '#6366f1',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6-Month Monthly Revenue History */}
        <div
          style={{
            background: 'var(--card-bg, #111827)',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            padding: '22px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="#34d399" />
              Revenue Trends (Last 6 Months)
            </h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Invoiced vs Collected</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {monthlyRevenue.map((m, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600', color: '#cbd5e1' }}>{m.month} {m.year}</span>
                  <span style={{ color: '#94a3b8' }}>
                    Invoiced: {currencySymbol} {m.invoiced.toLocaleString()} | <strong style={{ color: '#34d399' }}>Collected: {currencySymbol} {m.collected.toLocaleString()}</strong>
                  </span>
                </div>
                <div style={{ height: '6px', background: '#0f172a', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (m.collected / (kpis.totalCollected || 1)) * 100)}%`, background: '#10b981' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Action Center */}
      <div
        style={{
          background: 'var(--card-bg, #111827)',
          border: '1px solid rgba(148, 163, 184, 0.12)',
          borderRadius: '12px',
          padding: '22px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#fbbf24" />
            Today's Action Center & Priorities
          </h3>
          <Link to="/tasks" style={{ fontSize: '12.5px', color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Open Calendar Hub <ChevronRight size={14} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {/* Overdue / Due Tasks */}
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} color="#38bdf8" />
              <span>Pending Tasks & Follow-Ups</span>
            </div>
            {(actionCenter.tasks || []).length === 0 ? (
              <div style={{ fontSize: '12px', color: '#64748b' }}>No tasks scheduled for today.</div>
            ) : (
              actionCenter.tasks.map((t) => (
                <div key={t._id} style={{ fontSize: '12px', color: '#cbd5e1', padding: '6px 0', borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
                  📌 {t.title}
                </div>
              ))
            )}
          </div>

          {/* Recent Won Deals */}
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={15} color="#34d399" />
              <span>Recent High-Value Deal Wins</span>
            </div>
            {(actionCenter.recentWonDeals || []).length === 0 ? (
              <div style={{ fontSize: '12px', color: '#64748b' }}>No recent won deals.</div>
            ) : (
              actionCenter.recentWonDeals.map((d) => (
                <div key={d._id} style={{ fontSize: '12px', color: '#34d399', padding: '6px 0', borderBottom: '1px solid rgba(51, 65, 85, 0.5)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>🎉 {d.title}</span>
                  <strong>{currencySymbol} {Number(d.dealValue).toLocaleString()}</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
