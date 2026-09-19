import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post(`/auth/reset-password/${token}`, { password });
      if (res.success) {
        // Token received, save and redirect
        if (res.data?.accessToken) {
          localStorage.setItem('crm_access_token', res.data.accessToken);
          window.location.href = '/dashboard';
        } else {
          navigate('/login');
        }
      }
    } catch (err) {
      setError(err.customMessage || err.message || 'Password reset failed');
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
            <Lock size={24} />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '8px' }}>
            Set New Password
          </h1>
          <p className="text-muted" style={{ fontSize: '14px' }}>
            Enter your new secure password below to regain access.
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
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="input-control"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="input-control"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              style={{ marginTop: '16px' }}
            >
              {loading ? 'Updating Password...' : 'Save & Enter Workspace'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
