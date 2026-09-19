import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Plus, Trash2, Package, Layers, AlertCircle, Percent } from 'lucide-react';

/**
 * Reusable ItemQuickSelector component for Deals, Quotations, and Invoices.
 * 
 * Props:
 * - value: Array of selected line items [{ product: id, name, sku, type, unit, unitPrice, costPrice, quantity, discountPercentage, taxRate, total }]
 * - onChange: callback(updatedItems)
 * - currency: string (default 'INR' or '₹')
 * - readOnly: boolean
 */
const ItemQuickSelector = ({ value = [], onChange, currency = '₹', readOnly = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Search items from backend catalog
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = localStorage.getItem('crm_access_token') || localStorage.getItem('token');
        const res = await axios.get(`/api/v1/products/search?q=${encodeURIComponent(searchTerm.trim())}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.success) {
          setSearchResults(res.data.data || []);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Failed to search catalog items:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Click outside listener for autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectItem = (item) => {
    const newItem = {
      product: item._id,
      name: item.name,
      sku: item.sku,
      type: item.type,
      unit: item.unit || 'Units',
      unitPrice: Number(item.unitPrice) || 0,
      costPrice: Number(item.costPrice) || 0,
      taxRate: Number(item.taxRate) || 0,
      quantity: 1,
      discountPercentage: 0
    };

    // Calculate total
    const sub = newItem.quantity * newItem.unitPrice;
    const discounted = sub * (1 - newItem.discountPercentage / 100);
    newItem.total = Math.round(discounted * (1 + newItem.taxRate / 100));

    onChange([...value, newItem]);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleUpdateItem = (index, field, val) => {
    const updated = [...value];
    const item = { ...updated[index], [field]: val };

    const qty = Math.max(1, Number(item.quantity) || 1);
    const price = Math.max(0, Number(item.unitPrice) || 0);
    const disc = Math.min(100, Math.max(0, Number(item.discountPercentage) || 0));
    const tax = Math.max(0, Number(item.taxRate) || 0);

    item.quantity = qty;
    item.unitPrice = price;
    item.discountPercentage = disc;
    item.taxRate = tax;

    const sub = qty * price;
    const discounted = sub * (1 - disc / 100);
    item.total = Math.round(discounted * (1 + tax / 100));

    updated[index] = item;
    onChange(updated);
  };

  const handleRemoveItem = (index) => {
    const updated = value.filter((_, i) => i !== index);
    onChange(updated);
  };

  // Calculations
  const subtotal = value.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalDiscount = value.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.discountPercentage / 100)), 0);
  const totalTax = value.reduce((sum, item) => {
    const discPrice = (item.quantity * item.unitPrice) * (1 - item.discountPercentage / 100);
    return sum + (discPrice * (item.taxRate / 100));
  }, 0);
  const grandTotal = Math.round(subtotal - totalDiscount + totalTax);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* Search & Add Bar */}
      {!readOnly && (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '8px 14px',
              gap: '10px'
            }}
          >
            <Search size={17} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search product or service catalog by name, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f8fafc',
                fontSize: '13.5px',
                outline: 'none',
                width: '100%'
              }}
            />
            {isSearching && (
              <span style={{ fontSize: '12px', color: '#6366f1', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                Searching...
              </span>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                zIndex: 50,
                maxHeight: '260px',
                overflowY: 'auto'
              }}
            >
              {searchResults.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleSelectItem(item)}
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.12)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        background: item.type === 'Product' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                        color: item.type === 'Product' ? '#38bdf8' : '#c084fc'
                      }}
                    >
                      {item.type === 'Product' ? <Package size={15} /> : <Layers size={15} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#f8fafc' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', gap: '8px' }}>
                        <span>SKU: {item.sku}</span>
                        <span>•</span>
                        <span>{item.category || 'General'}</span>
                        {item.trackInventory && (
                          <>
                            <span>•</span>
                            <span style={{ color: item.stockQuantity <= (item.lowStockThreshold || 5) ? '#f87171' : '#34d399' }}>
                              Stock: {item.stockQuantity} {item.unit}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#10b981' }}>
                      {currency} {Number(item.unitPrice).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Tax: {item.taxRate}% GST
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Items List */}
      {value.length === 0 ? (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            background: 'rgba(15, 23, 42, 0.4)',
            border: '1px dashed #334155',
            borderRadius: '8px',
            color: '#64748b',
            fontSize: '13px'
          }}
        >
          No catalog items selected yet. Use the search bar above to add products or services.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '8px 10px' }}>Item & SKU</th>
                <th style={{ padding: '8px 10px', width: '85px' }}>Qty</th>
                <th style={{ padding: '8px 10px', width: '110px' }}>Price ({currency})</th>
                <th style={{ padding: '8px 10px', width: '85px' }}>Disc %</th>
                <th style={{ padding: '8px 10px', width: '85px' }}>Tax %</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', width: '120px' }}>Total ({currency})</th>
                {!readOnly && <th style={{ padding: '8px 10px', width: '40px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {value.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.4)' }}>
                  <td style={{ padding: '10px 10px' }}>
                    <div style={{ fontWeight: '600', color: '#f8fafc' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ background: 'rgba(51, 65, 85, 0.5)', padding: '1px 5px', borderRadius: '3px' }}>
                        {item.sku}
                      </span>
                      <span>({item.unit})</span>
                    </div>
                  </td>

                  {/* Quantity */}
                  <td style={{ padding: '10px 10px' }}>
                    {readOnly ? (
                      item.quantity
                    ) : (
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '5px',
                          color: '#f8fafc',
                          padding: '4px 6px',
                          fontSize: '12.5px',
                          outline: 'none'
                        }}
                      />
                    )}
                  </td>

                  {/* Unit Price */}
                  <td style={{ padding: '10px 10px' }}>
                    {readOnly ? (
                      `${currency} ${Number(item.unitPrice).toLocaleString()}`
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(idx, 'unitPrice', e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '5px',
                          color: '#f8fafc',
                          padding: '4px 6px',
                          fontSize: '12.5px',
                          outline: 'none'
                        }}
                      />
                    )}
                  </td>

                  {/* Discount % */}
                  <td style={{ padding: '10px 10px' }}>
                    {readOnly ? (
                      `${item.discountPercentage || 0}%`
                    ) : (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discountPercentage || 0}
                        onChange={(e) => handleUpdateItem(idx, 'discountPercentage', e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '5px',
                          color: '#f8fafc',
                          padding: '4px 6px',
                          fontSize: '12.5px',
                          outline: 'none'
                        }}
                      />
                    )}
                  </td>

                  {/* Tax Rate % */}
                  <td style={{ padding: '10px 10px' }}>
                    {readOnly ? (
                      `${item.taxRate || 0}%`
                    ) : (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.taxRate || 0}
                        onChange={(e) => handleUpdateItem(idx, 'taxRate', e.target.value)}
                        style={{
                          width: '100%',
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '5px',
                          color: '#f8fafc',
                          padding: '4px 6px',
                          fontSize: '12.5px',
                          outline: 'none'
                        }}
                      />
                    )}
                  </td>

                  {/* Item Total */}
                  <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: '600', color: '#38bdf8' }}>
                    {currency} {Number(item.total || 0).toLocaleString()}
                  </td>

                  {/* Delete Button */}
                  {!readOnly && (
                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px'
                        }}
                        title="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Box */}
      {value.length > 0 && (
        <div
          style={{
            alignSelf: 'flex-end',
            width: '280px',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '12.5px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
            <span>Subtotal:</span>
            <span>{currency} {subtotal.toLocaleString()}</span>
          </div>
          {totalDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
              <span>Total Discount:</span>
              <span>- {currency} {Math.round(totalDiscount).toLocaleString()}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
            <span>Estimated Tax (GST/VAT):</span>
            <span>+ {currency} {Math.round(totalTax).toLocaleString()}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: '700',
              fontSize: '14.5px',
              color: '#10b981',
              borderTop: '1px solid #334155',
              paddingTop: '6px',
              marginTop: '4px'
            }}
          >
            <span>Grand Total:</span>
            <span>{currency} {grandTotal.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemQuickSelector;
