import React, { useRef } from 'react';
import { Printer, Download, X, Building2, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * High-res Branded Printable Document Modal for Quotations and Invoices.
 * 
 * Props:
 * - type: 'quotation' | 'invoice'
 * - document: Quotation or Invoice object
 * - organization: Organization settings object
 * - onClose: callback
 */
const PrintDocumentModal = ({ type = 'quotation', document, organization, onClose }) => {
  const printAreaRef = useRef(null);

  if (!document) return null;

  const isInvoice = type === 'invoice';
  const currencySymbol = organization?.localization?.currencySymbol || '₹';
  const orgName = organization?.name || 'NexCRM Enterprise';
  const orgAddress = organization?.address || '100 Innovation Boulevard, Tech Park, Suite 400';
  const orgTaxId = organization?.taxId || organization?.businessRegistrationId || 'GSTIN: 29AAAAA0000A1Z5';
  const orgEmail = organization?.email || 'billing@acme.com';
  const orgPhone = organization?.phone || '+91 98765 43210';
  const orgWebsite = organization?.website || 'www.acme.com';

  const docNumber = isInvoice ? document.invoiceNumber : document.quotationNumber;
  const docTitle = isInvoice ? 'TAX INVOICE' : 'FORMAL QUOTATION';
  const customer = document.customer || {};

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(5px)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        overflowY: 'auto',
        padding: '24px 16px'
      }}
    >
      {/* Top Action Bar (hidden when printing) */}
      <div
        className="no-print"
        style={{
          width: '100%',
          maxWidth: '840px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          background: '#1e293b',
          padding: '12px 20px',
          borderRadius: '10px',
          border: '1px solid #334155'
        }}
      >
        <div style={{ color: '#f8fafc', fontSize: '15px', fontWeight: '600' }}>
          Document Preview: <span style={{ color: '#38bdf8' }}>{docNumber}</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
            }}
          >
            <Printer size={16} />
            Print / Save as PDF
          </button>

          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#334155',
              color: '#cbd5e1',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
            Close
          </button>
        </div>
      </div>

      {/* Printable Sheet (Standard A4 ratio in clean White / Slate for crisp printing) */}
      <div
        id="printable-document"
        ref={printAreaRef}
        style={{
          width: '100%',
          maxWidth: '840px',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          padding: '44px 48px',
          borderRadius: '6px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          fontSize: '13px',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          lineHeight: 1.5,
          marginBottom: '40px'
        }}
      >
        {/* Header: Company Info + Document Title */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '24px',
            marginBottom: '24px'
          }}
        >
          {/* Company Identity */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: '#6366f1',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '18px'
                }}
              >
                {orgName.charAt(0)}
              </div>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                {orgName}
              </h1>
            </div>
            <div style={{ color: '#64748b', fontSize: '12px' }}>
              <div>{orgAddress}</div>
              <div>{orgTaxId}</div>
              <div>Email: {orgEmail} | Phone: {orgPhone}</div>
              {orgWebsite && <div>Web: {orgWebsite}</div>}
            </div>
          </div>

          {/* Doc Title & Meta */}
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '22px',
                fontWeight: '900',
                letterSpacing: '0.05em',
                color: isInvoice ? '#0284c7' : '#6366f1',
                marginBottom: '6px'
              }}
            >
              {docTitle}
            </div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
              {docNumber}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              <div>Date: {new Date(document.issueDate || document.createdAt).toLocaleDateString()}</div>
              {isInvoice ? (
                <div>Due Date: {new Date(document.dueDate).toLocaleDateString()}</div>
              ) : (
                <div>Valid Until: {new Date(document.validUntil).toLocaleDateString()}</div>
              )}
            </div>

            {/* Status Badge */}
            <div style={{ marginTop: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  padding: '3px 9px',
                  borderRadius: '4px',
                  backgroundColor:
                    document.status === 'Paid' || document.status === 'Approved'
                      ? '#dcfce7'
                      : document.status === 'Overdue' || document.status === 'Rejected'
                      ? '#fee2e2'
                      : document.status === 'Partially Paid'
                      ? '#fef3c7'
                      : '#f1f5f9',
                  color:
                    document.status === 'Paid' || document.status === 'Approved'
                      ? '#15803d'
                      : document.status === 'Overdue' || document.status === 'Rejected'
                      ? '#b91c1c'
                      : document.status === 'Partially Paid'
                      ? '#b45309'
                      : '#475569'
                }}
              >
                ● {document.status}
              </span>
            </div>
          </div>
        </div>

        {/* Bill To Customer Section */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '24px'
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Billed To
            </div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
              {customer.companyName || customer.name || 'Client Name'}
            </div>
            {customer.companyName && customer.name && (
              <div style={{ color: '#475569', fontSize: '12px' }}>Attn: {customer.name}</div>
            )}
            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
              {customer.address && <div>{customer.address}</div>}
              {customer.taxId && <div>Tax ID / GST: {customer.taxId}</div>}
              {customer.email && <div>Email: {customer.email}</div>}
              {customer.phone && <div>Phone: {customer.phone}</div>}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Payment Information
            </div>
            <div style={{ fontSize: '12px', color: '#475569' }}>
              {isInvoice ? (
                <>
                  <div>Payment Terms: <strong>{document.paymentTerms || 'Net 15'}</strong></div>
                  <div>Currency: <strong>{document.currency || 'INR'} ({currencySymbol})</strong></div>
                  {document.deal && <div>Deal Ref: <strong>{document.deal.title}</strong></div>}
                </>
              ) : (
                <>
                  <div>Validity: <strong>30 Days</strong></div>
                  <div>Currency: <strong>{document.currency || 'INR'} ({currencySymbol})</strong></div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '24px',
            fontSize: '12.5px'
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', borderRadius: '4px 0 0 4px' }}>#</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Item Description</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', width: '60px' }}>Qty</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', width: '100px' }}>Unit Price</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', width: '70px' }}>Disc %</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', width: '70px' }}>Tax %</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', width: '110px', borderRadius: '0 4px 4px 0' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(document.items || []).map((item, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: '1px solid #e2e8f0',
                  backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff'
                }}
              >
                <td style={{ padding: '10px 12px', color: '#64748b' }}>{idx + 1}</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: '600', color: '#0f172a' }}>{item.name}</div>
                  {item.sku && (
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      SKU: {item.sku} ({item.unit || 'Units'})
                    </div>
                  )}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  {currencySymbol} {Number(item.unitPrice).toLocaleString()}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                  {item.discountPercentage || 0}%
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                  {item.taxRate || 0}%
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                  {currencySymbol} {Number(item.total).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Financial Summary & Bank Details Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '28px' }}>
          {/* Left: Bank Details or Notes */}
          <div>
            {isInvoice && document.bankDetails?.accountNumber ? (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  fontSize: '11.5px',
                  color: '#475569'
                }}
              >
                <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                  Remittance Bank Details
                </div>
                <div>Account Name: <strong>{document.bankDetails.accountName || orgName}</strong></div>
                <div>Bank Name: <strong>{document.bankDetails.bankName}</strong></div>
                <div>Account No: <strong>{document.bankDetails.accountNumber}</strong></div>
                <div>IFSC / SWIFT: <strong>{document.bankDetails.ifscSwiftCode}</strong></div>
                {document.bankDetails.upiId && <div>UPI ID: <strong>{document.bankDetails.upiId}</strong></div>}
              </div>
            ) : (
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>Terms & Notes</div>
                <div style={{ whiteSpace: 'pre-line' }}>{document.termsAndConditions || document.notes}</div>
              </div>
            )}
          </div>

          {/* Right: Calculations */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '14px 18px',
              fontSize: '12.5px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: '6px' }}>
              <span>Subtotal:</span>
              <span>{currencySymbol} {Number(document.subtotal || 0).toLocaleString()}</span>
            </div>

            {document.discountTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706', marginBottom: '6px' }}>
                <span>Discount Total:</span>
                <span>- {currencySymbol} {Number(document.discountTotal).toLocaleString()}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: '8px' }}>
              <span>Estimated Tax (GST/VAT):</span>
              <span>+ {currencySymbol} {Number(document.taxTotal || 0).toLocaleString()}</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: '800',
                fontSize: '15px',
                color: '#0f172a',
                borderTop: '2px solid #cbd5e1',
                paddingTop: '8px',
                marginBottom: isInvoice ? '8px' : '0'
              }}
            >
              <span>Grand Total:</span>
              <span style={{ color: '#0284c7' }}>
                {currencySymbol} {Number(document.grandTotal || 0).toLocaleString()}
              </span>
            </div>

            {/* Invoices: Paid Amount & Balance Due */}
            {isInvoice && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '4px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', marginBottom: '4px' }}>
                  <span>Amount Paid:</span>
                  <span>{currencySymbol} {Number(document.paidAmount || 0).toLocaleString()}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: '700',
                    color: document.balanceDue > 0 ? '#dc2626' : '#16a34a'
                  }}
                >
                  <span>Balance Due:</span>
                  <span>{currencySymbol} {Number(document.balanceDue || 0).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer: Authorized Signatory */}
        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            paddingTop: '20px',
            marginTop: '30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: '11.5px',
            color: '#64748b'
          }}
        >
          <div>
            <div>Thank you for choosing {orgName}.</div>
            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>This is a computer-generated document.</div>
          </div>

          <div style={{ textAlign: 'center', width: '180px' }}>
            <div style={{ height: '40px', borderBottom: '1px dashed #94a3b8', marginBottom: '6px' }} />
            <div style={{ fontWeight: '600', color: '#0f172a' }}>Authorized Signatory</div>
            <div style={{ fontSize: '10.5px' }}>{orgName}</div>
          </div>
        </div>
      </div>

      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          #printable-document, #printable-document * {
            visibility: visible;
          }
          #printable-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            padding: 20px !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintDocumentModal;
