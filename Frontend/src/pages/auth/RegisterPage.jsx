import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Briefcase, Building, Mail, Lock, User, Phone, ArrowRight, ShieldCheck } from 'lucide-react';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    companyName: '',
    industry: 'Software & IT',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.customMessage || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-dark)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px'
      }}
    >
      <div style={{ width: '100%', maxWidth: '620px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'var(--grad-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              marginBottom: '16px',
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            <Briefcase size={24} />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>
            Create Your Business Workspace
          </h1>
          <p className="text-muted">
            Set up your organization, customize your sales pipeline, and invite your team.
          </p>
        </div>

        <div className="card">
          {error && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '13.5px',
                marginBottom: '20px'
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Company Info */}
            <div
              style={{
                fontSize: '13px',
                fontWeight: '700',
                color: 'var(--primary)',
                letterSpacing: '0.05em',
                marginBottom: '14px',
                textTransform: 'uppercase'
              }}
            >
              1. Organization Details
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input
                  type="text"
                  name="companyName"
                  className="input-control"
                  placeholder="e.g. Apex Global Realty"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Industry Sector *</label>
                <select
                  name="industry"
                  className="select-control"
                  value={formData.industry}
                  onChange={handleChange}
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

            {/* Administrator Account */}
            <div
              style={{
                fontSize: '13px',
                fontWeight: '700',
                color: 'var(--primary)',
                letterSpacing: '0.05em',
                margin: '20px 0 14px',
                textTransform: 'uppercase'
              }}
            >
              2. Workspace Owner Account
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  className="input-control"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  className="input-control"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Work Email Address *</label>
              <input
                type="email"
                name="email"
                className="input-control"
                placeholder="john@company.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Secure Password *</label>
                <input
                  type="password"
                  name="password"
                  className="input-control"
                  placeholder="Min. 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number (Optional)</label>
                <input
                  type="text"
                  name="phone"
                  className="input-control"
                  placeholder="+91 98765 00000"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '18px 0 24px',
                fontSize: '12.5px',
                color: 'var(--text-muted)'
              }}
            >
              <ShieldCheck size={16} color="#10b981" />
              <span>Includes 30 days free trial of the Business Plan with up to 10 users.</span>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? 'Creating Workspace...' : 'Launch Your CRM Workspace'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div
            style={{
              marginTop: '24px',
              textAlign: 'center',
              fontSize: '14px',
              color: 'var(--text-muted)'
            }}
          >
            Already have an organization?{' '}
            <Link to="/login" style={{ fontWeight: '600', color: '#818cf8' }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
