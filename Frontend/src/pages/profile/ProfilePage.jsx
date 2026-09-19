import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import {
  User,
  Lock,
  Shield,
  Building,
  CheckCircle2,
  KeyRound,
  Save,
  AlertCircle
} from 'lucide-react';

const ProfilePage = () => {
  const { user, organization } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'security', 'permissions'

  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setProfileLoading(true);

    try {
      const res = await api.put('/auth/update-profile', profileData);
      if (res.success) {
        setProfileSuccess('Profile updated successfully!');
      }
    } catch (err) {
      setProfileError(err.customMessage || err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (res.success) {
        setPasswordSuccess('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setPasswordError(err.customMessage || err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1000px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '6px' }}>
          My Account & Security
        </h1>
        <p className="text-muted" style={{ fontSize: '14px' }}>
          Manage your personal information, update security settings, and inspect your granted permissions.
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
          marginBottom: '28px'
        }}
      >
        <button
          className={activeTab === 'profile' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
          onClick={() => setActiveTab('profile')}
          style={{ borderRadius: '8px 8px 0 0', borderBottom: 'none' }}
        >
          <User size={15} />
          <span>Profile Information</span>
        </button>

        <button
          className={activeTab === 'security' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
          onClick={() => setActiveTab('security')}
          style={{ borderRadius: '8px 8px 0 0', borderBottom: 'none' }}
        >
          <Lock size={15} />
          <span>Security & Password</span>
        </button>

        <button
          className={activeTab === 'permissions' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
          onClick={() => setActiveTab('permissions')}
          style={{ borderRadius: '8px 8px 0 0', borderBottom: 'none' }}
        >
          <Shield size={15} />
          <span>Role & Permissions</span>
        </button>
      </div>

      {/* Tab 1: Profile Information */}
      {activeTab === 'profile' && (
        <div className="card">
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Personal Information</h2>

          {profileSuccess && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                color: '#34d399',
                fontSize: '13.5px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
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
              {profileError}
            </div>
          )}

          <form onSubmit={handleProfileSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="input-control"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="input-control"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Work Email Address (Fixed to Workspace)</label>
              <input
                type="email"
                className="input-control"
                value={user?.email || ''}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="+91 98765 00000"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department</label>
                <input
                  type="text"
                  className="input-control"
                  value={user?.department || 'Sales'}
                  disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={profileLoading}
              >
                <Save size={16} />
                <span>{profileLoading ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Security & Password */}
      {activeTab === 'security' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Change Password</h2>

          {passwordSuccess && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                color: '#34d399',
                fontSize: '13.5px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
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
              {passwordError}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="input-control"
                placeholder="Enter existing password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="input-control"
                placeholder="Min. 6 characters"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="input-control"
                placeholder="Re-enter new password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div style={{ marginTop: '20px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={passwordLoading}
              >
                <KeyRound size={16} />
                <span>{passwordLoading ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Role & Permissions */}
      {activeTab === 'permissions' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', marginBottom: '4px' }}>Active Privileges & Scope</h2>
              <p className="text-muted" style={{ fontSize: '13px' }}>
                Your data visibility is governed by your assigned role and company workspace policy.
              </p>
            </div>
            <span className="badge badge-primary" style={{ fontSize: '13px', padding: '6px 14px' }}>
              {user?.role?.name}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              padding: '16px',
              backgroundColor: '#131d33',
              borderRadius: '12px',
              marginBottom: '24px'
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Data Access Scope
              </div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#38bdf8', marginTop: '2px' }}>
                {user?.role?.dataScope?.toUpperCase()} RECORDS
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Organization
              </div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff', marginTop: '2px' }}>
                {organization?.name}
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Granted Permissions ({user?.role?.permissions?.length || 0})
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '8px'
            }}
          >
            {(user?.role?.permissions || []).map((perm, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                  fontSize: '12.5px',
                  color: '#e2e8f0'
                }}
              >
                <CheckCircle2 size={14} color="#10b981" />
                <span>{perm}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
