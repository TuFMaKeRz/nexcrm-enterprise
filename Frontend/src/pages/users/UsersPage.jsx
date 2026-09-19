import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  UserPlus,
  Shield,
  Building,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Key,
  Clock,
  Briefcase,
  UserCheck,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  FolderPlus,
  Sparkles
} from 'lucide-react';

const UsersPage = () => {
  const { user: currentUser, hasPermission } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'departments'
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Modals & Drawers
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Selected entities
  const [selectedUserForDrawer, setSelectedUserForDrawer] = useState(null);
  const [userActivity, setUserActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [targetUserForPassword, setTargetUserForPassword] = useState(null);
  const [editingDept, setEditingDept] = useState(null);

  // Form states
  const [inviteForm, setInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    roleId: '',
    department: 'Sales',
    reportingManager: '',
    sendWelcomeEmail: true
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const [deptForm, setDeptForm] = useState({
    name: '',
    description: '',
    head: '',
    color: '#6366f1'
  });
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptError, setDeptError] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    newPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Initial Data Fetch
  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, deptsRes, rolesRes, orgRes] = await Promise.all([
        api.get('/users'),
        api.get('/departments'),
        api.get('/roles'),
        api.get('/organization')
      ]);

      if (usersRes.success) setUsers(usersRes.data);
      if (deptsRes.success) setDepartments(deptsRes.data);
      if (rolesRes.success) setRoles(rolesRes.data);
      if (orgRes.success) setOrganization(orgRes.data);
    } catch (err) {
      console.error('Failed to load user management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    const query = search.toLowerCase();
    const matchesSearch = fullName.includes(query) || email.includes(query);

    const matchesDept =
      selectedDeptFilter === 'all' ||
      (u.department && u.department.toLowerCase() === selectedDeptFilter.toLowerCase());

    const matchesStatus =
      selectedStatusFilter === 'all' ||
      (selectedStatusFilter === 'active' && u.isActive) ||
      (selectedStatusFilter === 'inactive' && !u.isActive);

    return matchesSearch && matchesDept && matchesStatus;
  });

  // Toggle user active status
  const handleToggleStatus = async (userId) => {
    try {
      const res = await api.patch(`/users/${userId}/status`);
      if (res.success) {
        setUsers(users.map((u) => (u._id === userId ? { ...u, isActive: res.data.isActive } : u)));
      }
    } catch (err) {
      alert(err.customMessage || 'Failed to update user status');
    }
  };

  // Open User Activity Drawer
  const handleOpenDrawer = async (user) => {
    setSelectedUserForDrawer(user);
    setIsDrawerOpen(true);
    setActivityLoading(true);
    try {
      const res = await api.get(`/users/${user._id}/activity`);
      if (res.success) {
        setUserActivity(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch activity timeline:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  // Open Reset Password Modal
  const handleOpenPasswordReset = (user) => {
    setTargetUserForPassword(user);
    setPasswordForm({ newPassword: generateRandomPassword() });
    setPasswordError('');
    setPasswordSuccess('');
    setIsPasswordModalOpen(true);
  };

  // Submit Reset Password
  const handleSubmitPasswordReset = async (e) => {
    e.preventDefault();
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');
    try {
      const res = await api.post(`/users/${targetUserForPassword._id}/reset-password`, {
        newPassword: passwordForm.newPassword
      });
      if (res.success) {
        setPasswordSuccess(`Password updated successfully for ${targetUserForPassword.fullName}!`);
        setTimeout(() => {
          setIsPasswordModalOpen(false);
        }, 1500);
      }
    } catch (err) {
      setPasswordError(err.customMessage || 'Failed to reset password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Password Generator Helper
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  // Open Invite User Modal
  const handleOpenInviteModal = () => {
    setInviteForm({
      firstName: '',
      lastName: '',
      email: '',
      password: generateRandomPassword(),
      phone: '',
      roleId: roles[0]?._id || '',
      department: departments[0]?.name || 'Sales',
      reportingManager: '',
      sendWelcomeEmail: true
    });
    setInviteError('');
    setInviteSuccess('');
    setIsInviteModalOpen(true);
  };

  // Submit Invite User
  const handleSubmitInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.firstName || !inviteForm.lastName || !inviteForm.email || !inviteForm.roleId) {
      setInviteError('Please fill all mandatory fields (Name, Email, Role).');
      return;
    }

    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      const payload = {
        firstName: inviteForm.firstName,
        lastName: inviteForm.lastName,
        email: inviteForm.email,
        password: inviteForm.password,
        phone: inviteForm.phone,
        roleId: inviteForm.roleId,
        department: inviteForm.department,
        sendWelcomeEmail: inviteForm.sendWelcomeEmail
      };
      if (inviteForm.reportingManager) {
        payload.reportingManager = inviteForm.reportingManager;
      }

      const res = await api.post('/users', payload);
      if (res.success) {
        setInviteSuccess(`Employee ${res.data.fullName} registered & onboarded successfully!`);
        // Refresh users and departments
        fetchData();
        setTimeout(() => {
          setIsInviteModalOpen(false);
        }, 1200);
      }
    } catch (err) {
      setInviteError(err.customMessage || 'Failed to register employee');
    } finally {
      setInviteLoading(false);
    }
  };

  // Open Department Modal (Add or Edit)
  const handleOpenDeptModal = (dept = null) => {
    if (dept) {
      setEditingDept(dept);
      setDeptForm({
        name: dept.name,
        description: dept.description || '',
        head: dept.head?._id || dept.head || '',
        color: dept.color || '#6366f1'
      });
    } else {
      setEditingDept(null);
      setDeptForm({
        name: '',
        description: '',
        head: '',
        color: '#6366f1'
      });
    }
    setDeptError('');
    setIsDeptModalOpen(true);
  };

  // Submit Department Form
  const handleSubmitDept = async (e) => {
    e.preventDefault();
    if (!deptForm.name.trim()) {
      setDeptError('Department name is required.');
      return;
    }

    setDeptLoading(true);
    setDeptError('');

    try {
      const payload = {
        name: deptForm.name.trim(),
        description: deptForm.description,
        head: deptForm.head || null,
        color: deptForm.color
      };

      if (editingDept) {
        const res = await api.put(`/departments/${editingDept._id}`, payload);
        if (res.success) {
          fetchData();
          setIsDeptModalOpen(false);
        }
      } else {
        const res = await api.post('/departments', payload);
        if (res.success) {
          fetchData();
          setIsDeptModalOpen(false);
        }
      }
    } catch (err) {
      setDeptError(err.customMessage || 'Failed to save department');
    } finally {
      setDeptLoading(false);
    }
  };

  // Delete Department
  const handleDeleteDept = async (dept) => {
    if (dept.memberCount > 0) {
      alert(`Cannot delete '${dept.name}'. It has ${dept.memberCount} active member(s). Reassign them first.`);
      return;
    }
    if (!window.confirm(`Are you sure you want to delete department '${dept.name}'?`)) return;

    try {
      const res = await api.delete(`/departments/${dept._id}`);
      if (res.success) {
        setDepartments(departments.filter((d) => d._id !== dept._id));
      }
    } catch (err) {
      alert(err.customMessage || 'Failed to delete department');
    }
  };

  // Color options for department tags
  const colorOptions = [
    { label: 'Indigo', hex: '#6366f1' },
    { label: 'Emerald', hex: '#10b981' },
    { label: 'Cyan', hex: '#06b6d4' },
    { label: 'Amber', hex: '#f59e0b' },
    { label: 'Rose', hex: '#f43f5e' },
    { label: 'Violet', hex: '#8b5cf6' },
    { label: 'Blue', hex: '#3b82f6' }
  ];

  const maxSeats = organization?.subscription?.maxUsers || 25;
  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div className="page-container">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Team & Department Hub</h1>
            <span className="badge badge-primary">Module 3</span>
          </div>
          <p className="text-muted" style={{ fontSize: '13.5px' }}>
            Manage workforce accounts, role scope hierarchies, departmental units, and audit logs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {hasPermission('settings:manage') && (
            <button className="btn btn-secondary" onClick={() => handleOpenDeptModal()}>
              <FolderPlus size={16} />
              <span>Add Department</span>
            </button>
          )}

          {hasPermission('users:create') && (
            <button className="btn btn-primary" onClick={handleOpenInviteModal}>
              <UserPlus size={16} />
              <span>Invite Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metrics Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}
      >
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <Users size={22} />
          </div>
          <div className="kpi-content">
            <div className="kpi-title">Total Staff Members</div>
            <div className="kpi-value">{users.length}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <UserCheck size={22} />
          </div>
          <div className="kpi-content">
            <div className="kpi-title">Active Workforce</div>
            <div className="kpi-value">{activeCount}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <Building size={22} />
          </div>
          <div className="kpi-content">
            <div className="kpi-title">Departments</div>
            <div className="kpi-value">{departments.length}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
            <Briefcase size={22} />
          </div>
          <div className="kpi-content">
            <div className="kpi-title">Seat Capacity</div>
            <div className="kpi-value" style={{ fontSize: '20px' }}>
              {users.length} / {maxSeats} <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Seats</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '20px',
          paddingBottom: '2px'
        }}
      >
        <button
          onClick={() => setActiveTab('staff')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: '700',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'staff' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'staff' ? '#fff' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <Users size={16} />
          <span>Staff Directory</span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              backgroundColor: activeTab === 'staff' ? 'var(--primary)' : 'rgba(148, 163, 184, 0.2)',
              color: '#fff'
            }}
          >
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: '700',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'departments' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'departments' ? '#fff' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <Building size={16} />
          <span>Department Management</span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              backgroundColor: activeTab === 'departments' ? 'var(--primary)' : 'rgba(148, 163, 184, 0.2)',
              color: '#fff'
            }}
          >
            {departments.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STAFF DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'staff' && (
        <>
          {/* Filters Bar */}
          <div
            style={{
              display: 'flex',
              gap: '14px',
              marginBottom: '20px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}
          >
            <div style={{ position: 'relative', width: '320px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
              <input
                type="text"
                className="input-control"
                placeholder="Search staff by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Department:</span>
              <select
                className="input-control"
                style={{ width: '180px' }}
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Status:</span>
              <select
                className="input-control"
                style={{ width: '140px' }}
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="table-container">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role & Access Scope</th>
                  <th>Department</th>
                  <th>Reporting Manager</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Security & Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      Loading team members...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No staff members matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const initials = `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase();
                    const isSelf = u._id === currentUser?._id;
                    const deptObj = departments.find((d) => d.name === u.department);

                    return (
                      <tr key={u._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                background: deptObj?.color ? deptObj.color : 'var(--grad-primary)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '700',
                                fontSize: '13px',
                                flexShrink: 0
                              }}
                            >
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {u.firstName} {u.lastName}
                                {isSelf && (
                                  <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: '700' }}>(You)</span>
                                )}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div>
                            <span className="badge badge-primary">{u.role?.name || 'No Role'}</span>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '3px' }}>
                              Scope: <span style={{ textTransform: 'capitalize' }}>{u.role?.dataScope || 'own'}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: deptObj?.color || '#6366f1'
                              }}
                            />
                            <span style={{ fontSize: '13px', fontWeight: '500', color: '#e2e8f0' }}>
                              {u.department || 'Unassigned'}
                            </span>
                          </div>
                        </td>

                        <td>
                          {u.reportingManager ? (
                            <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                              {u.reportingManager.firstName} {u.reportingManager.lastName}
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Direct to Executive</span>
                          )}
                        </td>

                        <td>
                          <div style={{ fontSize: '13px' }}>{u.phone || '—'}</div>
                        </td>

                        <td>
                          {u.isActive ? (
                            <span className="badge badge-success">Active</span>
                          ) : (
                            <span className="badge badge-danger">Inactive</span>
                          )}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenDrawer(u)}
                              title="View Activity & Profile"
                            >
                              <Clock size={14} />
                              <span>Timeline</span>
                            </button>

                            {hasPermission('users:edit') && (
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => handleOpenPasswordReset(u)}
                                title="Admin Password Reset"
                              >
                                <Key size={14} />
                                <span>Reset Key</span>
                              </button>
                            )}

                            {!isSelf && hasPermission('users:edit') && (
                              <button
                                className={u.isActive ? 'btn btn-outline btn-sm' : 'btn btn-secondary btn-sm'}
                                onClick={() => handleToggleStatus(u._id)}
                                style={{
                                  fontSize: '12px',
                                  color: u.isActive ? 'var(--danger)' : '#34d399',
                                  borderColor: u.isActive ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'
                                }}
                              >
                                {u.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DEPARTMENT MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'departments' && (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '20px'
            }}
          >
            {departments.map((dept) => {
              return (
                <div
                  key={dept._id}
                  className="card"
                  style={{
                    padding: '22px',
                    position: 'relative',
                    overflow: 'hidden',
                    borderTop: `4px solid ${dept.color || '#6366f1'}`
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px'
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
                        {dept.name}
                      </h3>
                      <span
                        className="badge badge-cyan"
                        style={{
                          fontSize: '11px',
                          background: `${dept.color || '#6366f1'}22`,
                          color: dept.color || '#818cf8',
                          borderColor: `${dept.color || '#6366f1'}44`
                        }}
                      >
                        {dept.memberCount || 0} Member{dept.memberCount === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleOpenDeptModal(dept)}
                        style={{
                          background: 'rgba(148, 163, 184, 0.1)',
                          border: 'none',
                          color: 'var(--text-muted)',
                          padding: '6px',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                        title="Edit Department"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        onClick={() => handleDeleteDept(dept)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: 'none',
                          color: 'var(--danger)',
                          padding: '6px',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                        title="Delete Department"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <p
                    className="text-muted"
                    style={{
                      fontSize: '13px',
                      lineHeight: '1.5',
                      minHeight: '40px',
                      marginBottom: '16px'
                    }}
                  >
                    {dept.description || 'No department summary provided.'}
                  </p>

                  <div
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      borderRadius: '8px',
                      padding: '12px',
                      border: '1px solid rgba(148, 163, 184, 0.1)'
                    }}
                  >
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px', fontWeight: '600' }}>
                      Department Head / Leader
                    </div>
                    {dept.head ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            background: 'var(--grad-primary)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: '700'
                          }}
                        >
                          {dept.head.firstName?.[0]}
                          {dept.head.lastName?.[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
                            {dept.head.firstName} {dept.head.lastName}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{dept.head.email}</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12.5px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        No department head assigned
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INVITE EMPLOYEE */}
      {/* ========================================================================= */}
      {isInviteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsInviteModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid rgba(148, 163, 184, 0.15)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <UserPlus size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Invite New Employee</h2>
                  <p className="text-muted" style={{ fontSize: '12px' }}>
                    Provision staff workspace access, role permissions & departmental hierarchy.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitInvite} style={{ padding: '24px', overflowY: 'auto' }}>
              {inviteError && (
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
                  {inviteError}
                </div>
              )}

              {inviteSuccess && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    color: '#34d399',
                    fontSize: '13px',
                    marginBottom: '16px'
                  }}
                >
                  {inviteSuccess}
                </div>
              )}

              {/* Name Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="label">First Name *</label>
                  <input
                    type="text"
                    className="input-control"
                    required
                    placeholder="e.g. David"
                    value={inviteForm.firstName}
                    onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Last Name *</label>
                  <input
                    type="text"
                    className="input-control"
                    required
                    placeholder="e.g. Miller"
                    value={inviteForm.lastName}
                    onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                  />
                </div>
              </div>

              {/* Contact Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="label">Work Email *</label>
                  <input
                    type="email"
                    className="input-control"
                    required
                    placeholder="david.m@acme.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="+91 98765 00000"
                    value={inviteForm.phone}
                    onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Role & Department */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="label">Role & Scope *</label>
                  <select
                    className="input-control"
                    required
                    value={inviteForm.roleId}
                    onChange={(e) => setInviteForm({ ...inviteForm, roleId: e.target.value })}
                  >
                    <option value="">Select Role...</option>
                    {roles.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name} (Scope: {r.dataScope})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Department</label>
                  <select
                    className="input-control"
                    value={inviteForm.department}
                    onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                  >
                    {departments.map((d) => (
                      <option key={d._id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reporting Manager */}
              <div style={{ marginBottom: '16px' }}>
                <label className="label">Reporting Manager</label>
                <select
                  className="input-control"
                  value={inviteForm.reportingManager}
                  onChange={(e) => setInviteForm({ ...inviteForm, reportingManager: e.target.value })}
                >
                  <option value="">None (Reports directly to Executive)</option>
                  {users
                    .filter((u) => u.isActive)
                    .map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.firstName} {u.lastName} — {u.role?.name || 'Staff'} ({u.department})
                      </option>
                    ))}
                </select>
              </div>

              {/* Password with Generator */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="label" style={{ marginBottom: 0 }}>Initial Password *</label>
                  <button
                    type="button"
                    onClick={() => setInviteForm({ ...inviteForm, password: generateRandomPassword() })}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Sparkles size={13} />
                    <span>Generate Strong</span>
                  </button>
                </div>
                <input
                  type="text"
                  className="input-control"
                  required
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                />
              </div>

              {/* Email Notification Checkbox */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  borderRadius: '8px',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  marginBottom: '24px'
                }}
              >
                <input
                  type="checkbox"
                  id="sendWelcomeEmail"
                  checked={inviteForm.sendWelcomeEmail}
                  onChange={(e) => setInviteForm({ ...inviteForm, sendWelcomeEmail: e.target.checked })}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <label htmlFor="sendWelcomeEmail" style={{ fontSize: '13px', color: '#e2e8f0', cursor: 'pointer' }}>
                  Send Welcome Email with workspace access link & credentials via SMTP service
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsInviteModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={inviteLoading}
                >
                  {inviteLoading ? 'Registering Staff...' : 'Complete Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DEPARTMENT (CREATE / EDIT) */}
      {/* ========================================================================= */}
      {isDeptModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDeptModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid rgba(148, 163, 184, 0.15)'
              }}
            >
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800' }}>
                  {editingDept ? 'Edit Department' : 'Create Department'}
                </h2>
                <p className="text-muted" style={{ fontSize: '12px' }}>
                  Organize team units, departmental roles, and managerial hierarchy.
                </p>
              </div>
              <button
                onClick={() => setIsDeptModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitDept} style={{ padding: '24px' }}>
              {deptError && (
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
                  {deptError}
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label className="label">Department Name *</label>
                <input
                  type="text"
                  className="input-control"
                  required
                  placeholder="e.g. Engineering or Consulting"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="label">Department Description</label>
                <textarea
                  className="input-control"
                  rows={3}
                  placeholder="Briefly describe the functions and responsibilities of this team..."
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="label">Department Head / Lead</label>
                <select
                  className="input-control"
                  value={deptForm.head}
                  onChange={(e) => setDeptForm({ ...deptForm, head: e.target.value })}
                >
                  <option value="">None Assigned</option>
                  {users
                    .filter((u) => u.isActive)
                    .map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.firstName} {u.lastName} ({u.email})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="label">Department Badge Color</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
                  {colorOptions.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setDeptForm({ ...deptForm, color: c.hex })}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: c.hex,
                        border: deptForm.color === c.hex ? '3px solid #fff' : '2px solid transparent',
                        cursor: 'pointer',
                        boxShadow: deptForm.color === c.hex ? `0 0 10px ${c.hex}` : 'none'
                      }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsDeptModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={deptLoading}>
                  {deptLoading ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADMIN PASSWORD RESET */}
      {/* ========================================================================= */}
      {isPasswordModalOpen && targetUserForPassword && (
        <div className="modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid rgba(148, 163, 184, 0.15)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Key size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Admin Password Reset</h2>
                  <p className="text-muted" style={{ fontSize: '12px' }}>
                    Direct credential override by Workspace Administrator.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitPasswordReset} style={{ padding: '24px' }}>
              {passwordError && (
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
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    color: '#34d399',
                    fontSize: '13px',
                    marginBottom: '16px'
                  }}
                >
                  {passwordSuccess}
                </div>
              )}

              <div
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '8px',
                  padding: '14px',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  marginBottom: '18px'
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                  {targetUserForPassword.firstName} {targetUserForPassword.lastName}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  {targetUserForPassword.email} • {targetUserForPassword.department || 'General'}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="label" style={{ marginBottom: 0 }}>New Master Password</label>
                  <button
                    type="button"
                    onClick={() => setPasswordForm({ newPassword: generateRandomPassword() })}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Sparkles size={13} />
                    <span>Generate Strong</span>
                  </button>
                </div>
                <input
                  type="text"
                  className="input-control"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ newPassword: e.target.value })}
                />
                <span style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                  The employee can use this password immediately to log into their workspace.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsPasswordModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" disabled={passwordLoading}>
                  {passwordLoading ? 'Updating Key...' : 'Force Password Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: USER PROFILE & ACTIVITY TIMELINE */}
      {/* ========================================================================= */}
      {isDrawerOpen && selectedUserForDrawer && (
        <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div
              style={{
                padding: '24px',
                borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'var(--grad-primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: '800'
                  }}
                >
                  {selectedUserForDrawer.firstName?.[0]}
                  {selectedUserForDrawer.lastName?.[0]}
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', marginBottom: '2px' }}>
                    {selectedUserForDrawer.firstName} {selectedUserForDrawer.lastName}
                  </h2>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    {selectedUserForDrawer.email}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsDrawerOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Summary Cards */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(148, 163, 184, 0.15)', backgroundColor: 'rgba(15, 23, 42, 0.4)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Role & Scope
                  </div>
                  <div style={{ fontWeight: '600', color: '#fff' }}>
                    {selectedUserForDrawer.role?.name || 'Staff'} ({selectedUserForDrawer.role?.dataScope || 'own'})
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Department
                  </div>
                  <div style={{ fontWeight: '600', color: '#fff' }}>
                    {selectedUserForDrawer.department || 'General'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Reporting Manager
                  </div>
                  <div style={{ fontWeight: '600', color: '#cbd5e1' }}>
                    {selectedUserForDrawer.reportingManager
                      ? `${selectedUserForDrawer.reportingManager.firstName} ${selectedUserForDrawer.reportingManager.lastName}`
                      : 'None / Executive'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Account Status
                  </div>
                  <div>
                    {selectedUserForDrawer.isActive ? (
                      <span className="badge badge-success" style={{ fontSize: '11px' }}>Active</span>
                    ) : (
                      <span className="badge badge-danger" style={{ fontSize: '11px' }}>Inactive</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Timeline List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Clock size={16} color="var(--primary)" />
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>Activity & Audit Timeline</h3>
              </div>

              {activityLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading employee audit log...
                </div>
              ) : userActivity.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No recent audit activities found for this user.
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: '24px' }}>
                  {/* Timeline Vertical Line */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '8px',
                      top: '6px',
                      bottom: '6px',
                      width: '2px',
                      backgroundColor: 'rgba(148, 163, 184, 0.2)'
                    }}
                  />

                  {userActivity.map((act) => {
                    const dateFormatted = new Date(act.createdAt).toLocaleString();

                    return (
                      <div key={act._id} style={{ position: 'relative', marginBottom: '20px' }}>
                        {/* Timeline Node */}
                        <div
                          style={{
                            position: 'absolute',
                            left: '-20px',
                            top: '4px',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--primary)',
                            boxShadow: '0 0 6px var(--primary)'
                          }}
                        />

                        <div
                          style={{
                            backgroundColor: 'rgba(30, 41, 59, 0.5)',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid rgba(148, 163, 184, 0.1)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontWeight: '700', fontSize: '13px', color: '#fff' }}>
                              {act.action}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              {dateFormatted}
                            </span>
                          </div>

                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Entity: <span style={{ color: '#818cf8' }}>{act.entity}</span>
                            {act.ipAddress && <span> • IP: {act.ipAddress}</span>}
                          </div>

                          {act.details && Object.keys(act.details).length > 0 && (
                            <div
                              style={{
                                marginTop: '6px',
                                fontSize: '11px',
                                color: '#94a3b8',
                                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                fontFamily: 'monospace',
                                wordBreak: 'break-all'
                              }}
                            >
                              {JSON.stringify(act.details)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
