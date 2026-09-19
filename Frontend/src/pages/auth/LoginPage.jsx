import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  TrendingUp,
  Users,
  Lock,
  Mail,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('owner@acme.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.customMessage || err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-dark)'
      }}
    >
      {/* Left Branding Showcase (Hidden on Mobile) */}
      <div
        style={{
          flex: '1 1 50%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          background: 'linear-gradient(135deg, #0b1120 0%, #0f172a 50%, #1e1b4b 100%)',
          borderRight: '1px solid rgba(148, 163, 184, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Glow Spheres */}
        <div
          style={{
            position: 'absolute',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)',
            top: '-50px',
            left: '-50px',
            filter: 'blur(40px)',
            pointerEvents: 'none'
          }}
        />

        {/* Top Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1 }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'var(--grad-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            <Briefcase size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.02em' }}>
              NexCRM
            </h1>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Multi-Tenant Business & Sales Engine
            </span>
          </div>
        </div>

        {/* Center Pitch */}
        <div style={{ maxWidth: '520px', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '999px',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#a5b4fc',
              fontSize: '12.5px',
              fontWeight: '600',
              marginBottom: '20px'
            }}
          >
            <Sparkles size={14} />
            <span>Complete Customer Lifecycle Management</span>
          </div>

          <h2
            style={{
              fontSize: '36px',
              fontWeight: '800',
              lineHeight: 1.2,
              marginBottom: '20px',
              color: '#fff'
            }}
          >
            From Lead to Deal, <br />
            <span className="gradient-text">Quotation to Cash.</span>
          </h2>

          <p
            style={{
              fontSize: '16px',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              marginBottom: '32px'
            }}
          >
            Manage qualified leads, visual deal pipelines, custom role permissions, quotations, and financial timelines in an enterprise-grade isolated workspace.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              'Tenant-isolated database architecture with automated RBAC',
              'Visual Drag-and-Drop Deal Pipelines with Win Probability',
              'Lead Scoring, Round-Robin Auto-Assignment & Follow-ups',
              'Quotation Generator with PDF Export & Invoice Conversion'
            ].map((text, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={18} color="#10b981" />
                <span style={{ fontSize: '14px', color: '#e2e8f0' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', zIndex: 1 }}>
          Built with MERN Stack (MongoDB, Express, React, Node.js) • Enterprise Multi-Tenant Ready
        </div>
      </div>

      {/* Right Login Panel */}
      <div
        style={{
          flex: '1 1 50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px'
        }}
      >
        <div style={{ width: '100%', maxWidth: '440px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '700', marginBottom: '8px' }}>
              Welcome back
            </h2>
            <p className="text-muted">
              Enter your credentials to access your company workspace.
            </p>
          </div>

          {/* Quick Demo Credentials Bar */}
          <div
            style={{
              padding: '14px',
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              borderRadius: '12px',
              marginBottom: '24px'
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--text-muted)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              🚀 Instant Demo Quick-Fill
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleQuickDemo('owner@acme.com')}
                style={{ fontSize: '12px' }}
              >
                👑 Owner
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleQuickDemo('manager@acme.com')}
                style={{ fontSize: '12px' }}
              >
                👔 Sales Mgr
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleQuickDemo('sales@acme.com')}
                style={{ fontSize: '12px' }}
              >
                💼 Sales Rep
              </button>
            </div>
          </div>

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
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="input-control"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <label className="form-label">Password</label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '12.5px', color: '#818cf8' }}
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                className="input-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              style={{ marginTop: '10px' }}
            >
              {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div
            style={{
              marginTop: '28px',
              textAlign: 'center',
              fontSize: '14px',
              color: 'var(--text-muted)'
            }}
          >
            Don't have a workspace for your company?{' '}
            <Link to="/register" style={{ fontWeight: '600', color: '#818cf8' }}>
              Create Organization
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
