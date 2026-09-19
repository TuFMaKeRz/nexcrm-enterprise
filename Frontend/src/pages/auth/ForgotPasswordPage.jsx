import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Briefcase, Mail, ArrowRight, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('owner@acme.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.success) {
        setResult(res.data);
      }
    } catch (err) {
      setError(err.customMessage || err.message || 'Failed to request password reset');
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
      <div style={{ width: '100%', maxWidth: '440px' }}>
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
            <KeyRound size={24} />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '8px' }}>
            Reset Your Password
          </h1>
          <p className="text-muted" style={{ fontSize: '14px' }}>
            Enter your verified work email address to receive secure reset instructions.
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

          {result ? (
            <div>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '12px',
                  color: '#34d399',
                  fontSize: '14px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: '700', marginBottom: '4px' }}>
                    Reset Link Generated!
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    In production, this is emailed. For testing, click the direct reset button below:
                  </div>
                </div>
              </div>

              {result.resetToken && (
                <Link
                  to={`/reset-password/${result.resetToken}`}
                  className="btn btn-primary btn-full btn-lg"
                  style={{ marginBottom: '16px' }}
                >
                  <span>Continue to Reset Password</span>
                  <ArrowRight size={16} />
                </Link>
              )}

              <Link
                to="/login"
                className="btn btn-secondary btn-full"
                style={{ fontSize: '13.5px' }}
              >
                <ArrowLeft size={15} />
                <span>Return to Login</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="input-control"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                disabled={loading}
                style={{ marginTop: '12px', marginBottom: '16px' }}
              >
                {loading ? 'Sending Request...' : 'Send Reset Link'}
                {!loading && <ArrowRight size={16} />}
              </button>

              <Link
                to="/login"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '13.5px',
                  color: 'var(--text-muted)'
                }}
              >
                <ArrowLeft size={14} />
                <span>Back to Login</span>
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
