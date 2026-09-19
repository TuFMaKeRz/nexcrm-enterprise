import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Users,
  UserCheck,
  Kanban,
  FileText,
  Receipt,
  Calendar,
  DollarSign,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'lead_assigned':
      return { icon: Users, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' };
    case 'deal_won':
      return { icon: DollarSign, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
    case 'deal_stage_changed':
      return { icon: Kanban, color: '#818cf8', bg: 'rgba(99, 102, 241, 0.15)' };
    case 'quotation_approved':
    case 'quotation_converted':
      return { icon: FileText, color: '#c084fc', bg: 'rgba(168, 85, 247, 0.15)' };
    case 'payment_recorded':
      return { icon: Receipt, color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' };
    case 'task_assigned':
    case 'followup_due':
      return { icon: Calendar, color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)' };
    default:
      return { icon: AlertCircle, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };
  }
};

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffSecs = Math.floor((now - date) / 1000);

  if (diffSecs < 60) return 'Just now';
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
  return `${Math.floor(diffSecs / 86400)}d ago`;
};

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('crm_access_token') || localStorage.getItem('token');
      if (!token) return;

      const res = await api.get('/notifications?limit=15');
      if (res?.success && res?.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      } else if (res?.notifications) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      // Silently handle if unauthenticated or server booting
      if (err?.response?.status !== 401) {
        console.error('Failed to fetch notifications:', err);
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark single as read and navigate
  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await api.patch(`/notifications/${notif._id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }

    if (notif.link) {
      navigate(notif.link);
      setIsOpen(false);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // Delete notification
  const handleDelete = async (e, notifId) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${notifId}`);
      setNotifications((prev) => prev.filter((n) => n._id !== notifId));
      fetchNotifications();
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: isOpen ? '#334155' : 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(148, 163, 184, 0.15)',
          borderRadius: '10px',
          width: '38px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#cbd5e1',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        title="Notifications"
      >
        <Bell size={18} />

        {/* Unread Glowing Badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: '#fff',
              fontSize: '10px',
              fontWeight: '700',
              padding: '1px 5px',
              borderRadius: '10px',
              border: '2px solid #0f172a',
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)',
              minWidth: '16px',
              textAlign: 'center',
              lineHeight: '14px'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '380px',
            backgroundColor: '#111827',
            border: '1px solid #334155',
            borderRadius: '14px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            zIndex: 100,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #1f2937',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#0f172a'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: '700',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    padding: '2px 7px',
                    borderRadius: '10px'
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#818cf8',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification Items List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                <Bell size={24} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                No notifications right now.
              </div>
            ) : (
              notifications.map((notif) => {
                const conf = getNotificationIcon(notif.type);
                const IconComponent = conf.icon;

                return (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
                      backgroundColor: notif.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.08)',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = notif.isRead
                        ? 'transparent'
                        : 'rgba(99, 102, 241, 0.08)';
                    }}
                  >
                    {/* Event Icon */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: conf.bg,
                        color: conf.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px'
                      }}
                    >
                      <IconComponent size={16} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: notif.isRead ? '500' : '700',
                          color: notif.isRead ? '#cbd5e1' : '#f8fafc',
                          marginBottom: '2px'
                        }}
                      >
                        {notif.title}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {notif.message}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '4px' }}>
                        {formatTimeAgo(notif.createdAt)}
                      </div>
                    </div>

                    {/* Delete action */}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, notif._id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        opacity: 0.7
                      }}
                      title="Remove notification"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
