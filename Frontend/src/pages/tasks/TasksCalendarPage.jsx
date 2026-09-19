import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar as CalendarIcon, CheckSquare, Activity as ActivityIcon,
  Plus, Search, Filter, RefreshCw, Trash2, Edit3, CheckCircle2,
  X, ChevronLeft, ChevronRight, Clock, AlertCircle, Phone,
  Mail, Users, Building2, DollarSign, Layers, ExternalLink,
  MapPin, MessageSquare, Tag, User, Sparkles, Check, Flame
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const ACTIVITY_TYPES = ['Call', 'Meeting', 'Demo', 'Site Visit', 'WhatsApp', 'Email', 'Other'];
const ACTIVITY_OUTCOMES = [
  'Connected - Positive',
  'Connected - Neutral',
  'Connected - Negative',
  'Voicemail / No Answer',
  'Demo Completed',
  'Follow-up Required',
  'Proposal Requested',
  'Deal Signed',
  'Lost Interest',
  'Other'
];

export default function TasksCalendarPage({ initialTab = 'tasks' }) {
  const { user } = useAuth();

  // ── States ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(initialTab); // 'tasks' | 'activities' | 'calendar'

  // Task States
  const [tasks, setTasks] = useState([]);
  const [taskStats, setTaskStats] = useState({ total: 0, todo: 0, inProgress: 0, completed: 0, overdue: 0, urgent: 0 });
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState('all');
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState('');
  const [taskSearch, setTaskSearch] = useState('');

  // Activity States
  const [activities, setActivities] = useState([]);
  const [activityStats, setActivityStats] = useState({ total: 0, calls: 0, meetings: 0, demos: 0, siteVisits: 0, whatsapp: 0 });
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [activityOutcomeFilter, setActivityOutcomeFilter] = useState('all');
  const [activitySearch, setActivitySearch] = useState('');

  // Calendar States
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarViewMode, setCalendarViewMode] = useState('month'); // 'month' | 'week' | 'day'
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState(null);

  // Users, Leads, Customers, Deals for related selectors
  const [usersList, setUsersList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [leadsList, setLeadsList] = useState([]);
  const [dealsList, setDealsList] = useState([]);

  // Modals
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showLogActivityModal, setShowLogActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [prefilledDate, setPrefilledDate] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ── Data Fetching ──────────────────────────────────────────
  const fetchAuxData = async () => {
    try {
      const [uRes, cRes, lRes, dRes] = await Promise.all([
        api.get('/users?limit=100'),
        api.get('/customers?limit=100&isActive=true'),
        api.get('/leads?limit=100'),
        api.get('/deals?limit=100')
      ]);
      if (uRes.data?.users) setUsersList(uRes.data.users);
      else if (Array.isArray(uRes.data)) setUsersList(uRes.data);

      if (cRes.data?.customers) setCustomersList(cRes.data.customers);
      else if (Array.isArray(cRes.data)) setCustomersList(cRes.data);

      if (lRes.data?.leads) setLeadsList(lRes.data.leads);
      else if (Array.isArray(lRes.data)) setLeadsList(lRes.data);

      if (dRes.data?.deals) setDealsList(dRes.data.deals);
      else if (Array.isArray(dRes.data)) setDealsList(dRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (taskStatusFilter !== 'all') params.append('status', taskStatusFilter);
      if (taskPriorityFilter !== 'all') params.append('priority', taskPriorityFilter);
      if (taskAssigneeFilter) params.append('assignedTo', taskAssigneeFilter);
      if (taskSearch) params.append('search', taskSearch);

      const [res, statsRes] = await Promise.all([
        api.get(`/tasks?${params.toString()}`),
        api.get('/tasks/stats')
      ]);

      if (res.data?.tasks) setTasks(res.data.tasks);
      else if (Array.isArray(res.data)) setTasks(res.data);

      if (statsRes.data) setTaskStats(statsRes.data);
    } catch (err) {
      showToast('Failed to load tasks', 'error');
    }
  }, [taskStatusFilter, taskPriorityFilter, taskAssigneeFilter, taskSearch]);

  const fetchActivities = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activityTypeFilter !== 'all') params.append('type', activityTypeFilter);
      if (activityOutcomeFilter !== 'all') params.append('outcome', activityOutcomeFilter);
      if (activitySearch) params.append('search', activitySearch);

      const [res, statsRes] = await Promise.all([
        api.get(`/activities?${params.toString()}`),
        api.get('/activities/stats')
      ]);

      if (res.data?.activities) setActivities(res.data.activities);
      else if (Array.isArray(res.data)) setActivities(res.data);

      if (statsRes.data) setActivityStats(statsRes.data);
    } catch (err) {
      showToast('Failed to load activities', 'error');
    }
  }, [activityTypeFilter, activityOutcomeFilter, activitySearch]);

  const fetchCalendarEvents = useCallback(async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const start = new Date(year, month - 1, 1).toISOString();
      const end = new Date(year, month + 2, 0).toISOString();

      const res = await api.get(`/calendar/events?start=${start}&end=${end}`);
      if (res.data) setCalendarEvents(res.data);
    } catch (err) {
      showToast('Failed to load calendar events', 'error');
    }
  }, [currentDate]);

  useEffect(() => {
    fetchAuxData();
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTasks(), fetchActivities(), fetchCalendarEvents()]).finally(() => {
      setLoading(false);
      setRefreshing(false);
    });
  }, [fetchTasks, fetchActivities, fetchCalendarEvents]);

  // ── Actions ────────────────────────────────────────────────
  const handleToggleTaskComplete = async (taskId, e) => {
    e?.stopPropagation();
    try {
      const res = await api.patch(`/tasks/${taskId}/complete`);
      showToast(res.message || 'Task status updated');
      fetchTasks();
      fetchCalendarEvents();
    } catch (err) {
      showToast(err.customMessage || 'Failed to update task', 'error');
    }
  };

  const handleDeleteTask = async (taskId, e) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      showToast('Task deleted');
      fetchTasks();
      fetchCalendarEvents();
    } catch (err) {
      showToast(err.customMessage || 'Failed to delete task', 'error');
    }
  };

  const handleDeleteActivity = async (actId, e) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to delete this activity log?')) return;
    try {
      await api.delete(`/activities/${actId}`);
      showToast('Activity log deleted');
      fetchActivities();
      fetchCalendarEvents();
    } catch (err) {
      showToast(err.customMessage || 'Failed to delete activity', 'error');
    }
  };

  // Calendar Helpers
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const resetToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar Days Grid Generation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthTotalDays - i);
      days.push({ date, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }

    // Next month padding to fill 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  return (
    <div className="page-container" style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 20px',
            borderRadius: 10,
            background: notification.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {notification.message}
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8'
              }}
            >
              <CalendarIcon size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Tasks, Activities & Interactive Calendar
              </h1>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13.5 }}>
                Manage polymorphic tasks, multi-channel communication logs & interactive multi-stream calendar
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => { setRefreshing(true); fetchTasks(); fetchActivities(); fetchCalendarEvents(); }}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 12px', fontSize: 13 }}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>

          {activeTab === 'tasks' && (
            <button
              onClick={() => { setEditingTask(null); setShowAddTaskModal(true); }}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 18px', borderRadius: 8, fontWeight: 600 }}
            >
              <Plus size={18} />
              Create Task
            </button>
          )}

          {activeTab === 'activities' && (
            <button
              onClick={() => { setEditingActivity(null); setShowLogActivityModal(true); }}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 18px', borderRadius: 8, fontWeight: 600 }}
            >
              <Plus size={18} />
              Log Activity
            </button>
          )}

          {activeTab === 'calendar' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setEditingTask(null); setShowAddTaskModal(true); }}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 14px', borderRadius: 8 }}
              >
                <Plus size={16} /> Task
              </button>
              <button
                onClick={() => { setEditingActivity(null); setShowLogActivityModal(true); }}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px', borderRadius: 8, fontWeight: 600 }}
              >
                <Plus size={16} /> Activity
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Main View Nav Tabs ─────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: 4,
          marginBottom: 20
        }}
      >
        <button
          onClick={() => setActiveTab('tasks')}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'tasks' ? '#6366f1' : 'transparent',
            color: activeTab === 'tasks' ? '#fff' : 'var(--text-muted)',
            fontWeight: activeTab === 'tasks' ? 700 : 500,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.15s ease'
          }}
        >
          <CheckSquare size={16} />
          Task Manager ({tasks.length})
        </button>

        <button
          onClick={() => setActiveTab('activities')}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'activities' ? '#6366f1' : 'transparent',
            color: activeTab === 'activities' ? '#fff' : 'var(--text-muted)',
            fontWeight: activeTab === 'activities' ? 700 : 500,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.15s ease'
          }}
        >
          <ActivityIcon size={16} />
          Activity Logger ({activities.length})
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'calendar' ? '#6366f1' : 'transparent',
            color: activeTab === 'calendar' ? '#fff' : 'var(--text-muted)',
            fontWeight: activeTab === 'calendar' ? 700 : 500,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.15s ease'
          }}
        >
          <CalendarIcon size={16} />
          Interactive Calendar ({calendarEvents.length})
        </button>
      </div>

      {/* ========================================================= */}
      {/* ── VIEW 1: TASK MANAGER ───────────────────────────────── */}
      {/* ========================================================= */}
      {activeTab === 'tasks' && (
        <div>
          {/* KPI Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
            <MetricCard label="Total Tasks" value={taskStats.total} icon={CheckSquare} color="#6366f1" bg="rgba(99, 102, 241, 0.1)" />
            <MetricCard label="Pending To Do" value={taskStats.todo} icon={Clock} color="#3b82f6" bg="rgba(59, 130, 246, 0.1)" />
            <MetricCard label="Completed" value={taskStats.completed} icon={CheckCircle2} color="#10b981" bg="rgba(16, 185, 129, 0.1)" />
            <MetricCard label="Overdue" value={taskStats.overdue} icon={AlertCircle} color="#ef4444" bg="rgba(239, 68, 68, 0.1)" />
            <MetricCard label="Urgent Priority" value={taskStats.urgent} icon={Flame} color="#f59e0b" bg="rgba(245, 158, 11, 0.1)" />
          </div>

          {/* Filter Bar */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: '12px 18px',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: 20
            }}
          >
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className="input"
                style={{ width: '100%', paddingLeft: 34, height: 36, fontSize: 13 }}
              />
            </div>

            <select value={taskStatusFilter} onChange={(e) => setTaskStatusFilter(e.target.value)} className="input" style={{ width: 140, height: 36, fontSize: 13 }}>
              <option value="all">All Statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>

            <select value={taskPriorityFilter} onChange={(e) => setTaskPriorityFilter(e.target.value)} className="input" style={{ width: 140, height: 36, fontSize: 13 }}>
              <option value="all">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select value={taskAssigneeFilter} onChange={(e) => setTaskAssigneeFilter(e.target.value)} className="input" style={{ width: 160, height: 36, fontSize: 13 }}>
              <option value="">All Assignees</option>
              {usersList.map((u) => (
                <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </div>

          {/* Tasks List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 12px' }} />
              Loading tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--bg-surface)', border: '1px dashed var(--border-strong)', borderRadius: 12 }}>
              <CheckSquare size={40} style={{ color: 'var(--text-dim)', marginBottom: 10 }} />
              <h3 style={{ margin: '0 0 6px', color: 'var(--text-main)', fontSize: 17 }}>No Tasks Found</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13.5 }}>Create your first task or adjust your search filters.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tasks.map((t) => {
                const isCompleted = t.status === 'Completed';
                const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && !isCompleted;

                return (
                  <div
                    key={t._id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: isCompleted ? '1px solid rgba(16, 185, 129, 0.25)' : isOverdue ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-subtle)',
                      borderRadius: 12,
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                      {/* Checkbox */}
                      <button
                        onClick={(e) => handleToggleTaskComplete(t._id, e)}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: isCompleted ? 'none' : '2px solid var(--border-strong)',
                          background: isCompleted ? '#10b981' : 'transparent',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        {isCompleted && <Check size={14} />}
                      </button>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: 14.5,
                              fontWeight: 600,
                              color: isCompleted ? 'var(--text-dim)' : 'var(--text-main)',
                              textDecoration: isCompleted ? 'line-through' : 'none'
                            }}
                          >
                            {t.title}
                          </span>

                          {/* Priority Badge */}
                          <span
                            style={{
                              fontSize: 10.5,
                              padding: '1px 6px',
                              borderRadius: 4,
                              fontWeight: 700,
                              background:
                                t.priority === 'Urgent' ? 'rgba(239, 68, 68, 0.15)' :
                                t.priority === 'High' ? 'rgba(245, 158, 11, 0.15)' :
                                t.priority === 'Medium' ? 'rgba(59, 130, 246, 0.15)' :
                                'rgba(148, 163, 184, 0.15)',
                              color:
                                t.priority === 'Urgent' ? '#f87171' :
                                t.priority === 'High' ? '#fbbf24' :
                                t.priority === 'Medium' ? '#60a5fa' :
                                'var(--text-muted)'
                            }}
                          >
                            {t.priority}
                          </span>

                          {/* Related Entity Pill */}
                          {t.relatedName && (
                            <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 12, background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                              {t.relatedTo?.model}: {t.relatedName}
                            </span>
                          )}
                        </div>

                        {t.description && (
                          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
                            {t.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {/* Due Date */}
                      <div style={{ fontSize: 12, color: isOverdue ? '#f87171' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} />
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'No due date'}
                        {isOverdue && <span style={{ fontWeight: 700 }}>⚠️ Overdue</span>}
                      </div>

                      {/* Assignee Avatar */}
                      {t.assignedTo && (
                        <div
                          title={`Assigned: ${t.assignedTo.firstName} ${t.assignedTo.lastName}`}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: '#6366f1',
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {t.assignedTo.firstName?.charAt(0)}
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => { setEditingTask(t); setShowAddTaskModal(true); }}
                          className="btn btn-outline"
                          style={{ padding: '5px 8px', borderRadius: 6 }}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteTask(t._id, e)}
                          className="btn btn-outline"
                          style={{ padding: '5px 8px', borderRadius: 6, color: '#ef4444' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ── VIEW 2: ACTIVITY LOGGER ────────────────────────────── */}
      {/* ========================================================= */}
      {activeTab === 'activities' && (
        <div>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
            <MetricCard label="Total Activities Logged" value={activityStats.total} icon={ActivityIcon} color="#6366f1" bg="rgba(99, 102, 241, 0.1)" />
            <MetricCard label="Phone Calls" value={activityStats.calls} icon={Phone} color="#3b82f6" bg="rgba(59, 130, 246, 0.1)" />
            <MetricCard label="Meetings & Demos" value={(activityStats.meetings || 0) + (activityStats.demos || 0)} icon={Users} color="#8b5cf6" bg="rgba(139, 92, 246, 0.1)" />
            <MetricCard label="WhatsApp Chats" value={activityStats.whatsapp} icon={MessageSquare} color="#10b981" bg="rgba(16, 185, 129, 0.1)" />
          </div>

          {/* Filters */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: '12px 18px',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: 20
            }}
          >
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Search activity notes, location..."
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                className="input"
                style={{ width: '100%', paddingLeft: 34, height: 36, fontSize: 13 }}
              />
            </div>

            <select value={activityTypeFilter} onChange={(e) => setActivityTypeFilter(e.target.value)} className="input" style={{ width: 140, height: 36, fontSize: 13 }}>
              <option value="all">All Types</option>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select value={activityOutcomeFilter} onChange={(e) => setActivityOutcomeFilter(e.target.value)} className="input" style={{ width: 170, height: 36, fontSize: 13 }}>
              <option value="all">All Outcomes</option>
              {ACTIVITY_OUTCOMES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Activity Feed */}
          {activities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--bg-surface)', border: '1px dashed var(--border-strong)', borderRadius: 12 }}>
              <ActivityIcon size={40} style={{ color: 'var(--text-dim)', marginBottom: 10 }} />
              <h3 style={{ margin: '0 0 6px', color: 'var(--text-main)', fontSize: 17 }}>No Activities Logged</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13.5 }}>Log a call, meeting, demo, or WhatsApp touchpoint.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activities.map((a) => (
                <div
                  key={a._id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 12,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background:
                        a.type === 'Call' ? 'rgba(59, 130, 246, 0.15)' :
                        a.type === 'Meeting' ? 'rgba(139, 92, 246, 0.15)' :
                        a.type === 'Demo' ? 'rgba(168, 85, 247, 0.15)' :
                        a.type === 'WhatsApp' ? 'rgba(16, 185, 129, 0.15)' :
                        'rgba(99, 102, 241, 0.15)',
                      color:
                        a.type === 'Call' ? '#60a5fa' :
                        a.type === 'Meeting' ? '#a78bfa' :
                        a.type === 'Demo' ? '#c084fc' :
                        a.type === 'WhatsApp' ? '#34d399' :
                        '#818cf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {a.type === 'Call' ? <Phone size={18} /> :
                     a.type === 'Meeting' ? <Users size={18} /> :
                     a.type === 'Demo' ? <Sparkles size={18} /> :
                     a.type === 'WhatsApp' ? <MessageSquare size={18} /> :
                     <ActivityIcon size={18} />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>{a.title}</span>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontWeight: 600 }}>
                            {a.type}
                          </span>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600 }}>
                            {a.outcome}
                          </span>
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span>📅 {new Date(a.activityDate).toLocaleDateString()} at {new Date(a.activityDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>⏱️ {a.duration} mins</span>
                          {a.location && <span>📍 {a.location}</span>}
                          {a.relatedName && (
                            <span style={{ color: '#818cf8' }}>
                              🔗 {a.relatedTo?.model}: {a.relatedName}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={(e) => handleDeleteActivity(a._id, e)} className="btn btn-outline" style={{ padding: '5px 8px', borderRadius: 6, color: '#ef4444' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {a.description && (
                      <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, background: 'rgba(15, 23, 42, 0.3)', padding: 10, borderRadius: 8 }}>
                        {a.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ── VIEW 3: INTERACTIVE CALENDAR ───────────────────────── */}
      {/* ========================================================= */}
      {activeTab === 'calendar' && (
        <div>
          {/* Calendar Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: '12px 18px',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-main)' }}>
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>

              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={prevMonth} className="btn btn-outline" style={{ padding: '6px 10px', borderRadius: 6 }}>
                  <ChevronLeft size={16} />
                </button>
                <button onClick={resetToday} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12.5, borderRadius: 6 }}>
                  Today
                </button>
                <button onClick={nextMonth} className="btn btn-outline" style={{ padding: '6px 10px', borderRadius: 6 }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} /> Tasks
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} /> Meetings & Demos
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> Lead Follow-ups
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Deal Deadlines
              </span>
            </div>
          </div>

          {/* Calendar Month Grid */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 14,
              overflow: 'hidden'
            }}
          >
            {/* Weekday Header Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid var(--border-subtle)' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} style={{ padding: '12px 10px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid Cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {calendarDays.map((cell, idx) => {
                const isToday = cell.date.toDateString() === new Date().toDateString();
                const cellDateStr = cell.date.toISOString().split('T')[0];

                const dayEvents = calendarEvents.filter((ev) => {
                  const evDateStr = new Date(ev.start).toISOString().split('T')[0];
                  return evDateStr === cellDateStr;
                });

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setPrefilledDate(cell.date.toISOString().split('T')[0]);
                      setShowAddTaskModal(true);
                    }}
                    style={{
                      minHeight: 110,
                      padding: 8,
                      borderRight: '1px solid rgba(148, 163, 184, 0.08)',
                      borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
                      background: !cell.isCurrentMonth ? 'rgba(15, 23, 42, 0.2)' : isToday ? 'rgba(99, 102, 241, 0.06)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.12s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'; }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = !cell.isCurrentMonth ? 'rgba(15, 23, 42, 0.2)' : isToday ? 'rgba(99, 102, 241, 0.06)' : 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: isToday ? 800 : 600,
                          color: isToday ? '#818cf8' : cell.isCurrentMonth ? 'var(--text-main)' : 'var(--text-dim)',
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isToday ? 'rgba(99, 102, 241, 0.2)' : 'transparent'
                        }}
                      >
                        {cell.date.getDate()}
                      </span>

                      {dayEvents.length > 0 && (
                        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                          {dayEvents.length} items
                        </span>
                      )}
                    </div>

                    {/* Event Badges List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'hidden', maxHeight: 80 }}>
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCalendarEvent(ev);
                          }}
                          style={{
                            fontSize: 11,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: `${ev.color}22`,
                            color: ev.color,
                            border: `1px solid ${ev.color}44`,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontWeight: 600
                          }}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <span style={{ fontSize: 10, color: '#818cf8', fontWeight: 600 }}>
                          +{dayEvents.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Task Modal ──────────────────────────────── */}
      {showAddTaskModal && (
        <TaskModal
          isOpen={showAddTaskModal}
          onClose={() => { setShowAddTaskModal(false); setPrefilledDate(null); }}
          task={editingTask}
          prefilledDate={prefilledDate}
          usersList={usersList}
          customersList={customersList}
          leadsList={leadsList}
          dealsList={dealsList}
          onSaved={() => {
            setShowAddTaskModal(false);
            setPrefilledDate(null);
            fetchTasks();
            fetchCalendarEvents();
            showToast(editingTask ? 'Task updated!' : 'Task created!');
          }}
        />
      )}

      {/* ── Log Activity Modal ─────────────────────────────────── */}
      {showLogActivityModal && (
        <ActivityModal
          isOpen={showLogActivityModal}
          onClose={() => { setShowLogActivityModal(false); setPrefilledDate(null); }}
          activity={editingActivity}
          prefilledDate={prefilledDate}
          usersList={usersList}
          customersList={customersList}
          leadsList={leadsList}
          dealsList={dealsList}
          onSaved={() => {
            setShowLogActivityModal(false);
            setPrefilledDate(null);
            fetchActivities();
            fetchTasks();
            fetchCalendarEvents();
            showToast('Activity logged successfully!');
          }}
        />
      )}

      {/* ── Calendar Event Detail Modal ────────────────────────── */}
      {selectedCalendarEvent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
          onClick={() => setSelectedCalendarEvent(null)}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 14,
              width: '100%',
              maxWidth: 480,
              padding: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${selectedCalendarEvent.color}22`, color: selectedCalendarEvent.color, fontWeight: 700 }}>
                  {selectedCalendarEvent.eventType?.toUpperCase()}
                </span>
                <h3 style={{ margin: '6px 0 0', fontSize: 17, fontWeight: 700, color: 'var(--text-main)' }}>
                  {selectedCalendarEvent.title}
                </h3>
              </div>
              <button onClick={() => setSelectedCalendarEvent(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              <div>📅 <strong>Date:</strong> {new Date(selectedCalendarEvent.start).toLocaleString()}</div>
              {selectedCalendarEvent.location && <div>📍 <strong>Location / URL:</strong> {selectedCalendarEvent.location}</div>}
              {selectedCalendarEvent.outcome && <div>🎯 <strong>Outcome:</strong> {selectedCalendarEvent.outcome}</div>}
              {selectedCalendarEvent.status && <div>📊 <strong>Status:</strong> {selectedCalendarEvent.status}</div>}
              {selectedCalendarEvent.assignedTo && <div>👤 <strong>Assigned:</strong> {selectedCalendarEvent.assignedTo.firstName} {selectedCalendarEvent.assignedTo.lastName}</div>}
              {selectedCalendarEvent.description && (
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: 10, borderRadius: 8, marginTop: 4 }}>
                  {selectedCalendarEvent.description}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {selectedCalendarEvent.eventType === 'task' && selectedCalendarEvent.status !== 'Completed' && (
                <button
                  onClick={async () => {
                    await handleToggleTaskComplete(selectedCalendarEvent.rawId);
                    setSelectedCalendarEvent(null);
                  }}
                  className="btn btn-primary"
                >
                  Mark Completed
                </button>
              )}
              <button onClick={() => setSelectedCalendarEvent(null)} className="btn btn-outline">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// KPI Metric Card
// ================================================================
function MetricCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</p>
        <h3 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: 'var(--text-main)' }}>{value}</h3>
      </div>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        <Icon size={20} />
      </div>
    </div>
  );
}

// ================================================================
// Task Modal (Add / Edit)
// ================================================================
function TaskModal({ isOpen, onClose, task, prefilledDate, usersList, customersList, leadsList, dealsList, onSaved }) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'Medium',
    status: task?.status || 'To Do',
    dueDate: task?.dueDate ? task.dueDate.substring(0, 10) : prefilledDate || '',
    assignedTo: task?.assignedTo?._id || task?.assignedTo || '',
    relatedModel: task?.relatedTo?.model || 'General',
    relatedId: task?.relatedTo?.id || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) { setError('Task title is required'); return; }

    setSaving(true);
    setError('');

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        status: formData.status,
        dueDate: formData.dueDate || null,
        assignedTo: formData.assignedTo || null,
        relatedTo: {
          model: formData.relatedModel,
          id: formData.relatedModel !== 'General' ? formData.relatedId || null : null
        }
      };

      if (task) {
        await api.put(`/tasks/${task._id}`, payload);
      } else {
        await api.post('/tasks', payload);
      }

      onSaved();
    } catch (err) {
      setError(err.customMessage || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 16, width: '100%', maxWidth: 540, padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckSquare size={20} style={{ color: '#818cf8' }} />
            {task ? 'Edit Task' : 'Create New Task'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Task Title *</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Schedule technical demo follow-up" className="input" required />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Add task context or notes..." rows={2} className="input" style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Priority</label>
              <select name="priority" value={formData.priority} onChange={handleChange} className="input">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent 🔥</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className="input">
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Due Date</label>
              <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="label">Assignee</label>
              <select name="assignedTo" value={formData.assignedTo} onChange={handleChange} className="input">
                <option value="">Assign Team Member</option>
                {usersList.map((u) => (
                  <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Related Entity Link */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
            <div>
              <label className="label">Link To</label>
              <select name="relatedModel" value={formData.relatedModel} onChange={handleChange} className="input">
                <option value="General">General</option>
                <option value="Lead">Lead</option>
                <option value="Customer">Customer</option>
                <option value="Deal">Deal</option>
              </select>
            </div>

            {formData.relatedModel !== 'General' && (
              <div>
                <label className="label">Select {formData.relatedModel}</label>
                <select name="relatedId" value={formData.relatedId} onChange={handleChange} className="input">
                  <option value="">Select Associated Item</option>
                  {formData.relatedModel === 'Lead' && leadsList.map((l) => (
                    <option key={l._id} value={l._id}>{l.firstName} {l.lastName} ({l.company || 'Lead'})</option>
                  ))}
                  {formData.relatedModel === 'Customer' && customersList.map((c) => (
                    <option key={c._id} value={c._id}>{c.companyName}</option>
                  ))}
                  {formData.relatedModel === 'Deal' && dealsList.map((d) => (
                    <option key={d._id} value={d._id}>{d.title} (₹{d.value?.toLocaleString()})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" onClick={onClose} className="btn btn-outline" disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : task ? 'Update Task' : 'Create Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ================================================================
// Log Activity Modal
// ================================================================
function ActivityModal({ isOpen, onClose, activity, prefilledDate, usersList, customersList, leadsList, dealsList, onSaved }) {
  const [formData, setFormData] = useState({
    type: activity?.type || 'Call',
    title: activity?.title || '',
    description: activity?.description || '',
    outcome: activity?.outcome || 'Connected - Positive',
    activityDate: activity?.activityDate ? activity.activityDate.substring(0, 16) : prefilledDate ? `${prefilledDate}T10:00` : new Date().toISOString().substring(0, 16),
    duration: activity?.duration || 15,
    location: activity?.location || '',
    assignedTo: activity?.assignedTo?._id || activity?.assignedTo || '',
    relatedModel: activity?.relatedTo?.model || 'General',
    relatedId: activity?.relatedTo?.id || '',
    createFollowUpTask: false,
    followUpDueDate: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) { setError('Title is required'); return; }

    setSaving(true);
    setError('');

    try {
      const payload = {
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim(),
        outcome: formData.outcome,
        activityDate: formData.activityDate,
        duration: Number(formData.duration),
        location: formData.location.trim(),
        assignedTo: formData.assignedTo || null,
        relatedTo: {
          model: formData.relatedModel,
          id: formData.relatedModel !== 'General' ? formData.relatedId || null : null
        },
        createFollowUpTask: formData.createFollowUpTask,
        followUpDueDate: formData.followUpDueDate || null
      };

      if (activity) {
        await api.put(`/activities/${activity._id}`, payload);
      } else {
        await api.post('/activities', payload);
      }

      onSaved();
    } catch (err) {
      setError(err.customMessage || 'Failed to log activity');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 16, width: '100%', maxWidth: 580, padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ActivityIcon size={20} style={{ color: '#818cf8' }} />
            {activity ? 'Edit Activity Log' : 'Log Communication Activity'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10 }}>
            <div>
              <label className="label">Activity Type</label>
              <select name="type" value={formData.type} onChange={handleChange} className="input">
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Title / Subject *</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Discovery call with CEO" className="input" required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">Outcome Status</label>
              <select name="outcome" value={formData.outcome} onChange={handleChange} className="input">
                {ACTIVITY_OUTCOMES.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date & Time</label>
              <input type="datetime-local" name="activityDate" value={formData.activityDate} onChange={handleChange} className="input" required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
            <div>
              <label className="label">Duration (min)</label>
              <input type="number" name="duration" value={formData.duration} onChange={handleChange} min="1" className="input" />
            </div>
            <div>
              <label className="label">Location / Meeting URL / Phone</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="https://meet.google.com/xyz or Phone" className="input" />
            </div>
          </div>

          <div>
            <label className="label">Activity Notes & Discussion Summary</label>
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Log conversation points, client concerns, and next steps..." rows={2} className="input" style={{ resize: 'vertical' }} />
          </div>

          {/* Related Entity */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
            <div>
              <label className="label">Link To</label>
              <select name="relatedModel" value={formData.relatedModel} onChange={handleChange} className="input">
                <option value="General">General</option>
                <option value="Lead">Lead</option>
                <option value="Customer">Customer</option>
                <option value="Deal">Deal</option>
              </select>
            </div>

            {formData.relatedModel !== 'General' && (
              <div>
                <label className="label">Select {formData.relatedModel}</label>
                <select name="relatedId" value={formData.relatedId} onChange={handleChange} className="input">
                  <option value="">Select Associated Item</option>
                  {formData.relatedModel === 'Lead' && leadsList.map((l) => (
                    <option key={l._id} value={l._id}>{l.firstName} {l.lastName} ({l.company || 'Lead'})</option>
                  ))}
                  {formData.relatedModel === 'Customer' && customersList.map((c) => (
                    <option key={c._id} value={c._id}>{c.companyName}</option>
                  ))}
                  {formData.relatedModel === 'Deal' && dealsList.map((d) => (
                    <option key={d._id} value={d._id}>{d.title} (₹{d.value?.toLocaleString()})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 1-Click Follow-up Task Toggle */}
          <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="createFollowUpTask" name="createFollowUpTask" checked={formData.createFollowUpTask} onChange={handleChange} />
              <label htmlFor="createFollowUpTask" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                Auto-schedule a Follow-up Task for this activity
              </label>
            </div>

            {formData.createFollowUpTask && (
              <div>
                <label className="label">Follow-up Due Date</label>
                <input type="date" name="followUpDueDate" value={formData.followUpDueDate} onChange={handleChange} className="input" required />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-outline" disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Log Activity'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
