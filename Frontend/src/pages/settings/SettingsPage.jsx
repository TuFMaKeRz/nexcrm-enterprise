import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Building,
  Globe,
  Palette,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  FileText,
  Sliders,
  ArrowRight
} from 'lucide-react';

const BRAND_PALETTES = [
  { name: 'Indigo Aura', hex: '#6366f1' },
  { name: 'Ocean Cyan', hex: '#06b6d4' },
  { name: 'Emerald Peak', hex: '#10b981' },
  { name: 'Amber Glow', hex: '#f59e0b' },
  { name: 'Crimson Rose', hex: '#f43f5e' },
  { name: 'Royal Purple', hex: '#8b5cf6' }
];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹ INR)' },
  { code: 'USD', symbol: '$', name: 'US Dollar ($ USD)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€ EUR)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£ GBP)' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham (AED)' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (S$ SGD)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (A$ AUD)' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar (C$ CAD)' }
];

const TIMEZONES = [
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney'
];

const INDUSTRY_PRESETS = [
  {
    key: 'real_estate',
    title: 'Real Estate Platform',
    icon: '🏢',
    desc: 'Optimized for properties, site visit tracking, buyer preferences, and RERA compliance.',
    color: '#0ea5e9'
  },
  {
    key: 'agency',
    title: 'Digital Marketing & Creative Agency',
    icon: '🚀',
    desc: 'Geared towards client campaigns, retainer contracts, proposals, and agency deliverables.',
    color: '#a855f7'
  },
  {
    key: 'software',
    title: 'Software & IT Services',
    icon: '💻',
    desc: 'Structured for technical discoveries, statement of work (SOW) quotes, and sprints.',
    color: '#6366f1'
  },
  {
    key: 'education',
    title: 'Education & Study Abroad',
    icon: '🎓',
    desc: 'Configured for student counselling, university applications, and visa documentation.',
    color: '#f59e0b'
  },
  {
    key: 'insurance',
    title: 'Insurance & Financial Consultancy',
    icon: '🛡️',
    desc: 'Built for policy quotations, annual renewals, agent commissions, and claims.',
    color: '#10b981'
  },
  {
    key: 'generic',
    title: 'Generic B2B & SMB',
    icon: '📈',
    desc: 'Versatile CRM pipeline suitable for manufacturers, traders, and B2B services.',
    color: '#6366f1'
  }
];

