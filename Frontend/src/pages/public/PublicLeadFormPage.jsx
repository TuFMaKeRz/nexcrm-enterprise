import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Building,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  User,
  Mail,
  Phone,
  DollarSign,
  FileText,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

const PublicLeadFormPage = () => {
  const { slug } = useParams();
  const [formConfig, setFormConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    budget: '',
    serviceInterest: '',
    message: '',
    hp_website: '' // honeypot
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [thankYouMsg, setThankYouMsg] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/v1/public/forms/${slug}`);
        if (res.data?.success) {
          setFormConfig(res.data.data);
        } else {
          setError(res.data?.message || 'Lead form not found');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Form is no longer active or could not be found.');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await axios.post(`/api/v1/public/forms/${slug}/submit`, formData);
      if (res.data?.success) {
        setSubmitted(true);
        setThankYouMsg(res.data.data?.thankYouMessage || formConfig.thankYouMessage || 'Form submitted successfully!');
        if (res.data.data?.redirectUrl) {
          setTimeout(() => {
            window.location.href = res.data.data.redirectUrl;
          }, 2500);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit inquiry. Please check the fields and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1120', color: '#fff' }}>
        <Loader2 size={32} className="spin" color="#818cf8" />
      </div>
    );
  }

  if (error || !formConfig) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1120', color: '#fff', padding: '20px' }}>
        <div style={{ maxWidth: '440px', textAlign: 'center', backgroundColor: '#0f172a', padding: '32px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>Form Unavailable</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{error || 'This inquiry form does not exist or has been disabled.'}</p>
        </div>
      </div>
    );
  }

  const primaryColor = formConfig.primaryColor || '#6366f1';
  const fields = formConfig.fieldsConfig || {};

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0b1120',
        backgroundImage: 'radial-gradient(ellipse at 50% -20%, rgba(99, 102, 241, 0.15), transparent 70%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 16px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(148, 163, 184, 0.15)',
          borderRadius: '20px',
          padding: '36px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          color: '#fff',
          position: 'relative'
        }}
      >
        {/* Company Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 14px',
              borderRadius: '20px',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              fontSize: '12px',
              color: '#818cf8',
              fontWeight: '600',
              marginBottom: '12px'
            }}
          >
            <Building size={14} />
            <span>{formConfig.organization?.name || 'NexCRM Enterprise'}</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 8px', color: '#fff' }}>
            {formConfig.title}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
            {formConfig.description}
          </p>
        </div>

        {submitted ? (
          <div
            style={{
              textAlign: 'center',
              padding: '32px 16px',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '16px'
            }}
          >
            <CheckCircle2 size={56} color="#10b981" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
              Inquiry Received!
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
              {thankYouMsg}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Hidden honeypot */}
            <input
              type="text"
              name="hp_website"
              value={formData.hp_website}
              onChange={(e) => setFormData({ ...formData, hp_website: e.target.value })}
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              {fields.firstName?.enabled !== false && (
                <div>
                  <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    {fields.firstName?.label || 'First Name'} {fields.firstName?.required && <span style={{ color: '#f87171' }}>*</span>}
                  </label>
                  <input
                    type="text"
                    required={fields.firstName?.required !== false}
                    placeholder="e.g. Aarav"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13.5px'
                    }}
                  />
                </div>
              )}

              {fields.lastName?.enabled !== false && (
                <div>
                  <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    {fields.lastName?.label || 'Last Name'} {fields.lastName?.required && <span style={{ color: '#f87171' }}>*</span>}
                  </label>
                  <input
                    type="text"
                    required={fields.lastName?.required}
                    placeholder="e.g. Sharma"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13.5px'
                    }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              {fields.email?.enabled !== false && (
                <div>
                  <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    {fields.email?.label || 'Work Email'} {fields.email?.required !== false && <span style={{ color: '#f87171' }}>*</span>}
                  </label>
                  <input
                    type="email"
                    required={fields.email?.required !== false}
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13.5px'
                    }}
                  />
                </div>
              )}

              {fields.phone?.enabled !== false && (
                <div>
                  <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    {fields.phone?.label || 'Phone / WhatsApp'} {fields.phone?.required !== false && <span style={{ color: '#f87171' }}>*</span>}
                  </label>
                  <input
                    type="tel"
                    required={fields.phone?.required !== false}
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13.5px'
                    }}
                  />
                </div>
              )}
            </div>

            {fields.company?.enabled !== false && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  {fields.company?.label || 'Company / Organization'} {fields.company?.required && <span style={{ color: '#f87171' }}>*</span>}
                </label>
                <input
                  type="text"
                  required={fields.company?.required}
                  placeholder="e.g. Acme Innovations Corp"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13.5px'
                  }}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              {fields.budget?.enabled !== false && (
                <div>
                  <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    {fields.budget?.label || 'Estimated Budget (INR / USD)'}
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13.5px'
                    }}
                  />
                </div>
              )}

              {fields.serviceInterest?.enabled !== false && (
                <div>
                  <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    {fields.serviceInterest?.label || 'Interest / Vertical'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cloud SaaS / 3BHK Villa"
                    value={formData.serviceInterest}
                    onChange={(e) => setFormData({ ...formData, serviceInterest: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13.5px'
                    }}
                  />
                </div>
              )}
            </div>

            {fields.message?.enabled !== false && (
              <div style={{ marginBottom: '22px' }}>
                <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  {fields.message?.label || 'Requirement / Notes'}
                </label>
                <textarea
                  rows={3}
                  placeholder="Tell us a little bit about what you are looking to achieve..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13.5px',
                    resize: 'vertical'
                  }}
                ></textarea>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                backgroundColor: primaryColor,
                color: '#fff',
                border: 'none',
                fontWeight: '700',
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: `0 4px 14px ${primaryColor}66`,
                transition: 'transform 0.15s ease'
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Submitting Inquiry...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>{formConfig.submitButtonText || 'Submit Inquiry'}</span>
                </>
              )}
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '16px',
                fontSize: '11px',
                color: '#64748b'
              }}
            >
              <ShieldCheck size={13} color="#10b981" />
              <span>SSL 256-Bit Encrypted & Anti-Spam Protected</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PublicLeadFormPage;
