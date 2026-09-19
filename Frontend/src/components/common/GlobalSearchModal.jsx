import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Search,
  X,
  Users,
  Building,
  Contact,
  Kanban,
  FileText,
  Receipt,
  ArrowRight,
  ExternalLink,
  Command,
  Loader2,
  Sparkles
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Results', icon: Sparkles },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'customers', label: 'Customers', icon: Building },
  { id: 'contacts', label: 'Contacts', icon: Contact },
  { id: 'deals', label: 'Deals', icon: Kanban },
  { id: 'quotations', label: 'Quotations', icon: FileText },
  { id: 'invoices', label: 'Invoices', icon: Receipt }
];

const GlobalSearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle hotkeys within modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelectResult(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Debounced Search API Query
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('crm_access_token') || localStorage.getItem('token');
        const res = await axios.get(`/api/v1/search?q=${encodeURIComponent(query)}&category=${category}&limit=12`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.success) {
          setResults(res.data.data.flatResults || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Search query error:', err);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query, category]);

  const handleSelectResult = (item) => {
    onClose();
    if (item.link) {
      navigate(item.link);
    }
  };

  const getCategoryIcon = (type) => {
    switch (type) {
      case 'lead':
        return <Users size={16} color="#60a5fa" />;
      case 'customer':
        return <Building size={16} color="#34d399" />;
      case 'contact':
        return <Contact size={16} color="#a78bfa" />;
      case 'deal':
        return <Kanban size={16} color="#f59e0b" />;
      case 'quotation':
        return <FileText size={16} color="#38bdf8" />;
      case 'invoice':
        return <Receipt size={16} color="#ec4899" />;
      default:
        return <Search size={16} color="#94a3b8" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        zIndex: 1000,
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
            gap: '12px',
            backgroundColor: '#131d33'
          }}
        >
          {loading ? (
            <Loader2 size={20} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Search size={20} color="#818cf8" />
          )}

          <input
            ref={inputRef}
            type="text"
            placeholder="Search leads, accounts, deals, phone numbers, quotes, invoices..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '500'
            }}
          />

          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={16} />
            </button>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#1e293b',
              padding: '4px 8px',
              borderRadius: '6px',
              color: '#94a3b8',
              fontSize: '11px',
              fontWeight: '600'
            }}
          >
            <span>ESC</span>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            overflowX: 'auto',
            backgroundColor: '#0c1322'
          }}
        >
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: isActive ? '1px solid var(--primary)' : '1px solid rgba(148, 163, 184, 0.12)',
                  backgroundColor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: isActive ? '#818cf8' : '#94a3b8',
                  fontSize: '12.5px',
                  fontWeight: isActive ? '600' : '500',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={13} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Results List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {query.trim() === '' ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#1e293b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}
              >
                <Command size={22} color="#818cf8" />
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>
                Universal CRM Search
              </div>
              <div style={{ fontSize: '12.5px', marginTop: '4px', maxWidth: '380px', margin: '4px auto 0' }}>
                Quickly locate leads, corporate customer accounts, contact persons, active deals, quotes, and invoices.
              </div>

              {/* Sample Queries */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '18px', flexWrap: 'wrap' }}>
                {['TechVision', 'Priya', 'ERP Overhaul', 'INV-2026', '+91 98765'].map((tip) => (
                  <span
                    key={tip}
                    onClick={() => setQuery(tip)}
                    style={{
                      backgroundColor: '#131d33',
                      border: '1px solid rgba(148, 163, 184, 0.15)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      color: '#94a3b8',
                      cursor: 'pointer'
                    }}
                  >
                    "{tip}"
                  </span>
                ))}
              </div>
            </div>
          ) : results.length === 0 && !loading ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
              <Search size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0' }}>
                No matches found for "{query}"
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Check for typos or switch category filters to search all records.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {results.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelectResult(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: isSelected ? '#1e293b' : 'transparent',
                      border: isSelected ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: '#131d33',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {getCategoryIcon(item.type)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                            {item.title}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(148, 163, 184, 0.1)',
                              color: '#94a3b8',
                              fontWeight: '600'
                            }}
                          >
                            {item.category}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.details?.status && (
                        <span
                          className="badge"
                          style={{
                            fontSize: '11px',
                            backgroundColor: 'rgba(99, 102, 241, 0.15)',
                            color: '#818cf8'
                          }}
                        >
                          {item.details.status}
                        </span>
                      )}
                      <ArrowRight
                        size={15}
                        color={isSelected ? '#818cf8' : '#475569'}
                        style={{ transform: isSelected ? 'translateX(2px)' : 'none', transition: 'transform 0.15s' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Search Footer */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid rgba(148, 163, 184, 0.12)',
            backgroundColor: '#0c1322',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11.5px',
            color: '#64748b'
          }}
        >
          <div style={{ display: 'flex', gap: '14px' }}>
            <span>
              <kbd style={{ backgroundColor: '#1e293b', padding: '2px 5px', borderRadius: '3px', color: '#94a3b8' }}>↑</kbd>{' '}
              <kbd style={{ backgroundColor: '#1e293b', padding: '2px 5px', borderRadius: '3px', color: '#94a3b8' }}>↓</kbd> to navigate
            </span>
            <span>
              <kbd style={{ backgroundColor: '#1e293b', padding: '2px 5px', borderRadius: '3px', color: '#94a3b8' }}>↵</kbd> to select
            </span>
          </div>
          <div>
            {results.length > 0 && `${results.length} results matching`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;
