import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Package,
  Layers,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Boxes,
  DollarSign,
  Edit2,
  Trash2,
  X,
  LayoutGrid,
  List,
  ArrowUpDown,
  Tag,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const UNITS_LIST = ['Units', 'Hours', 'Days', 'Months', 'Years', 'Projects', 'Licenses', 'Items', 'Sets', 'Custom'];
const TAX_PRESETS = [0, 5, 12, 18, 28];

const ProductsPage = () => {
  const { hasPermission, organization } = useAuth();
  const canManage = hasPermission('products:manage');
  const currencySymbol = organization?.localization?.currencySymbol || '₹';

  // Data states
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [sortBy, setSortBy] = useState('createdAt');

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedItemForStock, setSelectedItemForStock] = useState(null);
  const [stockAdjustment, setStockAdjustment] = useState({ mode: 'add', amount: 1, reason: '' });

  // Form State
  const initialFormState = {
    name: '',
    type: 'Product',
    sku: '',
    description: '',
    category: 'General',
    unit: 'Units',
    unitPrice: '',
    costPrice: '',
    taxRate: 18,
    hsnSacCode: '',
    trackInventory: false,
    stockQuantity: 0,
    lowStockThreshold: 5,
    isActive: true,
    tags: ''
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch Items & Stats
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (stockStatusFilter) params.append('stockStatus', stockStatusFilter);
      if (activeFilter !== 'all') params.append('isActive', activeFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (sortBy) params.append('sort', sortBy);

      const [itemsRes, statsRes] = await Promise.all([
        axios.get(`/api/v1/products?${params.toString()}`, { headers }),
        axios.get('/api/v1/products/stats', { headers })
      ]);

      if (itemsRes.data?.success) {
        setItems(itemsRes.data.data.items || []);
      }
      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch catalog items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [typeFilter, categoryFilter, stockStatusFilter, activeFilter, searchTerm, sortBy]);

  // Open Add Modal
  const handleOpenAdd = (type = 'Product') => {
    setEditingItem(null);
    setFormData({ ...initialFormState, type, unit: type === 'Service' ? 'Hours' : 'Units' });
    setFormErrors({});
    setShowItemModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      type: item.type || 'Product',
      sku: item.sku || '',
      description: item.description || '',
      category: item.category || 'General',
      unit: item.unit || 'Units',
      unitPrice: item.unitPrice !== undefined ? item.unitPrice : '',
      costPrice: item.costPrice !== undefined ? item.costPrice : '',
      taxRate: item.taxRate !== undefined ? item.taxRate : 18,
      hsnSacCode: item.hsnSacCode || '',
      trackInventory: !!item.trackInventory,
      stockQuantity: item.stockQuantity || 0,
      lowStockThreshold: item.lowStockThreshold || 5,
      isActive: item.isActive !== undefined ? item.isActive : true,
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : ''
    });
    setFormErrors({});
    setShowItemModal(true);
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (e) => {
    e.preventDefault();
    setFormErrors({});

    if (!formData.name.trim()) {
      setFormErrors({ name: 'Item name is required' });
      return;
    }
    if (formData.unitPrice === '' || Number(formData.unitPrice) < 0) {
      setFormErrors({ unitPrice: 'Valid unit price is required' });
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        ...formData,
        unitPrice: Number(formData.unitPrice),
        costPrice: formData.costPrice !== '' ? Number(formData.costPrice) : 0,
        taxRate: Number(formData.taxRate),
        stockQuantity: formData.trackInventory ? Number(formData.stockQuantity) : 0,
        lowStockThreshold: formData.trackInventory ? Number(formData.lowStockThreshold) : 5,
        tags: formData.tags
          ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : []
      };

      if (editingItem) {
        await axios.put(`/api/v1/products/${editingItem._id}`, payload, { headers });
      } else {
        await axios.post('/api/v1/products', payload, { headers });
      }

      setShowItemModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save item:', err);
      const errorMsg = err.response?.data?.message || 'Error saving catalog item';
      setFormErrors({ submit: errorMsg });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active/Inactive
  const handleToggleActive = async (item) => {
    if (!canManage) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `/api/v1/products/${item._id}`,
        { isActive: !item.isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setItems((prev) =>
        prev.map((it) => (it._id === item._id ? { ...it, isActive: !it.isActive } : it))
      );
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Archive / Delete Item
  const handleDeleteItem = async (item) => {
    if (!canManage) return;
    if (!window.confirm(`Are you sure you want to archive "${item.name}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/products/${item._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error('Failed to archive item:', err);
    }
  };

  // Open Stock Adjust Modal
  const handleOpenStockAdjust = (item) => {
    setSelectedItemForStock(item);
    setStockAdjustment({ mode: 'add', amount: 5, reason: 'Restock / Purchase Received' });
    setShowStockModal(true);
  };

  // Execute Stock Adjustment
  const handleApplyStockAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedItemForStock) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      let payload = { reason: stockAdjustment.reason };
      const amt = Number(stockAdjustment.amount) || 0;

      if (stockAdjustment.mode === 'add') {
        payload.change = amt;
      } else if (stockAdjustment.mode === 'deduct') {
        payload.change = -amt;
      } else {
        payload.newQuantity = amt;
      }

      await axios.patch(`/api/v1/products/${selectedItemForStock._id}/stock`, payload, { headers });
      setShowStockModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to adjust stock:', err);
      alert(err.response?.data?.message || 'Error updating stock');
    } finally {
      setSubmitting(false);
    }
  };

  // Real-time Margin Calculation in Form
  const formUnitPrice = Number(formData.unitPrice) || 0;
  const formCostPrice = Number(formData.costPrice) || 0;
  const formMargin = Math.max(0, formUnitPrice - formCostPrice);
  const formMarginPct = formUnitPrice > 0 ? Math.round((formMargin / formUnitPrice) * 100) : 0;

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Top Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f8fafc' }}>
              Products & Services Catalog
            </h1>
            <span
              style={{
                fontSize: '12px',
                fontWeight: '600',
                padding: '3px 9px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.3)'
              }}
            >
              Item Master
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '4px' }}>
            Manage sellable goods, consulting services, inventory levels, SKUs, and GST/VAT tax rates.
          </p>
        </div>

        {canManage && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleOpenAdd('Service')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                backgroundColor: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                borderRadius: '8px',
                color: '#c084fc',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Layers size={16} />
              + Add Service
            </button>
            <button
              onClick={() => handleOpenAdd('Product')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                backgroundColor: '#6366f1',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              <Plus size={16} />
              + Add Product
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {/* Total Items */}
        <div
          style={{
            background: 'var(--card-bg, #111827)',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Boxes size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Catalog Items</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', marginTop: '2px' }}>
              {stats?.totalItems ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              {stats?.productsCount ?? 0} Products • {stats?.servicesCount ?? 0} Services
            </div>
          </div>
        </div>

        {/* Active Items */}
        <div
          style={{
            background: 'var(--card-bg, #111827)',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Active Items</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', marginTop: '2px' }}>
              {stats?.activeCount ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>
              Available in Deals & Quotes
            </div>
          </div>
        </div>

        {/* Total Inventory Asset Value */}
        <div
          style={{
            background: 'var(--card-bg, #111827)',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Inventory Stock Value</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', marginTop: '2px' }}>
              {currencySymbol} {(stats?.totalInventoryValue || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Across physical tracked stock
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          style={{
            background: 'var(--card-bg, #111827)',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: (stats?.lowStockCount || 0) > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(100, 116, 139, 0.15)',
              color: (stats?.lowStockCount || 0) > 0 ? '#f87171' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Low Stock Warning</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: (stats?.lowStockCount || 0) > 0 ? '#ef4444' : '#f8fafc', marginTop: '2px' }}>
              {stats?.lowStockCount ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: (stats?.lowStockCount || 0) > 0 ? '#f87171' : '#64748b', marginTop: '2px' }}>
              {(stats?.lowStockCount || 0) > 0 ? 'Items below threshold' : 'All stocks healthy'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          background: 'var(--card-bg, #111827)',
          border: '1px solid rgba(148, 163, 184, 0.12)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Left Side: Type Pills & Search */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', flex: 1 }}>
          {/* Type Segment Control */}
          <div
            style={{
              display: 'flex',
              background: '#0f172a',
              borderRadius: '8px',
              padding: '3px',
              border: '1px solid #334155'
            }}
          >
            {[
              { id: 'all', label: 'All Items' },
              { id: 'Product', label: 'Products', icon: Package },
              { id: 'Service', label: 'Services', icon: Layers }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTypeFilter(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: isActive ? '600' : '500',
                    background: isActive ? '#6366f1' : 'transparent',
                    color: isActive ? '#fff' : '#94a3b8',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {Icon && <Icon size={14} />}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '6px 12px',
              gap: '8px',
              minWidth: '240px',
              flex: '1 1 240px'
            }}
          >
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by name, SKU, tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f8fafc',
                fontSize: '13px',
                outline: 'none',
                width: '100%'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Category, Stock Status, Sort & View Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f8fafc',
              padding: '7px 10px',
              fontSize: '12.5px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Categories</option>
            {stats?.categories?.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Stock Filter (relevant for products) */}
          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f8fafc',
              padding: '7px 10px',
              fontSize: '12.5px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">All Stock Levels</option>
            <option value="inStock">In Stock (&gt; 0)</option>
            <option value="lowStock">Low Stock Alert</option>
            <option value="outOfStock">Out of Stock (0)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f8fafc',
              padding: '7px 10px',
              fontSize: '12.5px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="createdAt">Newest First</option>
            <option value="nameAsc">Name (A-Z)</option>
            <option value="priceAsc">Price (Low to High)</option>
            <option value="priceDesc">Price (High to Low)</option>
          </select>

          {/* View Toggle */}
          <div
            style={{
              display: 'flex',
              background: '#0f172a',
              borderRadius: '8px',
              border: '1px solid #334155',
              padding: '3px'
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? '#334155' : 'transparent',
                color: viewMode === 'grid' ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                background: viewMode === 'table' ? '#334155' : 'transparent',
                color: viewMode === 'table' ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Table View"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Catalog Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid rgba(99, 102, 241, 0.2)',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite'
            }}
          />
          Loading catalog items...
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            background: 'var(--card-bg, #111827)',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            padding: '50px 20px',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}
          >
            <Package size={28} />
          </div>
          <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#f8fafc' }}>
            No catalog items found
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '6px', maxWidth: '440px', margin: '6px auto 20px' }}>
            {searchTerm || typeFilter !== 'all' || categoryFilter !== 'all'
              ? 'Try adjusting your search criteria or clear active filters.'
              : 'Start by adding sellable products or services to your catalog.'}
          </p>
          {canManage && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                onClick={() => handleOpenAdd('Product')}
                style={{
                  padding: '9px 16px',
                  backgroundColor: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                + Create First Product
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '18px'
          }}
        >
          {items.map((item) => {
            const isService = item.type === 'Service';
            const marginAmount = Math.max(0, (item.unitPrice || 0) - (item.costPrice || 0));
            const marginPct = item.unitPrice > 0 ? Math.round((marginAmount / item.unitPrice) * 100) : 0;
            const isLowStock = item.trackInventory && item.stockQuantity <= (item.lowStockThreshold || 5);

            return (
              <div
                key={item._id}
                style={{
                  background: 'var(--card-bg, #111827)',
                  border: '1px solid rgba(148, 163, 184, 0.12)',
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.12)';
                }}
              >
                {/* Header: Type Badge, SKU & Status Toggle */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          background: isService ? 'rgba(168, 85, 247, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          color: isService ? '#c084fc' : '#38bdf8',
                          fontSize: '11px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {isService ? <Layers size={13} /> : <Package size={13} />}
                        {item.type}
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#94a3b8',
                          background: 'rgba(51, 65, 85, 0.5)',
                          padding: '2px 7px',
                          borderRadius: '4px'
                        }}
                      >
                        {item.sku}
                      </span>
                    </div>

                    {/* Active/Inactive Switch */}
                    <button
                      onClick={() => handleToggleActive(item)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: canManage ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '11px',
                        color: item.isActive ? '#10b981' : '#64748b'
                      }}
                      title={item.isActive ? 'Active (Click to disable)' : 'Inactive (Click to activate)'}
                    >
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          backgroundColor: item.isActive ? '#10b981' : '#64748b'
                        }}
                      />
                      {item.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  {/* Item Name & Category */}
                  <h4 style={{ fontSize: '15.5px', fontWeight: '700', color: '#f8fafc', marginBottom: '4px' }}>
                    {item.name}
                  </h4>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>
                    Category: <span style={{ color: '#cbd5e1' }}>{item.category || 'General'}</span>
                  </div>

                  {/* Description if present */}
                  {item.description && (
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#64748b',
                        marginBottom: '12px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {item.description}
                    </p>
                  )}

                  {/* Pricing & Margins Grid */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid rgba(51, 65, 85, 0.5)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      marginBottom: '12px',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Unit Price</div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#10b981' }}>
                        {currencySymbol} {Number(item.unitPrice).toLocaleString()}
                        <span style={{ fontSize: '11px', fontWeight: '400', color: '#64748b', marginLeft: '4px' }}>
                          / {item.unit}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Tax & Profit</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: '600',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: '#a5b4fc'
                          }}
                        >
                          {item.taxRate}% GST
                        </span>
                        {item.costPrice > 0 && (
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: '600',
                              padding: '2px 5px',
                              borderRadius: '4px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399'
                            }}
                          >
                            +{marginPct}% Mgn
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stock Tracking Bar (for physical products) */}
                  {item.trackInventory && (
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.5)',
                        border: `1px solid ${isLowStock ? 'rgba(239, 68, 68, 0.3)' : 'rgba(51, 65, 85, 0.5)'}`,
                        borderRadius: '8px',
                        padding: '8px 12px',
                        marginBottom: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                        <span style={{ color: '#94a3b8' }}>Inventory Stock:</span>
                        <span style={{ fontWeight: '700', color: isLowStock ? '#f87171' : '#34d399' }}>
                          {item.stockQuantity} {item.unit} {isLowStock && '(Low Stock)'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '14px' }}>
                      {item.tags.map((tg, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '10.5px',
                            background: '#1e293b',
                            color: '#94a3b8',
                            padding: '1px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          #{tg}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(51, 65, 85, 0.5)',
                    paddingTop: '12px',
                    marginTop: '6px'
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    HSN/SAC: {item.hsnSacCode || 'N/A'}
                  </span>

                  {canManage && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {item.trackInventory && (
                        <button
                          onClick={() => handleOpenStockAdjust(item)}
                          style={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#38bdf8',
                            padding: '5px 8px',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                          title="Adjust Stock Quantity"
                        >
                          <Boxes size={13} />
                          Stock
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEdit(item)}
                        style={{
                          background: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          color: '#f8fafc',
                          padding: '5px 8px',
                          cursor: 'pointer'
                        }}
                        title="Edit Item"
                      >
                        <Edit2 size={13} />
                      </button>

                      <button
                        onClick={() => handleDeleteItem(item)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '6px',
                          color: '#f87171',
                          padding: '5px 8px',
                          cursor: 'pointer'
                        }}
                        title="Archive Item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div
          style={{
            background: 'var(--card-bg, #111827)',
            border: '1px solid rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 16px' }}>Item & SKU</th>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Unit Price</th>
                  <th style={{ padding: '12px 16px' }}>Tax Rate</th>
                  <th style={{ padding: '12px 16px' }}>Stock Status</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  {canManage && <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isService = item.type === 'Service';
                  const isLowStock = item.trackInventory && item.stockQuantity <= (item.lowStockThreshold || 5);

                  return (
                    <tr
                      key={item._id}
                      style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.4)' }}
                    >
                      {/* Name & SKU */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '600', color: '#f8fafc' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '6px' }}>
                          <span style={{ background: '#1e293b', padding: '1px 5px', borderRadius: '3px' }}>
                            {item.sku}
                          </span>
                          {item.hsnSacCode && <span>HSN: {item.hsnSacCode}</span>}
                        </div>
                      </td>

                      {/* Type */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: '600',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: isService ? 'rgba(168, 85, 247, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                            color: isService ? '#c084fc' : '#38bdf8'
                          }}
                        >
                          {item.type}
                        </span>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                        {item.category || 'General'}
                      </td>

                      {/* Unit Price & Cost */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#10b981' }}>
                          {currencySymbol} {Number(item.unitPrice).toLocaleString()}{' '}
                          <span style={{ fontSize: '11px', fontWeight: '400', color: '#64748b' }}>
                            /{item.unit}
                          </span>
                        </div>
                        {item.costPrice > 0 && (
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            Cost: {currencySymbol} {Number(item.costPrice).toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* Tax Rate */}
                      <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                        {item.taxRate}% GST
                      </td>

                      {/* Stock Status */}
                      <td style={{ padding: '12px 16px' }}>
                        {item.trackInventory ? (
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: '600',
                              color: isLowStock ? '#f87171' : '#34d399',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {isLowStock && <AlertTriangle size={13} />}
                            {item.stockQuantity} {item.unit}
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {isService ? 'Service (N/A)' : 'Untracked'}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => handleToggleActive(item)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: canManage ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '11.5px',
                            color: item.isActive ? '#10b981' : '#64748b'
                          }}
                        >
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: item.isActive ? '#10b981' : '#64748b'
                            }}
                          />
                          {item.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Actions */}
                      {canManage && (
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {item.trackInventory && (
                              <button
                                onClick={() => handleOpenStockAdjust(item)}
                                style={{
                                  background: '#1e293b',
                                  border: '1px solid #334155',
                                  borderRadius: '6px',
                                  color: '#38bdf8',
                                  padding: '4px 6px',
                                  cursor: 'pointer'
                                }}
                                title="Adjust Stock"
                              >
                                <Boxes size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEdit(item)}
                              style={{
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '6px',
                                color: '#f8fafc',
                                padding: '4px 6px',
                                cursor: 'pointer'
                              }}
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '6px',
                                color: '#f87171',
                                padding: '4px 6px',
                                cursor: 'pointer'
                              }}
                              title="Archive"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {showItemModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#111827',
              border: '1px solid #334155',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #1f2937',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: formData.type === 'Product' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                    color: formData.type === 'Product' ? '#38bdf8' : '#c084fc'
                  }}
                >
                  {formData.type === 'Product' ? <Package size={20} /> : <Layers size={20} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#f8fafc' }}>
                    {editingItem ? `Edit ${editingItem.type}` : `Add New ${formData.type}`}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Item master details for quotations, invoicing, and inventory.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowItemModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveItem} style={{ padding: '24px' }}>
              {formErrors.submit && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: '#f87171',
                    fontSize: '13px',
                    marginBottom: '16px'
                  }}
                >
                  {formErrors.submit}
                </div>
              )}

              {/* Type Switcher (only for new item) */}
              {!editingItem && (
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    Item Type
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'Product', unit: 'Units' })}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: `1px solid ${formData.type === 'Product' ? '#38bdf8' : '#334155'}`,
                        background: formData.type === 'Product' ? 'rgba(56, 189, 248, 0.12)' : '#0f172a',
                        color: formData.type === 'Product' ? '#38bdf8' : '#94a3b8',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <Package size={16} /> Physical Product
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'Service', unit: 'Hours', trackInventory: false })}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: `1px solid ${formData.type === 'Service' ? '#c084fc' : '#334155'}`,
                        background: formData.type === 'Service' ? 'rgba(168, 85, 247, 0.12)' : '#0f172a',
                        color: formData.type === 'Service' ? '#c084fc' : '#94a3b8',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <Layers size={16} /> Service / Consulting
                    </button>
                  </div>
                </div>
              )}

              {/* Item Name & SKU */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={formData.type === 'Product' ? 'e.g. Enterprise CRM License' : 'e.g. Custom API Integration'}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#0f172a',
                      border: `1px solid ${formErrors.name ? '#ef4444' : '#334155'}`,
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  {formErrors.name && <span style={{ fontSize: '11px', color: '#f87171' }}>{formErrors.name}</span>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    SKU Code
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generate"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none',
                      textTransform: 'uppercase'
                    }}
                  />
                </div>
              </div>

              {/* Category & Unit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Software, Hardware, Consulting"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    Unit of Measure
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {UNITS_LIST.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing & Cost */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                      Selling Unit Price ({currencySymbol}) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="0.00"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: '#0b1120',
                        border: `1px solid ${formErrors.unitPrice ? '#ef4444' : '#334155'}`,
                        borderRadius: '8px',
                        color: '#10b981',
                        fontWeight: '700',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                      Cost Price ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: '#0b1120',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Live Margin Card */}
                {formUnitPrice > 0 && (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px'
                    }}
                  >
                    <span style={{ color: '#94a3b8' }}>Estimated Profit Margin:</span>
                    <span style={{ fontWeight: '700', color: '#34d399' }}>
                      {currencySymbol} {formMargin.toLocaleString()} ({formMarginPct}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Tax Rate & HSN/SAC */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    Tax Rate (% GST / VAT)
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {TAX_PRESETS.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setFormData({ ...formData, taxRate: rate })}
                        style={{
                          flex: 1,
                          padding: '7px 0',
                          borderRadius: '6px',
                          border: `1px solid ${formData.taxRate === rate ? '#6366f1' : '#334155'}`,
                          background: formData.taxRate === rate ? '#6366f1' : '#0f172a',
                          color: formData.taxRate === rate ? '#fff' : '#94a3b8',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                    HSN / SAC Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 998313"
                    value={formData.hsnSacCode}
                    onChange={(e) => setFormData({ ...formData, hsnSacCode: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Inventory Management (for Products) */}
              {formData.type === 'Product' && (
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    marginBottom: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: formData.trackInventory ? '12px' : '0' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>
                        Track Physical Stock Quantity
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        Enable inventory level checks and low stock alerts.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.trackInventory}
                      onChange={(e) => setFormData({ ...formData, trackInventory: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: '#6366f1', cursor: 'pointer' }}
                    />
                  </div>

                  {formData.trackInventory && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', paddingTop: '10px', borderTop: '1px solid #1e293b' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                          Current Stock Count
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.stockQuantity}
                          onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: '#0b1120',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#f8fafc',
                            fontSize: '13px',
                            outline: 'none'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                          Low Stock Threshold
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.lowStockThreshold}
                          onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: '#0b1120',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#f8fafc',
                            fontSize: '13px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description & Tags */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  rows="2"
                  placeholder="Optional item details, specifications or inclusions..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. saas, popular, recurring"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  style={{
                    padding: '9px 18px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#cbd5e1',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '9px 22px',
                    background: '#6366f1',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
                  }}
                >
                  {submitting ? 'Saving...' : editingItem ? 'Update Item' : 'Save to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {showStockModal && selectedItemForStock && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#111827',
              border: '1px solid #334155',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #1f2937',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Boxes size={18} color="#38bdf8" />
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>
                  Adjust Stock Quantity
                </h3>
              </div>
              <button
                onClick={() => setShowStockModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApplyStockAdjustment} style={{ padding: '20px' }}>
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ fontWeight: '600', color: '#f8fafc', fontSize: '14px' }}>
                  {selectedItemForStock.name}
                </div>
                <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>SKU: {selectedItemForStock.sku}</span>
                  <span>
                    Current Stock: <strong style={{ color: '#38bdf8' }}>{selectedItemForStock.stockQuantity} {selectedItemForStock.unit}</strong>
                  </span>
                </div>
              </div>

              {/* Mode Selection */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  Adjustment Action
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'add', label: '+ Add Received' },
                    { id: 'deduct', label: '- Deduct / Waste' },
                    { id: 'set', label: '= Set Count' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setStockAdjustment({ ...stockAdjustment, mode: m.id })}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '6px',
                        border: `1px solid ${stockAdjustment.mode === m.id ? '#38bdf8' : '#334155'}`,
                        background: stockAdjustment.mode === m.id ? 'rgba(56, 189, 248, 0.15)' : '#0f172a',
                        color: stockAdjustment.mode === m.id ? '#38bdf8' : '#94a3b8',
                        fontSize: '11.5px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Input */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  {stockAdjustment.mode === 'set' ? 'New Exact Stock Quantity' : 'Units to Adjust'}
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={stockAdjustment.amount}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, amount: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '14px',
                    fontWeight: '700',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Reason Input */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
                  Adjustment Reason / Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. PO #1042 Received, Physical Audit, Damaged in transit"
                  value={stockAdjustment.reason}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, reason: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Preview Result */}
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '18px'
                }}
              >
                <span style={{ color: '#94a3b8' }}>Resulting Stock:</span>
                <span style={{ fontWeight: '700', color: '#38bdf8' }}>
                  {stockAdjustment.mode === 'add'
                    ? selectedItemForStock.stockQuantity + (Number(stockAdjustment.amount) || 0)
                    : stockAdjustment.mode === 'deduct'
                    ? Math.max(0, selectedItemForStock.stockQuantity - (Number(stockAdjustment.amount) || 0))
                    : Number(stockAdjustment.amount) || 0}{' '}
                  {selectedItemForStock.unit}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#cbd5e1',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 20px',
                    background: '#0284c7',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {submitting ? 'Updating...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
