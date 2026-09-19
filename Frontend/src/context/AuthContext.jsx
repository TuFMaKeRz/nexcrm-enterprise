import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyBrandColor = (color) => {
    if (!color) return;
    try {
      document.documentElement.style.setProperty('--primary', color);
      document.documentElement.style.setProperty('--border-focus', color);
      document.documentElement.style.setProperty('--grad-primary', `linear-gradient(135deg, ${color} 0%, #a855f7 100%)`);
    } catch (e) {
      // Ignore in non-DOM
    }
  };

  const updateOrganizationState = (updatedOrg) => {
    setOrganization(updatedOrg);
    if (updatedOrg?.branding?.primaryColor) {
      applyBrandColor(updatedOrg.branding.primaryColor);
    }
  };

  // Initialize and verify authentication on app load
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('crm_access_token') || localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        if (response.success) {
          setUser(response.data.user);
          setOrganization(response.data.organization);
          if (response.data.organization?.branding?.primaryColor) {
            applyBrandColor(response.data.organization.branding.primaryColor);
          }
        }
      } catch (err) {
        console.warn('Session verification failed, clearing auth cache.');
        localStorage.removeItem('crm_access_token');
        localStorage.removeItem('token');
        setUser(null);
        setOrganization(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.success) {
      const { user, organization, accessToken } = response.data;
      localStorage.setItem('crm_access_token', accessToken);
      localStorage.setItem('token', accessToken);
      setUser(user);
      setOrganization(organization);
      if (organization?.branding?.primaryColor) {
        applyBrandColor(organization.branding.primaryColor);
      }
      return response.data;
    }
    throw new Error(response.message || 'Login failed');
  };

  const register = async (formData) => {
    const response = await api.post('/auth/register', formData);
    if (response.success) {
      const { user, organization, accessToken } = response.data;
      localStorage.setItem('crm_access_token', accessToken);
      localStorage.setItem('token', accessToken);
      setUser(user);
      setOrganization(organization);
      return response.data;
    }
    throw new Error(response.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem('crm_access_token');
      localStorage.removeItem('token');
      setUser(null);
      setOrganization(null);
    }
  };

  const hasPermission = (permission) => {
    if (!user || !user.role) return false;
    const roleName = user.role.name;
    if (roleName === 'Super Admin' || roleName === 'Organization Owner') {
      return true;
    }
    const permissions = user.role.permissions || [];
    return permissions.includes(permission);
  };

  const hasRole = (...roles) => {
    if (!user || !user.role) return false;
    if (user.role.name === 'Super Admin') return true;
    return roles.includes(user.role.name);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        loading,
        login,
        register,
        logout,
        hasPermission,
        hasRole,
        updateOrganizationState
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
