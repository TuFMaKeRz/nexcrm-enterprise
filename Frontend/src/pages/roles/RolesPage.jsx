import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  Plus,
  CheckCircle2,
  Lock,
  Layers,
  Trash2,
  Edit2,
  X,
  Sparkles,
  Info,
  Eye,
  Search,
  Check,
  Filter
} from 'lucide-react';

const PERMISSION_GROUPS = [
  {
    name: 'Leads Management',
    permissions: [
      { key: 'leads:view', label: 'View Leads' },
      { key: 'leads:create', label: 'Create Leads' },
      { key: 'leads:edit', label: 'Edit Leads' },
      { key: 'leads:delete', label: 'Delete Leads' },
      { key: 'leads:assign', label: 'Assign Leads' },
      { key: 'leads:export', label: 'Export Leads' },
      { key: 'leads:import', label: 'Import Leads' }
    ]
  },
  {
    name: 'Customers & Contacts',
    permissions: [
      { key: 'customers:view', label: 'View Customers' },
      { key: 'customers:create', label: 'Create Customers' },
      { key: 'customers:edit', label: 'Edit Customers' },
      { key: 'customers:delete', label: 'Delete Customers' },
      { key: 'customers:export', label: 'Export Customers' },
      { key: 'contacts:view', label: 'View Contacts' },
      { key: 'contacts:create', label: 'Create Contacts' },
      { key: 'contacts:edit', label: 'Edit Contacts' },
      { key: 'contacts:delete', label: 'Delete Contacts' }
    ]
  },
  {
    name: 'Deals & Pipelines',
    permissions: [
      { key: 'deals:view', label: 'View Deals' },
      { key: 'deals:create', label: 'Create Deals' },
      { key: 'deals:edit', label: 'Edit Deals' },
      { key: 'deals:delete', label: 'Delete Deals' },
      { key: 'pipelines:view', label: 'View Pipelines' },
      { key: 'pipelines:manage', label: 'Manage Pipelines' }
    ]
  },
  {
    name: 'Quotations & Invoicing',
    permissions: [
      { key: 'quotations:view', label: 'View Quotes' },
      { key: 'quotations:create', label: 'Create Quotes' },
      { key: 'quotations:edit', label: 'Edit Quotes' },
      { key: 'quotations:delete', label: 'Delete Quotes' },
      { key: 'quotations:approve', label: 'Approve Quotes' },
      { key: 'invoices:view', label: 'View Invoices' },
      { key: 'invoices:create', label: 'Create Invoices' },
      { key: 'invoices:edit', label: 'Edit Invoices' },
      { key: 'invoices:delete', label: 'Delete Invoices' },
      { key: 'payments:view', label: 'View Payments' },
      { key: 'payments:record', label: 'Record Payments' }
    ]
  },
  {
    name: 'Products / Catalog',
    permissions: [
      { key: 'products:view', label: 'View Products & Services' },
      { key: 'products:manage', label: 'Manage Catalog' }
    ]
  },
  {
    name: 'Tasks & Activities',
    permissions: [
      { key: 'tasks:view', label: 'View Tasks' },
      { key: 'tasks:create', label: 'Create Tasks' },
      { key: 'tasks:edit', label: 'Edit Tasks' },
      { key: 'tasks:delete', label: 'Delete Tasks' },
      { key: 'activities:view', label: 'View Activities' },
      { key: 'activities:create', label: 'Log Activities' }
    ]
  },
  {
    name: 'Reports & Analytics',
    permissions: [
      { key: 'reports:view', label: 'View Reports' },
      { key: 'reports:export', label: 'Export Reports' }
    ]
  },
  {
    name: 'Administration & System',
    permissions: [
      { key: 'users:view', label: 'View Users' },
      { key: 'users:create', label: 'Create Users' },
      { key: 'users:edit', label: 'Edit Users' },
      { key: 'users:delete', label: 'Delete Users' },
      { key: 'roles:view', label: 'View Roles' },
      { key: 'roles:manage', label: 'Manage Custom Roles' },
      { key: 'settings:view', label: 'View Settings' },
      { key: 'settings:manage', label: 'Manage Settings' },
      { key: 'audit:view', label: 'View Audit Logs' }
    ]
  }
];