const SettingsPage = () => {
  const { organization, updateOrganizationState } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'localization', 'branding', 'presets'

  // Profile state
  const [profileData, setProfileData] = useState({
    name: '',
    industry: 'Generic Business',
    logo: '',
    email: '',
    phone: '',
    website: '',
    description: '',
    taxName: 'GSTIN',
    taxNumber: '',
    street: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: ''
  });

  // Localization state
  const [locData, setLocData] = useState({
    currencyCode: 'INR',
    currencySymbol: '₹',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY'
  });

  // Branding state
  const [brandingData, setBrandingData] = useState({
    primaryColor: '#6366f1',
    secondaryColor: '#06b6d4',
    bannerText: '',
    invoiceHeader: 'Thank you for your business!',
    invoiceFooter: 'For inquiries, please contact our accounts department.',
    defaultTerms: '1. Payment is due within 15 days.\n2. Invoices are subject to standard service agreement.'
  });

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Fetch full organization data
  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await api.get('/organization');
        if (res.success && res.data) {
          const org = res.data;
          setProfileData({
            name: org.name || '',
            industry: org.industry || 'Generic Business',
            logo: org.logo || '',
            email: org.email || '',
            phone: org.phone || '',
            website: org.website || '',
            description: org.description || '',
            taxName: org.taxInfo?.taxName || 'GSTIN',
            taxNumber: org.taxInfo?.taxNumber || '',
            street: org.address?.street || '',
            city: org.address?.city || '',
            state: org.address?.state || '',
            country: org.address?.country || 'India',
            postalCode: org.address?.postalCode || ''
          });

          setLocData({
            currencyCode: org.currency?.code || 'INR',
            currencySymbol: org.currency?.symbol || '₹',
            timezone: org.timezone || 'Asia/Kolkata',
            dateFormat: org.dateFormat || 'DD/MM/YYYY'
          });

          setBrandingData({
            primaryColor: org.branding?.primaryColor || '#6366f1',
            secondaryColor: org.branding?.secondaryColor || '#06b6d4',
            bannerText: org.branding?.bannerText || '',
            invoiceHeader: org.branding?.invoiceHeader || 'Thank you for your business!',
            invoiceFooter: org.branding?.invoiceFooter || 'For inquiries, please contact our accounts department.',
            defaultTerms: org.branding?.defaultTerms || '1. Payment is due within 15 days.\n2. Invoices are subject to standard service agreement.'
          });
        }
      } catch (err) {
        console.error('Failed to load organization settings:', err);
      }
    };

    fetchOrg();
  }, []);

  const showMessage = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: profileData.name,
        industry: profileData.industry,
        logo: profileData.logo,
        email: profileData.email,
        phone: profileData.phone,
        website: profileData.website,
        description: profileData.description,
        taxInfo: {
          taxName: profileData.taxName,
          taxNumber: profileData.taxNumber
        },
        address: {
          street: profileData.street,
          city: profileData.city,
          state: profileData.state,
          country: profileData.country,
          postalCode: profileData.postalCode
        }
      };

      const res = await api.put('/organization/profile', payload);
      if (res.success) {
        updateOrganizationState(res.data);
        showMessage('success', 'Company profile saved successfully!');
      }
    } catch (err) {
      showMessage('error', err.customMessage || err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLocalization = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const selectedCurr = CURRENCIES.find((c) => c.code === locData.currencyCode) || {
        code: locData.currencyCode,
        symbol: locData.currencySymbol
      };

      const payload = {
        timezone: locData.timezone,
        dateFormat: locData.dateFormat,
        currency: {
          code: selectedCurr.code,
          symbol: selectedCurr.symbol
        }
      };

      const res = await api.put('/organization/localization', payload);
      if (res.success) {
        updateOrganizationState(res.data);
        showMessage('success', 'Localization & Currency settings updated!');
      }
    } catch (err) {
      showMessage('error', err.customMessage || err.message || 'Failed to update localization');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/organization/branding', brandingData);
      if (res.success) {
        updateOrganizationState(res.data);
        showMessage('success', 'Custom branding applied! Theme colors updated live.');
      }
    } catch (err) {
      showMessage('error', err.customMessage || err.message || 'Failed to update branding');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = async (presetKey) => {
    if (!window.confirm('Apply this industry preset? This will adapt your workspace defaults.')) return;
    setLoading(true);
    try {
      const res = await api.post('/organization/preset', { presetKey });
      if (res.success) {
        updateOrganizationState(res.data);
        setProfileData((prev) => ({
          ...prev,
          industry: res.data.industry,
          taxName: res.data.taxInfo?.taxName || prev.taxName
        }));
        if (res.data.branding?.primaryColor) {
          setBrandingData((prev) => ({ ...prev, primaryColor: res.data.branding.primaryColor }));
        }
        showMessage('success', `Applied preset: ${res.data.industry}!`);
      }
    } catch (err) {
      showMessage('error', err.customMessage || err.message || 'Failed to apply preset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '6px' }}>
          Company & Workspace Settings
        </h1>
        <p className="text-muted" style={{ fontSize: '14px' }}>
          Configure company profile, tax registration, base currency, white-label branding, and industry presets.
        </p>
      </div>

      {/* Global Feedback Alert */}
      {feedback.message && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: feedback.type === 'success' ? '#34d399' : '#f87171',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px'
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
          marginBottom: '28px',
          flexWrap: 'wrap'
        }}
      >
        <button
          className={activeTab === 'profile' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
          onClick={() => setActiveTab('profile')}
          style={{ borderRadius: '8px 8px 0 0', borderBottom: 'none' }}
        >
          <Building size={15} />
          <span>Company Profile</span>
        </button>

        <button
          className={activeTab === 'localization' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
          onClick={() => setActiveTab('localization')}
          style={{ borderRadius: '8px 8px 0 0', borderBottom: 'none' }}
        >
          <Globe size={15} />
          <span>Localization & Currency</span>
        </button>

        <button
          className={activeTab === 'branding' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
          onClick={() => setActiveTab('branding')}
          style={{ borderRadius: '8px 8px 0 0', borderBottom: 'none' }}
        >
          <Palette size={15} />
          <span>White-Label & Branding</span>
        </button>

        <button
          className={activeTab === 'presets' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
          onClick={() => setActiveTab('presets')}
          style={{ borderRadius: '8px 8px 0 0', borderBottom: 'none' }}
        >
          <Sparkles size={15} />
          <span>Industry Presets</span>
        </button>
      </div>

      {/* TAB 1: COMPANY PROFILE */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Organization Profile & Contact</h2>
              <p className="text-muted" style={{ fontSize: '13px' }}>
                Official details shown on quotations, invoices, emails, and staff portals.
              </p>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={16} />
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Legal Company Name *</label>
              <input
                type="text"
                className="input-control"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Industry Classification</label>
              <select
                className="select-control"
                value={profileData.industry}
                onChange={(e) => setProfileData({ ...profileData, industry: e.target.value })}
              >
                <option value="Software & IT">Software & IT</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Digital Marketing Agency">Digital Marketing Agency</option>
                <option value="Education & Immigration">Education & Immigration</option>
                <option value="Insurance Agency">Insurance Agency</option>
                <option value="Financial Services">Financial Services</option>
                <option value="Manufacturing & Retail">Manufacturing & Retail</option>
                <option value="Generic Business">Generic Business</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Company Logo URL / Icon</label>
              <input
                type="text"
                className="input-control"
                placeholder="https://example.com/logo.png"
                value={profileData.logo}
                onChange={(e) => setProfileData({ ...profileData, logo: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Official Website</label>
              <input
                type="text"
                className="input-control"
                placeholder="https://company.com"
                value={profileData.website}
                onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Official Business Email</label>
              <input
                type="email"
                className="input-control"
                placeholder="contact@company.com"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Business Phone Number</label>
              <input
                type="text"
                className="input-control"
                placeholder="+91 98765 43210"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              />
            </div>
          </div>

          <div
            style={{
              fontSize: '13px',
              fontWeight: '700',
              color: 'var(--primary)',
              letterSpacing: '0.05em',
              margin: '18px 0 12px',
              textTransform: 'uppercase'
            }}
          >
            Tax & Business Registration
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Tax ID Label</label>
              <input
                type="text"
                className="input-control"
                placeholder="GSTIN / VAT / EIN"
                value={profileData.taxName}
                onChange={(e) => setProfileData({ ...profileData, taxName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Registration / Tax Number</label>
              <input
                type="text"
                className="input-control"
                placeholder="e.g. 29AAAAA0000A1Z5"
                value={profileData.taxNumber}
                onChange={(e) => setProfileData({ ...profileData, taxNumber: e.target.value })}
              />
            </div>
          </div>

          <div
            style={{
              fontSize: '13px',
              fontWeight: '700',
              color: 'var(--primary)',
              letterSpacing: '0.05em',
              margin: '18px 0 12px',
              textTransform: 'uppercase'
            }}
          >
            Registered Business Address
          </div>

          <div className="form-group">
            <label className="form-label">Street Address</label>
            <input
              type="text"
              className="input-control"
              placeholder="Suite #, Building, Street"
              value={profileData.street}
              onChange={(e) => setProfileData({ ...profileData, street: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">City</label>
              <input
                type="text"
                className="input-control"
                value={profileData.city}
                onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">State / Province</label>
              <input
                type="text"
                className="input-control"
                value={profileData.state}
                onChange={(e) => setProfileData({ ...profileData, state: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Country</label>
              <input
                type="text"
                className="input-control"
                value={profileData.country}
                onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Postal / ZIP Code</label>
              <input
                type="text"
                className="input-control"
                value={profileData.postalCode}
                onChange={(e) => setProfileData({ ...profileData, postalCode: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '8px' }}>
            <label className="form-label">Business Description / Tagline</label>
            <textarea
              className="textarea-control"
              rows="3"
              placeholder="Brief summary of company operations..."
              value={profileData.description}
              onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
            />
          </div>
        </form>
      )}

      {/* TAB 2: LOCALIZATION & CURRENCY */}
      {activeTab === 'localization' && (
        <form onSubmit={handleSaveLocalization} className="card" style={{ maxWidth: '750px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Localization & Currency Engine</h2>
              <p className="text-muted" style={{ fontSize: '13px' }}>
                Determine how financial amounts, timestamps, and dates are formatted.
              </p>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={16} />
              <span>{loading ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Default Base Currency *</label>
            <select
              className="select-control"
              value={locData.currencyCode}
              onChange={(e) => {
                const c = CURRENCIES.find((curr) => curr.code === e.target.value);
                setLocData({
                  ...locData,
                  currencyCode: e.target.value,
                  currencySymbol: c ? c.symbol : '₹'
                });
              }}
            >
              {CURRENCIES.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.name}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Selected Currency Symbol: <strong style={{ color: '#38bdf8' }}>{locData.currencySymbol}</strong>
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Company Timezone *</label>
            <select
              className="select-control"
              value={locData.timezone}
              onChange={(e) => setLocData({ ...locData, timezone: e.target.value })}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Date Display Format *</label>
            <select
              className="select-control"
              value={locData.dateFormat}
              onChange={(e) => setLocData({ ...locData, dateFormat: e.target.value })}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 12/09/2026)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 09/12/2026)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-09-12)</option>
            </select>
          </div>

          <div
            style={{
              padding: '14px 18px',
              backgroundColor: '#131d33',
              borderRadius: '10px',
              marginTop: '16px',
              border: '1px solid rgba(148, 163, 184, 0.12)'
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Formatting Preview
            </div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff', marginTop: '4px' }}>
              Deal Value: <span style={{ color: '#10b981' }}>{locData.currencySymbol}1,25,000</span> • Close Date: 15/10/2026
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: WHITE-LABEL & BRANDING */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveBranding} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Custom Brand Theme & Documents</h2>
              <p className="text-muted" style={{ fontSize: '13px' }}>
                Change primary accent colors dynamically across the portal and configure document headers.
              </p>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={16} />
              <span>{loading ? 'Applying...' : 'Apply Branding'}</span>
            </button>
          </div>

          {/* Palette Swatches */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Select Brand Accent Color</label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '6px' }}>
              {BRAND_PALETTES.map((pal) => (
                <button
                  key={pal.hex}
                  type="button"
                  onClick={() => setBrandingData({ ...brandingData, primaryColor: pal.hex })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: brandingData.primaryColor === pal.hex ? '2px solid #fff' : '1px solid rgba(148, 163, 184, 0.2)',
                    backgroundColor: '#131d33',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: brandingData.primaryColor === pal.hex ? '700' : '500'
                  }}
                >
                  <span
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: pal.hex,
                      boxShadow: `0 0 8px ${pal.hex}`
                    }}
                  />
                  <span>{pal.name}</span>
                </button>
              ))}

              {/* Custom Color Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="color"
                  value={brandingData.primaryColor}
                  onChange={(e) => setBrandingData({ ...brandingData, primaryColor: e.target.value })}
                  style={{ width: '38px', height: '38px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {brandingData.primaryColor}
                </span>
              </div>
            </div>
          </div>

          {/* Live Preview Bar */}
          <div
            style={{
              padding: '18px 24px',
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${brandingData.primaryColor}22 0%, rgba(15, 23, 42, 0.9) 100%)`,
              border: `1px solid ${brandingData.primaryColor}55`,
              marginBottom: '28px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: brandingData.primaryColor, fontWeight: '700', textTransform: 'uppercase' }}>
                Live Theme Preview
              </div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>
                Active Brand Theme Accent
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-sm"
                style={{ backgroundColor: brandingData.primaryColor, color: '#fff' }}
              >
                Primary Button
              </button>
              <span
                className="badge"
                style={{
                  backgroundColor: `${brandingData.primaryColor}22`,
                  color: brandingData.primaryColor,
                  border: `1px solid ${brandingData.primaryColor}66`
                }}
              >
                Lead Badge
              </span>
            </div>
          </div>

          {/* Quotations & Invoice Customization */}
          <div
            style={{
              fontSize: '13px',
              fontWeight: '700',
              color: 'var(--primary)',
              letterSpacing: '0.05em',
              margin: '18px 0 12px',
              textTransform: 'uppercase'
            }}
          >
            Quotation & Invoicing Template Text
          </div>

          <div className="form-group">
            <label className="form-label">Top Banner Message / Header Greeting</label>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. Specializing in high-performance digital services"
              value={brandingData.invoiceHeader}
              onChange={(e) => setBrandingData({ ...brandingData, invoiceHeader: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Invoice Footer Note / Contact</label>
            <input
              type="text"
              className="input-control"
              placeholder="For payment inquiries, reach billing@company.com"
              value={brandingData.invoiceFooter}
              onChange={(e) => setBrandingData({ ...brandingData, invoiceFooter: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Standard Terms & Conditions</label>
            <textarea
              className="textarea-control"
              rows="3"
              value={brandingData.defaultTerms}
              onChange={(e) => setBrandingData({ ...brandingData, defaultTerms: e.target.value })}
            />
          </div>
        </form>
      )}

      {/* TAB 4: INDUSTRY PRESETS */}
      {activeTab === 'presets' && (
        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>
              Instant Industry Quick-Start Presets
            </h2>
            <p className="text-muted" style={{ fontSize: '13.5px' }}>
              Tailor your CRM workflow in 1 click. Applying an industry configuration presets appropriate tax names, branding accents, and sales pipelines.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '18px'
            }}
          >
            {INDUSTRY_PRESETS.map((preset) => (
              <div
                key={preset.key}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '24px',
                  border: profileData.industry === preset.title ? `2px solid ${preset.color}` : '1px solid var(--border-subtle)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ fontSize: '32px' }}>{preset.icon}</div>
                    {profileData.industry === preset.title && (
                      <span className="badge badge-success" style={{ fontSize: '11px' }}>
                        Active Preset
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '8px' }}>
                    {preset.title}
                  </h3>

                  <p className="text-muted" style={{ fontSize: '13px', lineHeight: 1.5, marginBottom: '20px' }}>
                    {preset.desc}
                  </p>
                </div>

                <button
                  type="button"
                  className={profileData.industry === preset.title ? 'btn btn-outline btn-sm' : 'btn btn-primary btn-sm'}
                  onClick={() => handleApplyPreset(preset.key)}
                  disabled={loading || profileData.industry === preset.title}
                >
                  <span>{profileData.industry === preset.title ? 'Currently Active' : 'Apply Configuration'}</span>
                  {profileData.industry !== preset.title && <ArrowRight size={14} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
