import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Kanban,
  FileText,
  Receipt,
  Calendar,
  TrendingUp,
  Settings,
  ShieldCheck,
  Briefcase,
  Layers,
  ChevronRight,
  Mail,
  Package,
  Zap,
  ShieldAlert,
  Globe
} from 'lucide-react';

const Sidebar = ({ isMobileOpen, onCloseMobile }) => {
  const { user, organization, hasPermission } = useAuth();

  const navSections = [
    {
      title: 'CORE',
      items: [
        {
          name: 'Dashboard',
          to: '/dashboard',
          icon: LayoutDashboard,
          show: true
        }
      ]
    },
    {
      title: 'SALES PIPELINE',
      items: [
        {
          name: 'Leads',
          to: '/leads',
          icon: Users,
          show: hasPermission('leads:view'),
          badge: 'Core'
        },
        {
          name: 'Customers',
          to: '/customers',
          icon: UserCheck,
          show: hasPermission('customers:view')
        },
        {
          name: 'Deals & Kanban',
          to: '/deals',
          icon: Kanban,
          show: hasPermission('deals:view')
        }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        {
          name: 'Products & Catalog',
          to: '/products',
          icon: Package,
          show: hasPermission('products:view')
        },
        {
          name: 'Activities & Tasks',
          to: '/tasks',
          icon: Calendar,
          show: hasPermission('tasks:view')
        },
        {
          name: 'Email Center',
          to: '/emails',
          icon: Mail,
          show: true
        },
        {
          name: 'Quotations',
          to: '/quotations',
          icon: FileText,
          show: hasPermission('quotations:view')
        },
        {
          name: 'Invoices & Payments',
          to: '/invoices',
          icon: Receipt,
          show: hasPermission('invoices:view')
        }
      ]
    },
    {
      title: 'INSIGHTS & AUTOMATION',
      items: [
        {
          name: 'Reports & Analytics',
          to: '/reports',
          icon: TrendingUp,
          show: true
        },
        {
          name: 'Workflows & Rules',
          to: '/workflows',
          icon: Zap,
          show: true,
          badge: 'Auto'
        },
        {
          name: 'Industry Packs',
          to: '/industry-packs',
          icon: Briefcase,
          show: true,
          badge: 'Packs'
        },
        {
          name: 'Lead Capture & Webhooks',
          to: '/lead-capture',
          icon: Globe,
          show: true,
          badge: 'Web'
        }
      ]
    },
    {
      title: 'ADMINISTRATION',
      items: [
        {
          name: 'Users & Team',
          to: '/users',
          icon: ShieldCheck,
          show: hasPermission('users:view')
        },
        {
          name: 'Roles & Permissions',
          to: '/roles',
          icon: ShieldCheck,
          show: hasPermission('roles:manage') || hasPermission('roles:view') || user?.role?.name === 'Organization Owner' || user?.role?.name === 'Admin' || user?.role?.name === 'Super Admin'
        },
        {
          name: 'Settings',
          to: '/settings',
          icon: Settings,
          show: hasPermission('settings:manage')
        }
      ]
    },
    {
      title: 'SUPER ADMIN',
      items: [
        {
          name: 'Platform SaaS',
          to: '/super-admin',
          icon: ShieldAlert,
          show: user?.role?.name === 'Super Admin',
          badge: 'Super'
        }
      ]
    }
  ];

  const renderNavContent = (isMobile = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand Header — Exact 64px matching Navbar for seamless continuous grid alignment */}
      <div
        style={{
          height: '64px',
          padding: '0 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          backgroundColor: 'var(--bg-surface)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: 'var(--grad-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: 'var(--shadow-glow)',
              flexShrink: 0
            }}
          >
            <Briefcase size={19} />
          </div>
          <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2
              style={{
                fontSize: '14.5px',
                fontWeight: '700',
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: 'var(--text-white)',
                margin: 0
              }}
              title={organization?.name || 'NexCRM Engine'}
            >
              {organization?.name || 'NexCRM Engine'}
            </h2>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                display: 'block',
                lineHeight: 1.2,
                marginTop: '1px',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {organization?.industry || 'Multi-Tenant CRM'}
            </span>
          </div>
        </div>

        {isMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            style={{
              background: 'rgba(148, 163, 184, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 12px'
        }}
      >
        {navSections.map((section, idx) => {
          const visibleItems = section.items.filter((item) => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} style={{ marginBottom: '22px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: 'var(--text-dim)',
                  letterSpacing: '0.08em',
                  padding: '4px 12px 8px'
                }}
              >
                {section.title}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {visibleItems.map((item, itemIdx) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={itemIdx}
                      to={item.to}
                      onClick={() => {
                        if (isMobile && onCloseMobile) onCloseMobile();
                      }}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        fontSize: '13.5px',
                        fontWeight: isActive ? '600' : '500',
                        color: isActive ? '#fff' : '#94a3b8',
                        backgroundColor: isActive ? 'rgba(99, 102, 241, 0.16)' : 'transparent',
                        borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                        transition: 'all 0.15s ease'
                      })}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                        <Icon size={18} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(99, 102, 241, 0.25)',
                            color: '#a5b4fc'
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Workspace Plan Footer Card */}
      <div
        style={{
          padding: '14px 16px',
          borderTop: '1px solid rgba(148, 163, 184, 0.1)',
          background: 'rgba(15, 23, 42, 0.6)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '6px'
          }}
        >
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Workspace Plan</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: '#38bdf8',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              padding: '2px 7px',
              borderRadius: '4px'
            }}
          >
            {organization?.subscription?.plan || 'Business'}
          </span>
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-dim)',
            display: 'flex',
            justifyContent: 'space-between'
          }}
        >
          <span>Role: {user?.role?.name || 'Member'}</span>
          <span style={{ color: '#10b981' }}>● Active</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className="sidebar-desktop"
        style={{
          width: '260px',
          minWidth: '260px',
          flexShrink: 0,
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          height: '100vh',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          userSelect: 'none',
          boxSizing: 'border-box'
        }}
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile Backdrop Overlay */}
      <div
        className={`sidebar-mobile-overlay ${isMobileOpen ? 'active' : ''}`}
        onClick={onCloseMobile}
      />

      {/* Mobile Slide-In Drawer */}
      <aside className={`sidebar-mobile-drawer ${isMobileOpen ? 'active' : ''}`}>
        {renderNavContent(true)}
      </aside>
    </>
  );
};

export default Sidebar;