const TOTAL_PERMISSIONS_COUNT = PERMISSION_GROUPS.reduce((acc, g) => acc + g.permissions.length, 0);

const RolesPage = () => {
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // View Permissions Modal state
  const [selectedRoleForView, setSelectedRoleForView] = useState(null);
  const [viewFilter, setViewFilter] = useState('all'); // 'all' | 'granted' | 'denied'
  const [searchQuery, setSearchQuery] = useState('');

  // Create / Edit custom role modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    dataScope: 'own',
    permissions: []
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/roles');
      if (res.success) {
        setRoles(res.data);
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleOpenViewModal = (role) => {
    setSelectedRoleForView(role);
    setViewFilter('all');
    setSearchQuery('');
  };

  const handleOpenCreateModal = () => {
    setEditingRoleId(null);
    setNewRole({
      name: '',
      description: '',
      dataScope: 'own',
      permissions: []
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (role) => {
    setEditingRoleId(role._id);
    setNewRole({
      name: role.name,
      description: role.description || '',
      dataScope: role.dataScope || 'own',
      permissions: role.permissions || []
    });
    setFormError('');
    if (selectedRoleForView) {
      setSelectedRoleForView(null);
    }
    setIsModalOpen(true);
  };

  const handlePermissionToggle = (permKey) => {
    setNewRole((prev) => {
      const exists = prev.permissions.includes(permKey);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== permKey)
          : [...prev.permissions, permKey]
      };
    });
  };

  const handleToggleGroup = (groupPermissions) => {
    const keys = groupPermissions.map((p) => p.key);
    const allSelected = keys.every((k) => newRole.permissions.includes(k));

    setNewRole((prev) => {
      return {
        ...prev,
        permissions: allSelected
          ? prev.permissions.filter((p) => !keys.includes(p))
          : Array.from(new Set([...prev.permissions, ...keys]))
      };
    });
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    setFormError('');

    if (newRole.permissions.length === 0) {
      setFormError('Please select at least one permission');
      return;
    }

    setFormLoading(true);

    try {
      if (editingRoleId) {
        const res = await api.put(`/roles/${editingRoleId}`, newRole);
        if (res.success) {
          setIsModalOpen(false);
          setEditingRoleId(null);
          fetchRoles();
        }
      } else {
        const res = await api.post('/roles', newRole);
        if (res.success) {
          setIsModalOpen(false);
          setNewRole({ name: '', description: '', dataScope: 'own', permissions: [] });
          fetchRoles();
        }
      }
    } catch (err) {
      setFormError(err.customMessage || err.message || 'Failed to save role');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this custom role?')) return;
    try {
      const res = await api.delete(`/roles/${roleId}`);
      if (res.success) {
        setRoles(roles.filter((r) => r._id !== roleId));
        if (selectedRoleForView?._id === roleId) {
          setSelectedRoleForView(null);
        }
      }
    } catch (err) {
      alert(err.customMessage || 'Failed to delete role');
    }
  };

  const systemRoles = roles.filter((r) => r.isSystemRole || !r.organizationId);
  const customRoles = roles.filter((r) => !r.isSystemRole && r.organizationId);

  return (
    <div className="page-container">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800' }}>
              Roles & Access Permissions (RBAC)
            </h1>
            <span className="badge badge-primary">Security Matrix</span>
          </div>
          <p className="text-muted" style={{ fontSize: '13.5px' }}>
            Click on any role to inspect its complete granular permissions matrix or create customized roles.
          </p>
        </div>

        {hasPermission('roles:manage') && (
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={16} />
            <span>Create Custom Role</span>
          </button>
        )}
      </div>

      {/* Scope Explanation Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '28px'
        }}
      >
        {[
          { scope: 'OWN RECORDS', desc: 'User sees only records assigned to or created by them' },
          { scope: 'TEAM RECORDS', desc: 'Manager sees records of direct reporting team members' },
          { scope: 'DEPARTMENT RECORDS', desc: 'Department head sees all records in their department' },
          { scope: 'ORGANIZATION RECORDS', desc: 'Complete enterprise-wide visibility across all teams' }
        ].map((item, idx) => (
          <div
            key={idx}
            style={{
              padding: '14px 16px',
              backgroundColor: '#131d33',
              borderRadius: '10px',
              border: '1px solid rgba(148, 163, 184, 0.12)'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#818cf8', marginBottom: '4px' }}>
              {item.scope}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {item.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Built-in System Roles Section */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Lock size={16} color="var(--primary)" />
            <span>Built-in System Roles ({systemRoles.length})</span>
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            💡 Click any card to inspect active permissions
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px'
          }}
        >
          {systemRoles.map((role) => (
            <div
              key={role._id}
              className="card"
              onClick={() => handleOpenViewModal(role)}
              style={{
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: selectedRoleForView?._id === role._id ? '1px solid #6366f1' : undefined
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = selectedRoleForView?._id === role._id ? '#6366f1' : '';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '10px'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{role.name}</h3>
                  <span className="badge badge-primary" style={{ marginTop: '4px', fontSize: '11px' }}>
                    Scope: {role.dataScope?.toUpperCase()}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#94a3b8',
                    backgroundColor: 'rgba(148, 163, 184, 0.1)',
                    padding: '3px 8px',
                    borderRadius: '4px'
                  }}
                >
                  System Template
                </span>
              </div>

              <p className="text-muted" style={{ fontSize: '13px', lineHeight: 1.4, minHeight: '36px', marginBottom: '14px' }}>
                {role.description}
              </p>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12.5px',
                  borderTop: '1px solid rgba(148, 163, 184, 0.1)',
                  paddingTop: '12px'
                }}
              >
                <span style={{ fontWeight: '700', color: '#34d399' }}>
                  {role.permissions?.length || 0} permissions
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenViewModal(role);
                  }}
                  style={{ padding: '4px 10px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Eye size={13} />
                  <span>View Permissions</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Organization Custom Roles Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Sparkles size={16} color="#06b6d4" />
            <span>Custom Organization Roles ({customRoles.length})</span>
          </h2>
          {customRoles.length > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              💡 Click any card to inspect or edit permissions
            </span>
          )}
        </div>

        {customRoles.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
            <p className="text-muted" style={{ marginBottom: '14px' }}>
              No custom roles created yet for your company.
            </p>
            {hasPermission('roles:manage') && (
              <button className="btn btn-secondary btn-sm" onClick={handleOpenCreateModal}>
                <Plus size={14} />
                <span>Create Custom Role</span>
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px'
            }}
          >
            {customRoles.map((role) => (
              <div
                key={role._id}
                className="card"
                onClick={() => handleOpenViewModal(role)}
                style={{
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: selectedRoleForView?._id === role._id ? '1px solid #06b6d4' : undefined
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = selectedRoleForView?._id === role._id ? '#06b6d4' : '';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '10px'
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{role.name}</h3>
                    <span className="badge badge-cyan" style={{ marginTop: '4px', fontSize: '11px' }}>
                      Scope: {role.dataScope?.toUpperCase()}
                    </span>
                  </div>
                  {hasPermission('roles:manage') && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(role);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#818cf8',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                        title="Edit Role"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRole(role._id);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                        title="Delete Role"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-muted" style={{ fontSize: '13px', lineHeight: 1.4, minHeight: '36px', marginBottom: '14px' }}>
                  {role.description || 'Custom role with defined permissions.'}
                </p>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12.5px',
                    borderTop: '1px solid rgba(148, 163, 184, 0.1)',
                    paddingTop: '12px'
                  }}
                >
                  <span style={{ fontWeight: '700', color: '#06b6d4' }}>
                    {role.permissions?.length || 0} permissions
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {hasPermission('roles:manage') && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(role);
                        }}
                        style={{ padding: '4px 8px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                    )}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenViewModal(role);
                      }}
                      style={{ padding: '4px 10px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eye size={12} />
                      <span>View</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 🔍 VIEW PERMISSIONS INSPECTOR MODAL */}
      {/* ============================================================ */}
      {selectedRoleForView && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 100
          }}
          onClick={() => setSelectedRoleForView(null)}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '880px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px',
                paddingBottom: '14px',
                borderBottom: '1px solid rgba(148, 163, 184, 0.15)'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>
                    {selectedRoleForView.name}
                  </h2>
                  <span className="badge badge-primary">
                    Scope: {selectedRoleForView.dataScope?.toUpperCase()}
                  </span>
                  {selectedRoleForView.isSystemRole || !selectedRoleForView.organizationId ? (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#94a3b8',
                        backgroundColor: 'rgba(148, 163, 184, 0.1)',
                        padding: '3px 8px',
                        borderRadius: '4px'
                      }}
                    >
                      System Template (Protected)
                    </span>
                  ) : (
                    <span className="badge badge-cyan">Custom Organization Role</span>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', marginBottom: 0 }}>
                  {selectedRoleForView.description || 'Configured role permissions matrix.'}
                </p>
              </div>

              <button
                onClick={() => setSelectedRoleForView(null)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Stats & Filters Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                backgroundColor: '#131d33',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                border: '1px solid rgba(148, 163, 184, 0.12)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Active Permissions: </span>
                  <strong style={{ color: '#34d399', fontSize: '14px' }}>
                    {selectedRoleForView.permissions?.length || 0}
                  </strong>
                  <span style={{ color: 'var(--text-muted)' }}> / {TOTAL_PERMISSIONS_COUNT}</span>
                </div>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setViewFilter('all')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: viewFilter === 'all' ? 'var(--primary)' : 'rgba(148, 163, 184, 0.1)',
                    color: '#fff',
                    fontWeight: viewFilter === 'all' ? '700' : '500'
                  }}
                >
                  All ({TOTAL_PERMISSIONS_COUNT})
                </button>
                <button
                  type="button"
                  onClick={() => setViewFilter('granted')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: viewFilter === 'granted' ? '#10b981' : 'rgba(148, 163, 184, 0.1)',
                    color: '#fff',
                    fontWeight: viewFilter === 'granted' ? '700' : '500'
                  }}
                >
                  Granted ({selectedRoleForView.permissions?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setViewFilter('denied')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: viewFilter === 'denied' ? '#ef4444' : 'rgba(148, 163, 184, 0.1)',
                    color: '#fff',
                    fontWeight: viewFilter === 'denied' ? '700' : '500'
                  }}
                >
                  Denied ({TOTAL_PERMISSIONS_COUNT - (selectedRoleForView.permissions?.length || 0)})
                </button>
              </div>

              {/* Search Query */}
              <div style={{ position: 'relative', minWidth: '180px' }}>
                <Search size={14} style={{ position: 'absolute', left: '8px', top: '9px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Filter permissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 28px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    backgroundColor: '#0f172a',
                    color: '#fff'
                  }}
                />
              </div>
            </div>

            {/* Scrollable Permissions List */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {PERMISSION_GROUPS.map((group, gIdx) => {
                  const filteredGroupPerms = group.permissions.filter((p) => {
                    const isGranted = (selectedRoleForView.permissions || []).includes(p.key);
                    if (viewFilter === 'granted' && !isGranted) return false;
                    if (viewFilter === 'denied' && isGranted) return false;
                    if (
                      searchQuery &&
                      !p.label.toLowerCase().includes(searchQuery.toLowerCase()) &&
                      !p.key.toLowerCase().includes(searchQuery.toLowerCase())
                    ) {
                      return false;
                    }
                    return true;
                  });

                  if (filteredGroupPerms.length === 0) return null;

                  return (
                    <div
                      key={gIdx}
                      style={{
                        backgroundColor: '#131d33',
                        border: '1px solid rgba(148, 163, 184, 0.12)',
                        borderRadius: '10px',
                        padding: '14px'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '10px'
                        }}
                      >
                        <div style={{ fontWeight: '700', fontSize: '13.5px', color: '#fff' }}>
                          {group.name}
                        </div>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          {group.permissions.filter((p) => (selectedRoleForView.permissions || []).includes(p.key)).length}{' '}
                          of {group.permissions.length} active
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                          gap: '8px'
                        }}
                      >
                        {filteredGroupPerms.map((perm) => {
                          const isGranted = (selectedRoleForView.permissions || []).includes(perm.key);
                          return (
                            <div
                              key={perm.key}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '12px',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                backgroundColor: isGranted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.5)',
                                border: isGranted
                                  ? '1px solid rgba(16, 185, 129, 0.3)'
                                  : '1px solid rgba(148, 163, 184, 0.08)',
                                color: isGranted ? '#fff' : 'var(--text-muted)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isGranted ? (
                                  <CheckCircle2 size={14} color="#34d399" />
                                ) : (
                                  <Lock size={13} color="#64748b" />
                                )}
                                <span>{perm.label}</span>
                              </div>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: isGranted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                  color: isGranted ? '#34d399' : '#94a3b8'
                                }}
                              >
                                {isGranted ? 'GRANTED' : 'DENIED'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '16px',
                borderTop: '1px solid rgba(148, 163, 184, 0.15)',
                marginTop: '12px'
              }}
            >
              <div>
                {selectedRoleForView.isSystemRole || !selectedRoleForView.organizationId ? (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    🔒 Standard system templates are protected and immutable.
                  </span>
                ) : (
                  <span style={{ fontSize: '12px', color: '#38bdf8' }}>
                    ✨ Organization custom role.
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {!selectedRoleForView.isSystemRole &&
                  selectedRoleForView.organizationId &&
                  hasPermission('roles:manage') && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleOpenEditModal(selectedRoleForView)}
                    >
                      <Edit2 size={14} />
                      <span>Edit Custom Role</span>
                    </button>
                  )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedRoleForView(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ✏️ CREATE / EDIT CUSTOM ROLE MODAL */}
      {/* ============================================================ */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 100
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '840px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '28px',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                paddingBottom: '14px',
                borderBottom: '1px solid rgba(148, 163, 184, 0.15)'
              }}
            >
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '800' }}>
                  {editingRoleId ? 'Edit Custom Role' : 'Create Custom Role'}
                </h2>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Configure role name, data access visibility, and permission matrix checkboxes.
                </span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#f87171',
                  fontSize: '13px',
                  marginBottom: '16px'
                }}
              >
                {formError}
              </div>
            )}

            {/* Scrollable Form Content */}
            <form onSubmit={handleSaveRole} style={{ flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Role Name *</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="e.g. Senior Account Executive"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Data Access Scope *</label>
                  <select
                    className="select-control"
                    value={newRole.dataScope}
                    onChange={(e) => setNewRole({ ...newRole, dataScope: e.target.value })}
                  >
                    <option value="own">Own Records (Only assigned to / created by user)</option>
                    <option value="team">Team Records (User + Direct reportees)</option>
                    <option value="department">Department Records (Entire department)</option>
                    <option value="organization">Organization Records (Entire company)</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '22px' }}>
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Responsibilities and purpose of this custom role"
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                />
              </div>

              {/* PERMISSIONS MATRIX */}
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '14px'
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase' }}>
                    Granular Permissions Matrix ({newRole.permissions.length} selected)
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {PERMISSION_GROUPS.map((group, gIdx) => {
                    const groupKeys = group.permissions.map((p) => p.key);
                    const allSelected = groupKeys.every((k) => newRole.permissions.includes(k));

                    return (
                      <div
                        key={gIdx}
                        style={{
                          backgroundColor: '#131d33',
                          border: '1px solid rgba(148, 163, 184, 0.12)',
                          borderRadius: '10px',
                          padding: '14px'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px'
                          }}
                        >
                          <div style={{ fontWeight: '700', fontSize: '13.5px', color: '#fff' }}>
                            {group.name}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleGroup(group.permissions)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--primary)',
                              fontSize: '11.5px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                            gap: '8px'
                          }}
                        >
                          {group.permissions.map((perm) => {
                            const isChecked = newRole.permissions.includes(perm.key);
                            return (
                              <label
                                key={perm.key}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  fontSize: '12.5px',
                                  color: isChecked ? '#fff' : 'var(--text-muted)',
                                  backgroundColor: isChecked ? 'rgba(99, 102, 241, 0.14)' : 'rgba(15, 23, 42, 0.5)',
                                  border: isChecked ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(148, 163, 184, 0.08)',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handlePermissionToggle(perm.key)}
                                  style={{ accentColor: '#6366f1' }}
                                />
                                <span>{perm.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(148, 163, 184, 0.15)'
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formLoading}
                >
                  {formLoading
                    ? editingRoleId
                      ? 'Updating Role...'
                      : 'Saving Role...'
                    : editingRoleId
                    ? 'Update Custom Role'
                    : 'Save Custom Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPage;
