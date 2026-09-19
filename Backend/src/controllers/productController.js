const { z } = require('zod');
const Product = require('../models/Product');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../middlewares/auditLogger');

// Helper to auto-generate SKU
const generateSKU = async (organizationId, type) => {
  const prefix = type === 'Service' ? 'SRV' : 'PRD';
  const count = await Product.countDocuments({ organizationId, type });
  const skuNum = String(count + 1).padStart(4, '0');
  let skuCandidate = `${prefix}-${skuNum}`;

  let exists = await Product.findOne({ organizationId, sku: skuCandidate });
  let counter = count + 1;
  while (exists) {
    counter++;
    skuCandidate = `${prefix}-${String(counter).padStart(4, '0')}`;
    exists = await Product.findOne({ organizationId, sku: skuCandidate });
  }

  return skuCandidate;
};

// ── Validation Schema ──────────────────────────────────────────
const createProductSchema = z.object({
  name: z.string().min(1, 'Item name is required').trim(),
  type: z.enum(['Product', 'Service']).default('Product'),
  sku: z.string().optional(),
  description: z.string().optional().default(''),
  category: z.string().optional().default('General'),
  unit: z.enum(['Units', 'Hours', 'Days', 'Months', 'Years', 'Projects', 'Licenses', 'Items', 'Sets', 'Custom']).default('Units'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  costPrice: z.number().min(0).optional().default(0),
  currency: z.string().optional().default('INR'),
  taxRate: z.number().min(0).max(100).optional().default(18),
  hsnSacCode: z.string().optional().default(''),
  trackInventory: z.boolean().optional().default(false),
  stockQuantity: z.number().optional().default(0),
  lowStockThreshold: z.number().optional().default(5),
  isActive: z.boolean().optional().default(true),
  tags: z.array(z.string()).optional().default([])
});

// ============================================================
// GET PRODUCTS & SERVICES (Catalog Grid / Table)
// GET /api/v1/products
// ============================================================
const getProducts = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const {
      type, category, isActive, stockStatus,
      search, page, limit, sort = 'createdAt'
    } = req.query;

    const filter = { organizationId: orgId, isArchived: false };

    if (type && type !== 'all') filter.type = type;
    if (category && category !== 'all') filter.category = category;
    if (isActive !== undefined && isActive !== 'all') {
      filter.isActive = isActive === 'true' || isActive === true;
    }

    if (stockStatus) {
      if (stockStatus === 'lowStock') {
        filter.trackInventory = true;
        filter.$expr = { $lte: ['$stockQuantity', '$lowStockThreshold'] };
      } else if (stockStatus === 'outOfStock') {
        filter.trackInventory = true;
        filter.stockQuantity = { $lte: 0 };
      } else if (stockStatus === 'inStock') {
        filter.trackInventory = true;
        filter.stockQuantity = { $gt: 0 };
      }
    }

    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { sku: { $regex: search.trim(), $options: 'i' } },
        { category: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { tags: { $in: [new RegExp(search.trim(), 'i')] } }
      ];
    }

    const sortOption = {};
    if (sort === 'priceAsc') sortOption.unitPrice = 1;
    else if (sort === 'priceDesc') sortOption.unitPrice = -1;
    else if (sort === 'nameAsc') sortOption.name = 1;
    else sortOption.createdAt = -1;

    const query = Product.find(filter).sort(sortOption);

    if (page && limit) {
      const skip = (Number(page) - 1) * Number(limit);
      const [items, total] = await Promise.all([
        query.skip(skip).limit(Number(limit)),
        Product.countDocuments(filter)
      ]);

      return ApiResponse.success(res, 'Catalog items fetched', {
        items,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      });
    }

    const items = await query;
    return ApiResponse.success(res, 'Catalog items fetched', { items });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET CATALOG STATS
