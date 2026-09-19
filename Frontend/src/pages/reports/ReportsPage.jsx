import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  TrendingUp,
  Download,
  Printer,
  FileSpreadsheet,
  Users,
  Target,
  DollarSign,
  Award,
  CheckCircle2,
  Clock,
  PieChart,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  Shield,
  CreditCard,
  Building2,
  Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ReportsPage = () => {
  const { organization } = useAuth();
  const currencySymbol = organization?.localization?.currencySymbol || '₹';

  // Active Report Tab: 'leads' | 'sales_reps' | 'financials'
  const [activeTab, setActiveTab] = useState('leads');

  // Report datasets
  const [leadReport, setLeadReport] = useState(null);
  const [repReport, setRepReport] = useState(null);
  const [financialReport, setFinancialReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [leadRes, repRes, finRes] = await Promise.all([
        axios.get('/api/v1/analytics/lead-reports', { headers }),
        axios.get('/api/v1/analytics/sales-rep-performance', { headers }),
        axios.get('/api/v1/analytics/financial-reports', { headers })
      ]);

      if (leadRes.data?.success) setLeadReport(leadRes.data.data);
      if (repRes.data?.success) setRepReport(leadRes.data.data ? repRes.data.data : null);
      if (finRes.data?.success) setFinancialReport(finRes.data.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // One-Click CSV Export Download
  const handleExportCsv = async (type) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/v1/analytics/export?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export CSV report.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header & Export Toolbar */}
      <div
        className="no-print"
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
              Analytics & Executive Reports
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
              Module 11
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '4px' }}>
            Lead conversion funnels, sales representative leaderboard, and comprehensive financial billing breakdowns.
          </p>
        </div>

        {/* Export Toolbar */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => handleExportCsv(activeTab === 'financials' ? 'financials' : 'leads')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#38bdf8',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Download size={14} />
            Export CSV
          </button>

          <button
            onClick={() => handleExportCsv('deals')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#34d399',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <FileSpreadsheet size={14} />
            Export Deals XLS
          </button>

          <button
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: '#6366f1',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
            }}
          >
            <Printer size={14} />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
          marginBottom: '24px'
        }}
      >
        {[
          { id: 'leads', label: 'Lead Conversion & Sources', icon: Target },
          { id: 'sales_reps', label: 'Sales Rep Leaderboard', icon: Award },
          { id: 'financials', label: 'Financial & Billing Breakdown', icon: DollarSign }
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
          Generating analytical reports...
        </div>
      ) : (
        <>
          {/* TAB 1: LEAD CONVERSION & SOURCE ANALYSIS */}
          {activeTab === 'leads' && (
            <div>
              {/* Score Distribution Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                  marginBottom: '24px'
                }}
              >
                {[
                  { label: 'Very Hot Leads (81-100)', count: leadReport?.scoreDistribution?.VeryHot || 0, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
                  { label: 'Hot Leads (61-80)', count: leadReport?.scoreDistribution?.Hot || 0, color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
                  { label: 'Warm Leads (31-60)', count: leadReport?.scoreDistribution?.Warm || 0, color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' },
                  { label: 'Cold Leads (0-30)', count: leadReport?.scoreDistribution?.Cold || 0, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' }
                ].map((tier, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--card-bg, #111827)',
                      border: '1px solid rgba(148, 163, 184, 0.12)',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '500' }}>{tier.label}</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: tier.color, marginTop: '2px' }}>
                        {tier.count}
                      </div>
                    </div>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        background: tier.bg,
                        color: tier.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '14px'
                      }}
                    >
                      {tier.count}
                    </div>
                  </div>
                ))}
              </div>

              {/* Source Breakdown Table */}
              <div
                style={{
                  background: 'var(--card-bg, #111827)',
                  border: '1px solid rgba(148, 163, 184, 0.12)',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}
              >
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #1f2937', fontWeight: '700', fontSize: '15px', color: '#f8fafc' }}>
                  Lead Source Inflow & Conversion Rates
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                        <th style={{ padding: '12px 16px' }}>Lead Source</th>
                        <th style={{ padding: '12px 16px' }}>Total Inflow</th>
                        <th style={{ padding: '12px 16px' }}>Converted Leads</th>
                        <th style={{ padding: '12px 16px' }}>Conversion Rate</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Est. Pipeline Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(leadReport?.sourcesReport || []).map((src, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.4)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '600', color: '#f8fafc' }}>
                            {src.source}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                            {src.totalLeads}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#34d399', fontWeight: '600' }}>
                            {src.convertedCount}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: '700', color: src.conversionRate >= 30 ? '#10b981' : '#fbbf24' }}>
                                {src.conversionRate}%
                              </span>
                              <div style={{ height: '5px', background: '#334155', borderRadius: '3px', width: '70px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${src.conversionRate}%`, background: '#6366f1' }} />
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: '#38bdf8' }}>
                            {currencySymbol} {Number(src.totalValue || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SALES REP PERFORMANCE */}
          {activeTab === 'sales_reps' && (
            <div
              style={{
                background: 'var(--card-bg, #111827)',
                border: '1px solid rgba(148, 163, 184, 0.12)',
                borderRadius: '12px',
                overflow: 'hidden'
              }}
            >
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #1f2937', fontWeight: '700', fontSize: '15px', color: '#f8fafc' }}>
                Sales Representative Leaderboard & Win Rates
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                      <th style={{ padding: '12px 16px', width: '60px' }}>Rank</th>
                      <th style={{ padding: '12px 16px' }}>Sales Executive</th>
                      <th style={{ padding: '12px 16px' }}>Leads Assigned</th>
                      <th style={{ padding: '12px 16px' }}>Deals Won</th>
                      <th style={{ padding: '12px 16px' }}>Win Rate %</th>
                      <th style={{ padding: '12px 16px' }}>Activities Done</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(repReport?.leaderboard || []).map((rep, idx) => (
                      <tr key={rep.userId} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.4)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              fontWeight: '700',
                              fontSize: '11px',
                              background: idx === 0 ? '#eab308' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#1e293b',
                              color: idx <= 2 ? '#0f172a' : '#cbd5e1'
                            }}
                          >
                            #{idx + 1}
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '600', color: '#f8fafc' }}>{rep.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{rep.email}</div>
                        </td>

                        <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                          {rep.leadsAssigned}
                        </td>

                        <td style={{ padding: '12px 16px', color: '#34d399', fontWeight: '600' }}>
                          {rep.dealsWon}
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontWeight: '700', color: rep.winRate >= 50 ? '#10b981' : '#fbbf24' }}>
                            {rep.winRate}%
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                          {rep.activitiesLogged} logged
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800', color: '#10b981', fontSize: '14px' }}>
                          {currencySymbol} {Number(rep.revenueGenerated || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: FINANCIAL & BILLING REPORTS */}
          {activeTab === 'financials' && (
            <div>
              {/* Financial KPI Summary Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '16px',
                  marginBottom: '24px'
                }}
              >
                <div style={{ background: '#111827', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '12px', padding: '18px 20px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Total Invoiced</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', marginTop: '2px' }}>
                    {currencySymbol} {(financialReport?.totals?.totalInvoiced || 0).toLocaleString()}
                  </div>
                </div>

                <div style={{ background: '#111827', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '12px', padding: '18px 20px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Total Collected</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#34d399', marginTop: '2px' }}>
                    {currencySymbol} {(financialReport?.totals?.totalCollected || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>
                    {financialReport?.totals?.collectionRate || 0}% Collection Rate
                  </div>
                </div>

                <div style={{ background: '#111827', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '12px', padding: '18px 20px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Outstanding Receivables</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#fbbf24', marginTop: '2px' }}>
                    {currencySymbol} {(financialReport?.totals?.totalOutstanding || 0).toLocaleString()}
                  </div>
                </div>

                <div style={{ background: '#111827', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '12px', padding: '18px 20px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Overdue Receivables</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#f87171', marginTop: '2px' }}>
                    {currencySymbol} {(financialReport?.totals?.overdueReceivables || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div
                style={{
                  background: 'var(--card-bg, #111827)',
                  border: '1px solid rgba(148, 163, 184, 0.12)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px'
                }}
              >
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc', marginBottom: '16px' }}>
                  Payment Method Collection Distribution
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                  {Object.entries(financialReport?.paymentMethodsBreakdown || {}).map(([method, amount]) => (
                    <div
                      key={method}
                      style={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '12px 14px'
                      }}
                    >
                      <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>{method}</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#38bdf8', marginTop: '4px' }}>
                        {currencySymbol} {Number(amount).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; color: #000 !important; }
          table { color: #000 !important; }
        }
      `}</style>
    </div>
  );
};

export default ReportsPage;
