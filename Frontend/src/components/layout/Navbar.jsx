import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Bell,
  Plus,
  User,
  LogOut,
  ChevronDown,
  Building,
  Shield,
  CheckCircle2,
  Menu
} from 'lucide-react';

import NotificationBell from './NotificationBell';
import GlobalSearchModal from '../common/GlobalSearchModal';

const Navbar = ({ onToggleMobileNav }) => {
  const { user, organization, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'U';

  return (
    <header
      style={{
        height: '64px',
        boxSizing: 'border-box',
        backgroundColor: 'var(--bg-surface)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 30
      }}
    >
      {/* Left Section: Mobile Hamburger Toggle & Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="navbar-search-mobile-btn"
          style={{
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            color: 'var(--text-main)',
            width: '38px',
            height: '38px',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>

        {/* Global Search Bar (Desktop) */}
        <div className="navbar-search-desktop" style={{ width: '340px' }}>
          <div
            onClick={() => setIsSearchOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '8px 14px',
              color: 'var(--text-muted)',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <Search size={15} color="var(--primary)" />
            <span style={{ color: 'var(--text-muted)', flex: 1, fontSize: '13px' }}>
              Search leads, deals, contacts...
            </span>
            <kbd
              style={{
                fontSize: '10.5px',
                backgroundColor: 'var(--bg-card-subtle)',
                padding: '2px 5px',
                borderRadius: '4px',
                color: 'var(--text-dim)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Mobile Search Trigger Button */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="navbar-search-mobile-btn"
          style={{
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            color: 'var(--primary)',
            width: '38px',
            height: '38px',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Search"
        >
          <Search size={18} />
        </button>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Real-Time Notification Bell */}
        <NotificationBell />

        {/* User Profile Menu */}
        <div style={{ position: 'relative' }}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-input)',
              cursor: 'pointer',
              color: 'var(--text-main)'
            }}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--grad-primary)',
                color: '#fff',
                fontWeight: '700',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0, 210, 255, 0.28)'
              }}
            >
              {initials}
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: '13.5px', fontWeight: '600' }}>{user?.fullName}</div>
              <div style={{ fontSize: '11px', color: 'var(--primary)' }}>{user?.role?.name}</div>
            </div>
            <ChevronDown size={14} color="var(--text-dim)" />
          </button>

          {/* User Menu Dropdown */}
          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '54px',
                width: '240px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
                padding: '12px',
                zIndex: 50
              }}
            >
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '13.5px', fontWeight: '600' }}>{user?.fullName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user?.email}</div>
                <div style={{ marginTop: '6px' }}>
                  <span className="badge badge-primary">{user?.role?.name}</span>
                </div>
              </div>

              <div style={{ padding: '8px 0' }}>
                <a
                  href="/profile"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    fontSize: '13px',
                    color: 'var(--text-main)',
                    borderRadius: '6px'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-subtle)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <User size={15} color="var(--primary)" />
                  <span>My Profile & Security</span>
                </a>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    fontSize: '13px',
                    color: 'var(--text-muted)'
                  }}
                >
                  <Building size={15} />
                  <span>{organization?.name}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    fontSize: '13px',
                    color: 'var(--text-muted)'
                  }}
                >
                  <Shield size={15} />
                  <span>Scope: {user?.role?.dataScope}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)', paddingTop: '8px' }}>
                <button
                  onClick={logout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#f87171',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