// GET /api/v1/products/stats
// ============================================================
const getProductStats = async (req, res, next) => {
  try {
    const orgId = req.organizationId;

    const [totalItems, productsCount, servicesCount, activeCount, trackedItems] = await Promise.all([
      Product.countDocuments({ organizationId: orgId, isArchived: false }),
      Product.countDocuments({ organizationId: orgId, isArchived: false, type: 'Product' }),
      Product.countDocuments({ organizationId: orgId, isArchived: false, type: 'Service' }),
      Product.countDocuments({ organizationId: orgId, isArchived: false, isActive: true }),
      Product.find({ organizationId: orgId, isArchived: false, trackInventory: true })
    ]);

    let lowStockCount = 0;
    let totalInventoryValue = 0;

    trackedItems.forEach((item) => {
      const qty = item.stockQuantity || 0;
      totalInventoryValue += qty * (item.unitPrice || 0);
      if (qty <= (item.lowStockThreshold || 5)) {
        lowStockCount++;
      }
    });

    const categories = await Product.distinct('category', { organizationId: orgId, isArchived: false });

    return ApiResponse.success(res, 'Catalog stats fetched', {
      totalItems,
      productsCount,
      servicesCount,
      activeCount,
      lowStockCount,
      totalInventoryValue: Math.round(totalInventoryValue),
      categories: categories.filter(Boolean)
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// QUICK SEARCH FOR AUTOCOMPLETE (Quotes / Invoices / Deals)
// GET /api/v1/products/search
// ============================================================
const quickSearch = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { q } = req.query;

    const filter = { organizationId: orgId, isArchived: false, isActive: true };

    if (q && q.trim()) {
      filter.$or = [
        { name: { $regex: q.trim(), $options: 'i' } },
        { sku: { $regex: q.trim(), $options: 'i' } },
        { category: { $regex: q.trim(), $options: 'i' } }
      ];
    }

    const items = await Product.find(filter)
      .select('name sku type category unit unitPrice taxRate hsnSacCode trackInventory stockQuantity')
      .limit(25)
      .sort({ name: 1 });

    return ApiResponse.success(res, 'Search results', items);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET PRODUCT BY ID
// GET /api/v1/products/:id
// ============================================================
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ _id: id, organizationId: req.organizationId });

    if (!product) {
      return ApiResponse.error(res, 'Item not found in catalog', 404);
    }

    return ApiResponse.success(res, 'Item fetched', product);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CREATE PRODUCT / SERVICE
// POST /api/v1/products
// ============================================================
const createProduct = async (req, res, next) => {
  try {
    const data = createProductSchema.parse(req.body);
    const orgId = req.organizationId;

    let sku = data.sku && data.sku.trim()
      ? data.sku.trim().toUpperCase()
      : await generateSKU(orgId, data.type);

    // Duplicate check
    const existing = await Product.findOne({ organizationId: orgId, sku });
    if (existing) {
      return ApiResponse.error(res, `An item with SKU "${sku}" already exists.`, 400);
    }

    const product = await Product.create({
      organizationId: orgId,
      ...data,
      sku
    });

    await logAudit({
      organizationId: orgId,
      action: 'PRODUCT_CREATED',
      entity: 'Product',
      entityId: product._id,
      details: { name: product.name, sku: product.sku, type: product.type, price: product.unitPrice },
      req
    });

    return ApiResponse.created(res, `${product.type} created successfully`, product);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE PRODUCT / SERVICE
// PUT /api/v1/products/:id
// ============================================================
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ _id: id, organizationId: req.organizationId });

    if (!product) {
      return ApiResponse.error(res, 'Item not found', 404);
    }

    if (req.body.sku && req.body.sku.trim().toUpperCase() !== product.sku) {
      const skuCandidate = req.body.sku.trim().toUpperCase();
      const existing = await Product.findOne({
        organizationId: req.organizationId,
        _id: { $ne: id },
        sku: skuCandidate
      });
      if (existing) {
        return ApiResponse.error(res, `Another item with SKU "${skuCandidate}" already exists.`, 400);
      }
      product.sku = skuCandidate;
    }

    const allowedFields = [
      'name', 'type', 'description', 'category', 'unit',
      'unitPrice', 'costPrice', 'currency', 'taxRate', 'hsnSacCode',
      'trackInventory', 'stockQuantity', 'lowStockThreshold', 'isActive', 'tags'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    }

    await product.save();

    await logAudit({
      organizationId: req.organizationId,
      action: 'PRODUCT_UPDATED',
      entity: 'Product',
      entityId: product._id,
      details: { name: product.name, sku: product.sku },
      req
    });

    return ApiResponse.success(res, 'Item updated successfully', product);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// ADJUST INVENTORY / STOCK
// PATCH /api/v1/products/:id/stock
// ============================================================
const adjustStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { change, newQuantity, reason } = req.body;

    const product = await Product.findOne({ _id: id, organizationId: req.organizationId });
    if (!product) {
      return ApiResponse.error(res, 'Item not found', 404);
    }

    if (!product.trackInventory) {
      return ApiResponse.error(res, 'Inventory tracking is disabled for this item.', 400);
    }

    const oldStock = product.stockQuantity;

    if (newQuantity !== undefined && !isNaN(Number(newQuantity))) {
      product.stockQuantity = Math.max(0, Number(newQuantity));
    } else if (change !== undefined && !isNaN(Number(change))) {
      product.stockQuantity = Math.max(0, product.stockQuantity + Number(change));
    } else {
      return ApiResponse.error(res, 'Please provide a valid change or newQuantity value', 400);
    }

    await product.save();

    await logAudit({
      organizationId: req.organizationId,
      action: 'STOCK_ADJUSTED',
      entity: 'Product',
      entityId: product._id,
      details: {
        sku: product.sku,
        name: product.name,
        oldStock,
        newStock: product.stockQuantity,
        reason: reason || 'Manual Stock Adjustment'
      },
      req
    });

    return ApiResponse.success(res, `Stock adjusted to ${product.stockQuantity} units`, product);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE / ARCHIVE PRODUCT
// DELETE /api/v1/products/:id
// ============================================================
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ _id: id, organizationId: req.organizationId });

    if (!product) {
      return ApiResponse.error(res, 'Item not found', 404);
    }

    product.isArchived = true;
    await product.save();

    await logAudit({
      organizationId: req.organizationId,
      action: 'PRODUCT_ARCHIVED',
      entity: 'Product',
      entityId: product._id,
      details: { sku: product.sku, name: product.name },
      req
    });

    return ApiResponse.success(res, 'Item archived successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductStats,
  quickSearch,
  getProductById,
  createProduct,
  updateProduct,
  adjustStock,
  deleteProduct
};
