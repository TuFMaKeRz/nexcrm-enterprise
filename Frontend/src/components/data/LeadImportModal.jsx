import React, { useState, useRef } from 'react';
import axios from 'axios';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Table,
  Sparkles,
  HelpCircle
} from 'lucide-react';

const CRM_FIELDS = [
  { key: 'firstName', label: 'First Name (Required)', required: true },
  { key: 'lastName', label: 'Last Name', required: false },
  { key: 'company', label: 'Company / Organization', required: false },
  { key: 'email', label: 'Email Address', required: false },
  { key: 'phone', label: 'Phone Number', required: false },
  { key: 'expectedValue', label: 'Expected Deal Value (₹)', required: false },
  { key: 'city', label: 'City', required: false },
  { key: 'state', label: 'State', required: false },
  { key: 'source', label: 'Lead Source', required: false },
  { key: 'status', label: 'Lead Status', required: false },
  { key: 'tags', label: 'Tags (Comma separated)', required: false },
  { key: 'notes', label: 'Notes / Remarks', required: false }
];

const LeadImportModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Upload/Paste, 2: Map Columns, 3: Preview & Validate, 4: Results
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [parsedLeads, setParsedLeads] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Simple CSV parser for browser
  const parseCSV = (text) => {
    const lines = text
      .split(/\r\n|\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      alert('CSV must contain at least a header row and 1 data row');
      return;
    }

    // Parse header row
    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map(parseCSVLine);

    setCsvHeaders(headers);
    setCsvRows(rows);

    // Auto-map headers
    const autoMapping = {};
    headers.forEach((h, colIdx) => {
      const lowerH = h.toLowerCase().replace(/[^a-z]/g, '');
      if (lowerH.includes('first') || lowerH === 'name') autoMapping[colIdx] = 'firstName';
      else if (lowerH.includes('last')) autoMapping[colIdx] = 'lastName';
      else if (lowerH.includes('company') || lowerH.includes('org')) autoMapping[colIdx] = 'company';
      else if (lowerH.includes('email') || lowerH.includes('mail')) autoMapping[colIdx] = 'email';
      else if (lowerH.includes('phone') || lowerH.includes('mobile') || lowerH.includes('contact')) autoMapping[colIdx] = 'phone';
      else if (lowerH.includes('val') || lowerH.includes('deal') || lowerH.includes('amount') || lowerH.includes('budget')) autoMapping[colIdx] = 'expectedValue';
      else if (lowerH.includes('city')) autoMapping[colIdx] = 'city';
      else if (lowerH.includes('state')) autoMapping[colIdx] = 'state';
      else if (lowerH.includes('source')) autoMapping[colIdx] = 'source';
      else if (lowerH.includes('status')) autoMapping[colIdx] = 'status';
      else if (lowerH.includes('tag')) autoMapping[colIdx] = 'tags';
      else if (lowerH.includes('note') || lowerH.includes('remark') || lowerH.includes('desc')) autoMapping[colIdx] = 'notes';
    });

    setColumnMapping(autoMapping);
    setStep(2);
  };

  const parseCSVLine = (line) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim().replace(/^"|"$/g, ''));
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      setRawText(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const handlePasteProcess = () => {
    if (!rawText.trim()) {
      alert('Please paste CSV contents');
      return;
    }
    setFileName('Pasted CSV Text');
    parseCSV(rawText);
  };

  const loadSampleCSV = () => {
    const sample = `First Name,Last Name,Company,Email,Phone,Expected Value,City,Source
Arjun,Mehta,Apex Cloud Solutions,arjun.mehta@apexcloud.io,+91 98200 11223,450000,Mumbai,Website
Kavita,Deshmukh,Zenith Logistics,kavita@zenithlog.com,+91 98111 22334,320000,Pune,LinkedIn
Rohit,Sharma,BlueWave Analytics,rohit.sharma@bluewave.ai,+91 98450 33445,600000,Bengaluru,Referral
Sunil,Nair,Heritage Hospitality,sunil.nair@heritage.in,+91 97400 55667,200000,Kochi,Cold Call`;
    setRawText(sample);
    setFileName('sample_crm_leads.csv');
    parseCSV(sample);
  };

  const generatePreview = () => {
    const mappedLeads = [];
    const errs = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    csvRows.forEach((row, rowIdx) => {
      const lead = {};
      Object.entries(columnMapping).forEach(([colIdx, fieldKey]) => {
        if (fieldKey && fieldKey !== 'none') {
          lead[fieldKey] = row[colIdx] || '';
        }
      });

      // Validation
      if (!lead.firstName) {
        errs.push({ row: rowIdx + 1, message: 'Missing required First Name' });
      }
      if (lead.email && !emailRegex.test(lead.email)) {
        errs.push({ row: rowIdx + 1, message: `Invalid email format: ${lead.email}` });
      }

      mappedLeads.push(lead);
    });

    setParsedLeads(mappedLeads);
    setValidationErrors(errs);
    setStep(3);
  };

  const executeBatchImport = async () => {
    setImporting(true);
    try {
      const token = localStorage.getItem('crm_access_token') || localStorage.getItem('token');
      const res = await axios.post(
        '/api/v1/data/import/leads',
        { rows: parsedLeads },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        setImportResult(res.data.data);
        setStep(4);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error('Batch import failed:', err);
      alert(err.response?.data?.message || 'Batch import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '850px',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
            backgroundColor: '#131d33'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet size={22} color="var(--primary)" />
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>
                Import Leads from CSV / Excel
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Step {step} of 4: {step === 1 ? 'Upload File' : step === 2 ? 'Map Columns' : step === 3 ? 'Review & Validate' : 'Import Complete'}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* STEP 1: Upload or Paste */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  border: '2px dashed rgba(99, 102, 241, 0.4)',
                  borderRadius: '12px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: 'rgba(99, 102, 241, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.txt"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                <UploadCloud size={40} color="var(--primary)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#fff' }}>
                  Click or drag CSV file here to upload
                </div>
                <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '4px' }}>
                  Supports CSV formatted files with standard headers (First Name, Email, Phone, Company)
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(148, 163, 184, 0.15)' }} />
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>OR PASTE RAW CSV</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(148, 163, 184, 0.15)' }} />
              </div>

              <div>
                <textarea
                  rows={5}
                  placeholder={`First Name,Last Name,Company,Email,Phone,Expected Value,City\nJohn,Doe,Acme Corp,john@acme.com,+91 98765 43210,500000,Mumbai`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#131d33',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#e2e8f0',
                    fontFamily: 'monospace',
                    fontSize: '12.5px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={loadSampleCSV}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '6px' }}
                >
                  <Sparkles size={14} color="#818cf8" />
                  <span>Load Sample Demo Data</span>
                </button>

                <button
                  type="button"
                  onClick={handlePasteProcess}
                  disabled={!rawText.trim()}
                  className="btn btn-primary"
                  style={{ gap: '8px' }}
                >
                  <span>Continue to Column Mapping</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Column Mapping */}
          {step === 2 && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14.5px', fontWeight: '600', color: '#fff' }}>
                  Map CSV Columns to NexCRM Lead Fields
                </div>
                <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                  We auto-detected matching fields for <strong>{fileName}</strong> ({csvRows.length} rows found). Review or customize the mappings below.
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#131d33',
                  borderRadius: '10px',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  overflow: 'hidden'
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <th style={{ padding: '10px 14px' }}>CSV Column Header</th>
                      <th style={{ padding: '10px 14px' }}>Sample Data Preview</th>
                      <th style={{ padding: '10px 14px' }}>Map to CRM Field</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvHeaders.map((header, colIdx) => (
                      <tr key={colIdx} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: '600', color: '#fff' }}>
                          {header}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {csvRows[0]?.[colIdx] || '(empty)'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <select
                            value={columnMapping[colIdx] || 'none'}
                            onChange={(e) =>
                              setColumnMapping({ ...columnMapping, [colIdx]: e.target.value })
                            }
                            style={{
                              backgroundColor: '#0f172a',
                              border: '1px solid rgba(148, 163, 184, 0.25)',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              color: '#e2e8f0',
                              fontSize: '12.5px',
                              outline: 'none',
                              width: '100%'
                            }}
                          >
                            <option value="none">-- Skip Column --</option>
                            {CRM_FIELDS.map((f) => (
                              <option key={f.key} value={f.key}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-secondary"
                  style={{ gap: '6px' }}
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={generatePreview}
                  className="btn btn-primary"
                  style={{ gap: '8px' }}
                >
                  <span>Validate & Preview Rows</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Validation */}
          {step === 3 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px'
                }}
              >
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: '600', color: '#fff' }}>
                    Data Validation Preview ({parsedLeads.length} leads ready)
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                    Review parsed rows before committing batch insert into MongoDB.
                  </div>
                </div>

                {validationErrors.length > 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    <AlertTriangle size={15} />
                    <span>{validationErrors.length} validation issues</span>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>All rows validated</span>
                  </div>
                )}
              </div>

              {/* Preview Table */}
              <div
                style={{
                  backgroundColor: '#131d33',
                  borderRadius: '10px',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  overflowX: 'auto',
                  maxHeight: '280px'
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <th style={{ padding: '8px 12px' }}>#</th>
                      <th style={{ padding: '8px 12px' }}>Name</th>
                      <th style={{ padding: '8px 12px' }}>Company</th>
                      <th style={{ padding: '8px 12px' }}>Email</th>
                      <th style={{ padding: '8px 12px' }}>Phone</th>
                      <th style={{ padding: '8px 12px' }}>Value</th>
                      <th style={{ padding: '8px 12px' }}>City</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedLeads.slice(0, 10).map((l, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{i + 1}</td>
                        <td style={{ padding: '8px 12px', fontWeight: '600', color: '#fff' }}>
                          {l.firstName} {l.lastName}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{l.company || '-'}</td>
                        <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{l.email || '-'}</td>
                        <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{l.phone || '-'}</td>
                        <td style={{ padding: '8px 12px', color: '#34d399', fontWeight: '600' }}>
                          ₹{parseInt(l.expectedValue || 0, 10).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{l.city || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parsedLeads.length > 10 && (
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '8px', textAlign: 'center' }}>
                  Showing first 10 of {parsedLeads.length} leads
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn btn-secondary"
                  style={{ gap: '6px' }}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Mapping</span>
                </button>

                <button
                  type="button"
                  onClick={executeBatchImport}
                  disabled={importing || parsedLeads.length === 0}
                  className="btn btn-primary"
                  style={{ gap: '8px' }}
                >
                  {importing ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  <span>Commit Batch Import ({parsedLeads.length} Leads)</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Results */}
          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '24px 10px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}
              >
                <CheckCircle2 size={36} color="#10b981" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>
                Lead Import Completed Successfully!
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
                Imported <strong>{importResult?.insertedCount || 0}</strong> new lead accounts into your organization CRM database.
              </div>

              {importResult?.skippedCount > 0 && (
                <div
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginTop: '16px',
                    fontSize: '12.5px',
                    color: '#fbbf24',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {importResult.skippedCount} rows skipped due to duplicate emails or missing required fields:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    {importResult.errors?.slice(0, 3).map((err, i) => (
                      <li key={i}>
                        Row {err.row}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-primary"
                  style={{ padding: '8px 24px' }}
                >
                  <span>Done & View Leads</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadImportModal;
