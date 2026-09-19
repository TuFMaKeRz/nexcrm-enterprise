import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

const ProtectedRoute = ({ children, requiredPermission, requiredRole }) => {
  const { user, loading, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-dark)',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid rgba(99, 102, 241, 0.2)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>
          Loading NexCRM Workspace...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
        <div className="card" style={{ maxWidth: '480px', margin: '0 auto', padding: '40px 24px' }}>
          <ShieldAlert size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
          <h2 style={{ marginBottom: '8px' }}>Access Denied</h2>
          <p className="text-muted" style={{ marginBottom: '24px' }}>
            Your current role does not have permission to view this section.
          </p>
          <button className="btn btn-secondary" onClick={() => window.history.back()}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
        <div className="card" style={{ maxWidth: '480px', margin: '0 auto', padding: '40px 24px' }}>
          <ShieldAlert size={48} color="var(--warning)" style={{ marginBottom: '16px' }} />
          <h2 style={{ marginBottom: '8px' }}>Restricted Privilege</h2>
          <p className="text-muted" style={{ marginBottom: '24px' }}>
            You need the <code>{requiredPermission}</code> permission to access this feature.
          </p>
          <button className="btn btn-secondary" onClick={() => window.history.back()}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
