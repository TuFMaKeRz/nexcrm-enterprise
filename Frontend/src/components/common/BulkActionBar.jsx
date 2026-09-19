import React, { useState } from 'react';
import axios from 'axios';
import {
  UserCheck,
  Tag,
  CheckSquare,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  ChevronDown,
  Layers
} from 'lucide-react';

const BulkActionBar = ({
  entity = 'leads', // 'leads' or 'deals'
  selectedIds = [],
  onClearSelection,
  onSuccess,
  users = [],
  statuses = [],
  stages = []
}) => {
  const [activeModal, setActiveModal] = useState(null); // 'assign', 'status', 'tag', 'delete'
  const [targetUser, setTargetUser] = useState('');
  const [targetStatus, setTargetStatus] = useState('');
  const [targetStage, setTargetStage] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!selectedIds || selectedIds.length === 0) return null;

  const handleExecute = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem('crm_access_token') || localStorage.getItem('token');
      let payload = {};

      if (activeModal === 'assign') {
        payload = { assignedTo: targetUser };
      } else if (activeModal === 'status') {
        if (entity === 'leads') {
          payload = { statusId: targetStatus };
        } else {
          payload = { stageId: targetStage, status: 'Open' };
        }
      } else if (activeModal === 'tag') {
        payload = { tags: tagInput.split(',').map((t) => t.trim()).filter(Boolean) };
      }

      const res = await axios.post(
        '/api/v1/data/bulk-actions',
        {
          entity,
          action: activeModal,
          ids: selectedIds,
          payload
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        setActiveModal(null);
        if (onClearSelection) onClearSelection();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error('Bulk action failed:', err);
      alert(err.response?.data?.message || 'Bulk action failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      {/* Floating Bottom Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          borderRadius: '14px',
          padding: '10px 20px',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          zIndex: 40,
          animation: 'slideUp 0.2s ease-out'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              backgroundColor: 'var(--primary)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '12px'
            }}
          >
            {selectedIds.length}
          </span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>
            {selectedIds.length === 1 ? entity.slice(0, -1) : entity} selected
          </span>
        </div>

        <div style={{ height: '20px', width: '1px', backgroundColor: 'rgba(148, 163, 184, 0.2)' }} />

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setTargetUser(users[0]?._id || '');
              setActiveModal('assign');
            }}
            style={{ gap: '6px' }}
          >
            <UserCheck size={14} color="#818cf8" />
            <span>Assign Rep</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (entity === 'leads') {
                setTargetStatus(statuses[0]?._id || '');
              } else {
                setTargetStage(stages[0]?._id || '');
              }
              setActiveModal('status');
            }}
            style={{ gap: '6px' }}
          >
            <CheckSquare size={14} color="#34d399" />
            <span>Change Status</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setTagInput('');
              setActiveModal('tag');
            }}
            style={{ gap: '6px' }}
          >
            <Tag size={14} color="#f59e0b" />
            <span>Add Tag</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveModal('archive')}
            style={{ gap: '6px', color: '#f87171' }}
          >
            <Trash2 size={14} color="#f87171" />
            <span>Archive</span>
          </button>
        </div>

        <div style={{ height: '20px', width: '1px', backgroundColor: 'rgba(148, 163, 184, 0.2)' }} />

        {/* Clear selection */}
        <button
          type="button"
          onClick={onClearSelection}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Clear Selection"
        >
          <X size={16} />
        </button>
      </div>

      {/* Action Dialog Modal */}
      {activeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: '14px',
              padding: '20px',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7)'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>
              {activeModal === 'assign' && `Bulk Assign ${selectedIds.length} ${entity}`}
              {activeModal === 'status' && `Bulk Change Status (${selectedIds.length} ${entity})`}
              {activeModal === 'tag' && `Bulk Add Tags to ${selectedIds.length} ${entity}`}
              {activeModal === 'archive' && `Confirm Bulk Archive (${selectedIds.length} ${entity})`}
            </div>

            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
              This operation will apply changes to all {selectedIds.length} selected items.
            </div>

            {activeModal === 'assign' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Assign to Representative:
                </label>
                <select
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#131d33',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                >
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.firstName} {u.lastName} ({u.role?.name || 'Representative'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeModal === 'status' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Target Status / Stage:
                </label>
                {entity === 'leads' ? (
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#131d33',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  >
                    {statuses.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={targetStage}
                    onChange={(e) => setTargetStage(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#131d33',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  >
                    {stages.map((stg) => (
                      <option key={stg._id} value={stg._id}>
                        {stg.name} ({stg.probability || 0}%)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {activeModal === 'tag' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Tags (comma-separated):
                </label>
                <input
                  type="text"
                  placeholder="High-Priority, Q4-Target, VIP"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#131d33',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            {activeModal === 'archive' && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '12.5px',
                  color: '#f87171'
                }}
              >
                Are you sure you want to archive these {selectedIds.length} {entity}? They can be restored from the archived filter anytime.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={activeModal === 'archive' ? 'btn btn-danger btn-sm' : 'btn btn-primary btn-sm'}
                disabled={processing}
                onClick={handleExecute}
                style={{ gap: '6px' }}
              >
                {processing ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                <span>Confirm & Apply</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkActionBar;
