import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

const ModulePlaceholder = ({ moduleName, description, icon: Icon }) => {
  return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: '60px' }}>
      <div className="card" style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'var(--grad-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            marginBottom: '20px',
            boxShadow: 'var(--shadow-glow)'
          }}
        >
          {Icon ? <Icon size={28} /> : <Sparkles size={28} />}
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>
          {moduleName}
        </h2>
        <p className="text-muted" style={{ fontSize: '14.5px', lineHeight: 1.6, marginBottom: '24px' }}>
          {description}
        </p>
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: '#a5b4fc',
            fontWeight: '600'
          }}
        >
          <span>Scheduled for Next Module Development Step</span>
        </div>
      </div>
    </div>
  );
};

export default ModulePlaceholder;
