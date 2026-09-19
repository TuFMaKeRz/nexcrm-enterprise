const { z } = require('zod');
const Customer = require('../models/Customer');
const Contact = require('../models/Contact');
const CustomerNote = require('../models/CustomerNote');
const CustomerDocument = require('../models/CustomerDocument');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../middlewares/auditLogger');

// ── Zod schema ─────────────────────────────────────────────
const addressSchema = z.object({
  street:  z.string().optional().default(''),
  city:    z.string().optional().default(''),
  state:   z.string().optional().default(''),
  zip:     z.string().optional().default(''),
  country: z.string().optional().default('')
}).optional().default({});

const createCustomerSchema = z.object({
  companyName:     z.string().min(1, 'Company name is required'),
  industry:        z.string().optional().default(''),
  website:         z.string().optional().default(''),
  taxId:           z.string().optional().default(''),
  gstin:           z.string().optional().default(''),
  panNumber:       z.string().optional().default(''),
  billingAddress:  addressSchema,
  shippingAddress: addressSchema,
  sameAsbilling:   z.boolean().optional().default(false),
  accountManager:  z.string().optional(),
  tags:            z.array(z.string()).optional().default([])
});

// ============================================================
// GET ALL CUSTOMERS
// GET /api/v1/customers
// ============================================================
const getCustomers = async (req, res, next) => {
  try {
    const {
      search, industry, accountManager,
      page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const filter = { organizationId: req.organizationId, isArchived: false };
    if (industry)       filter.industry = { $regex: industry, $options: 'i' };
    if (accountManager) filter.accountManager = accountManager;

    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { industry:    { $regex: search, $options: 'i' } },
        { gstin:       { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .populate('accountManager', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Customer.countDocuments(filter)
    ]);

    // Enrich with contact counts
    const customerIds = customers.map(c => c._id);
    const contactCounts = await Contact.aggregate([
      { $match: { customerId: { $in: customerIds }, isActive: true } },
      { $group: { _id: '$customerId', count: { $sum: 1 } } }
    ]);
    const contactCountMap = {};
    contactCounts.forEach(cc => { contactCountMap[cc._id.toString()] = cc.count; });

    const enriched = customers.map(c => ({
      ...c.toJSON(),
      contactCount: contactCountMap[c._id.toString()] || 0
    }));

    return ApiResponse.success(res, 'Customers fetched', {
      customers: enriched,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET STATS
// GET /api/v1/customers/stats
// ============================================================
const getCustomerStats = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const [total, active, convertedFromLeads, industries] = await Promise.all([
      Customer.countDocuments({ organizationId: orgId, isArchived: false }),
      Customer.countDocuments({ organizationId: orgId, isArchived: false, isActive: true }),
      Customer.countDocuments({ organizationId: orgId, convertedFromLead: { $ne: null } }),
      Customer.distinct('industry', { organizationId: orgId, isArchived: false })
    ]);

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const newThisMonth = await Customer.countDocuments({
      organizationId: orgId,
      createdAt: { $gte: startOfMonth },
      isArchived: false
    });

    return ApiResponse.success(res, 'Customer stats fetched', {
      total,
      active,
      newThisMonth,
      convertedFromLeads,
      industriesCount: industries.filter(Boolean).length
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CREATE CUSTOMER
// POST /api/v1/customers
// ============================================================
const createCustomer = async (req, res, next) => {
  try {
    const data = createCustomerSchema.parse(req.body);

    // Duplicate check within org
    const existing = await Customer.findOne({
      organizationId: req.organizationId,
      companyName: { $regex: new RegExp(`^${data.companyName.trim()}$`, 'i') },
      isArchived: false
    });
    if (existing) {
      return ApiResponse.error(res, `A customer named "${data.companyName}" already exists.`, 400);
    }

    const customer = await Customer.create({
      organizationId: req.organizationId,
      ...data,
      accountManager: data.accountManager || null
    });

    // Create primary contact if provided
    let createdContact = null;
    if (req.body.primaryContact && req.body.primaryContact.firstName) {
      createdContact = await Contact.create({
        customerId: customer._id,
        organizationId: req.organizationId,
        firstName: req.body.primaryContact.firstName,
        lastName: req.body.primaryContact.lastName || '',
        email: req.body.primaryContact.email || '',
        phone: req.body.primaryContact.phone || '',
        designation: req.body.primaryContact.designation || '',
        department: req.body.primaryContact.department || '',
        isPrimary: true
      });
    }

    // System note
    await CustomerNote.create({
      customerId: customer._id,
      organizationId: req.organizationId,
      content: `Customer account "${customer.companyName}" created.`,
      type: 'system',
      createdBy: req.user._id
    });

    await logAudit({
      organizationId: req.organizationId,
      action: 'CUSTOMER_CREATED',
      entity: 'Customer',
      entityId: customer._id,
      details: { companyName: customer.companyName },
      req
    });

    const populated = await Customer.findById(customer._id)
      .populate('accountManager', 'firstName lastName email');

    return ApiResponse.created(res, 'Customer account created successfully', populated);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET CUSTOMER BY ID (360° View Bundle)
// GET /api/v1/customers/:id
// ============================================================
const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findOne({ _id: id, organizationId: req.organizationId })
      .populate('accountManager', 'firstName lastName email phone department')
      .populate('convertedFromLead', 'firstName lastName email phone score temperature');

    if (!customer) {
      return ApiResponse.error(res, 'Customer not found', 404);
    }

    // Fetch associated sub-resources for 360 view
    const [contacts, notes, documents] = await Promise.all([
      Contact.find({ customerId: id, organizationId: req.organizationId }).sort({ isPrimary: -1, createdAt: -1 }),
      CustomerNote.find({ customerId: id, organizationId: req.organizationId }).populate('createdBy', 'firstName lastName avatar email').sort({ createdAt: -1 }),
      CustomerDocument.find({ customerId: id, organizationId: req.organizationId }).populate('uploadedBy', 'firstName lastName').sort({ createdAt: -1 })
    ]);

    return ApiResponse.success(res, 'Customer 360 bundle fetched', {
      customer,
      contacts,
      notes,
      documents
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE CUSTOMER
// PUT /api/v1/customers/:id
// ============================================================
const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findOne({ _id: id, organizationId: req.organizationId });
    if (!customer) {
      return ApiResponse.error(res, 'Customer not found', 404);
    }

    const allowedFields = [
      'companyName', 'industry', 'website', 'taxId', 'gstin', 'panNumber',
      'billingAddress', 'shippingAddress', 'sameAsbilling', 'accountManager', 'tags', 'isActive'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        customer[field] = req.body[field];
      }
    }

    await customer.save();

    const updated = await Customer.findById(customer._id)
      .populate('accountManager', 'firstName lastName email');

    await logAudit({
      organizationId: req.organizationId,
      action: 'CUSTOMER_UPDATED',
      entity: 'Customer',
      entityId: customer._id,
      details: { companyName: customer.companyName },
      req
    });

    return ApiResponse.success(res, 'Customer updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE (Archive) CUSTOMER
// DELETE /api/v1/customers/:id
// ============================================================
const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findOne({ _id: id, organizationId: req.organizationId });
    if (!customer) {
      return ApiResponse.error(res, 'Customer not found', 404);
    }

    customer.isArchived = true;
    await customer.save();

    await logAudit({
      organizationId: req.organizationId,
      action: 'CUSTOMER_ARCHIVED',
      entity: 'Customer',
      entityId: customer._id,
      details: { companyName: customer.companyName },
      req
    });

    return ApiResponse.success(res, 'Customer archived successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  getCustomerStats,
  createCustomer,
  getCustomerById,
  updateCustomer,
  deleteCustomer
};
