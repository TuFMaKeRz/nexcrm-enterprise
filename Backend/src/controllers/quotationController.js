const { z } = require('zod');
const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Organization = require('../models/Organization');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../middlewares/auditLogger');

// Helper to generate sequential Quotation Number: QT-YYYY-0001
const generateQuotationNumber = async (organizationId) => {
  const currentYear = new Date().getFullYear();
  const prefix = `QT-${currentYear}`;
  
  const count = await Quotation.countDocuments({
    organizationId,
    quotationNumber: { $regex: `^${prefix}` }
  });

  let seq = count + 1;
  let quoteCandidate = `${prefix}-${String(seq).padStart(4, '0')}`;

  let exists = await Quotation.findOne({ organizationId, quotationNumber: quoteCandidate });
  while (exists) {
    seq++;
    quoteCandidate = `${prefix}-${String(seq).padStart(4, '0')}`;
    exists = await Quotation.findOne({ organizationId, quotationNumber: quoteCandidate });
  }

  return quoteCandidate;
};

// Calculate financial totals from items array
const calculateTotals = (items = []) => {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  const computedItems = items.map((item) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const discountPct = Math.min(100, Math.max(0, Number(item.discountPercentage) || 0));
    const taxRate = Math.max(0, Number(item.taxRate) || 0);

    const lineSubtotal = qty * unitPrice;
    const lineDiscount = lineSubtotal * (discountPct / 100);
    const discountedPrice = lineSubtotal - lineDiscount;
    const lineTax = discountedPrice * (taxRate / 100);
    const lineTotal = Math.round(discountedPrice + lineTax);

    subtotal += lineSubtotal;
    discountTotal += lineDiscount;
    taxTotal += lineTax;

    return {
      ...item,
      quantity: qty,
      unitPrice,
      discountPercentage: discountPct,
      taxRate,
      total: lineTotal
    };
  });

  const grandTotal = Math.round(subtotal - discountTotal + taxTotal);

  return {
    computedItems,
    subtotal: Math.round(subtotal),
    discountTotal: Math.round(discountTotal),
    taxTotal: Math.round(taxTotal),
    grandTotal
  };
};

// ============================================================
// GET ALL QUOTATIONS
// GET /api/v1/quotations
// ============================================================
const getQuotations = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { status, customerId, search, page, limit, sort = 'createdAt' } = req.query;

    const filter = { organizationId: orgId, isArchived: false };

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (customerId && customerId !== 'all') {
      filter.customer = customerId;
    }
    if (search && search.trim()) {
      filter.$or = [
        { quotationNumber: { $regex: search.trim(), $options: 'i' } },
        { notes: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const sortOption = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

    const query = Quotation.find(filter)
      .populate('customer', 'name email phone companyName address')
      .populate('deal', 'title dealValue')
      .populate('createdBy', 'firstName lastName email')
      .populate('convertedInvoiceId', 'invoiceNumber status')
      .sort(sortOption);

    if (page && limit) {
      const skip = (Number(page) - 1) * Number(limit);
      const [items, total] = await Promise.all([
        query.skip(skip).limit(Number(limit)),
        Quotation.countDocuments(filter)
      ]);

      return ApiResponse.success(res, 'Quotations fetched', {
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
    return ApiResponse.success(res, 'Quotations fetched', { items });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET QUOTATION KPI STATS
// GET /api/v1/quotations/stats
// ============================================================
const getQuotationStats = async (req, res, next) => {
  try {
    const orgId = req.organizationId;

    const [allQuotes, approvedCount, convertedCount] = await Promise.all([
      Quotation.find({ organizationId: orgId, isArchived: false }).select('status grandTotal'),
      Quotation.countDocuments({ organizationId: orgId, isArchived: false, status: 'Approved' }),
      Quotation.countDocuments({ organizationId: orgId, isArchived: false, status: 'Converted' })
    ]);

    const totalQuotes = allQuotes.length;
    const totalPipelineValue = allQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
    const conversionRate = totalQuotes > 0 ? Math.round((convertedCount / totalQuotes) * 100) : 0;

    return ApiResponse.success(res, 'Quotation stats fetched', {
      totalQuotes,
      totalPipelineValue,
      approvedCount,
      convertedCount,
      conversionRate
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET QUOTATION BY ID
// GET /api/v1/quotations/:id
// ============================================================
const getQuotationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quote = await Quotation.findOne({ _id: id, organizationId: req.organizationId })
      .populate('customer')
      .populate('deal')
      .populate('lead')
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('assignedTo', 'firstName lastName email')
      .populate('convertedInvoiceId');

    if (!quote) {
      return ApiResponse.error(res, 'Quotation not found', 404);
    }

    // Attach organization branding details
    const org = await Organization.findById(req.organizationId);

    return ApiResponse.success(res, 'Quotation fetched', {
      quotation: quote,
      organization: org
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CREATE QUOTATION
// POST /api/v1/quotations
// ============================================================
const createQuotation = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const userId = req.user._id;
    const {
      customer, deal, lead, items = [],
      issueDate, validUntil, termsAndConditions, notes, assignedTo
    } = req.body;

    if (!customer) {
      return ApiResponse.error(res, 'Customer is required for quotation', 400);
    }
    if (!items || items.length === 0) {
      return ApiResponse.error(res, 'At least one line item is required', 400);
    }

    const quotationNumber = await generateQuotationNumber(orgId);
    const { computedItems, subtotal, discountTotal, taxTotal, grandTotal } = calculateTotals(items);

    const quotation = await Quotation.create({
      organizationId: orgId,
      quotationNumber,
      customer,
      deal: deal || undefined,
      lead: lead || undefined,
      items: computedItems,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      issueDate: issueDate || new Date(),
      validUntil: validUntil || new Date(+new Date() + 30 * 24 * 60 * 60 * 1000),
      termsAndConditions,
      notes,
      assignedTo: assignedTo || userId,
      createdBy: userId,
      status: 'Draft'
    });

    await logAudit({
      organizationId: orgId,
      action: 'QUOTATION_CREATED',
      entity: 'Quotation',
      entityId: quotation._id,
      details: { quotationNumber, grandTotal, customer },
      req
    });

    const populated = await Quotation.findById(quotation._id)
      .populate('customer', 'name email phone companyName')
      .populate('createdBy', 'firstName lastName');

    return ApiResponse.created(res, `Quotation ${quotationNumber} created successfully`, populated);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE QUOTATION
// PUT /api/v1/quotations/:id
// ============================================================
const updateQuotation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quote = await Quotation.findOne({ _id: id, organizationId: req.organizationId });

    if (!quote) {
      return ApiResponse.error(res, 'Quotation not found', 404);
    }

    if (quote.status === 'Converted') {
      return ApiResponse.error(res, 'Converted quotations cannot be modified.', 400);
    }

    const { items, customer, deal, status, issueDate, validUntil, termsAndConditions, notes, assignedTo } = req.body;

    if (items && items.length > 0) {
      const { computedItems, subtotal, discountTotal, taxTotal, grandTotal } = calculateTotals(items);
      quote.items = computedItems;
      quote.subtotal = subtotal;
      quote.discountTotal = discountTotal;
      quote.taxTotal = taxTotal;
      quote.grandTotal = grandTotal;
    }

    if (customer) quote.customer = customer;
    if (deal !== undefined) quote.deal = deal || undefined;
    if (status) quote.status = status;
    if (issueDate) quote.issueDate = issueDate;
    if (validUntil) quote.validUntil = validUntil;
    if (termsAndConditions !== undefined) quote.termsAndConditions = termsAndConditions;
    if (notes !== undefined) quote.notes = notes;
    if (assignedTo !== undefined) quote.assignedTo = assignedTo;

    await quote.save();

    await logAudit({
      organizationId: req.organizationId,
      action: 'QUOTATION_UPDATED',
      entity: 'Quotation',
      entityId: quote._id,
      details: { quotationNumber: quote.quotationNumber, grandTotal: quote.grandTotal },
      req
    });

    return ApiResponse.success(res, 'Quotation updated successfully', quote);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE STATUS (Draft / Sent / Approved / Rejected)
// PATCH /api/v1/quotations/:id/status
// ============================================================
const updateQuotationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['Draft', 'Sent', 'Approved', 'Rejected'];
    if (!allowed.includes(status)) {
      return ApiResponse.error(res, `Invalid status. Allowed: ${allowed.join(', ')}`, 400);
    }

    const quote = await Quotation.findOne({ _id: id, organizationId: req.organizationId });
    if (!quote) {
      return ApiResponse.error(res, 'Quotation not found', 404);
    }

    quote.status = status;
    await quote.save();

    await logAudit({
      organizationId: req.organizationId,
      action: 'QUOTATION_STATUS_CHANGED',
      entity: 'Quotation',
      entityId: quote._id,
      details: { quotationNumber: quote.quotationNumber, newStatus: status },
      req
    });

    return ApiResponse.success(res, `Quotation status updated to ${status}`, quote);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 1-CLICK CONVERT QUOTATION TO INVOICE
// POST /api/v1/quotations/:id/convert
// ============================================================
const convertQuotationToInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;
    const userId = req.user._id;

    const quote = await Quotation.findOne({ _id: id, organizationId: orgId });
    if (!quote) {
      return ApiResponse.error(res, 'Quotation not found', 404);
    }

    if (quote.status === 'Converted' && quote.convertedInvoiceId) {
      return ApiResponse.error(res, 'This quotation has already been converted to an invoice.', 400);
    }

    // Auto generate sequential invoice number: INV-YYYY-0001
    const currentYear = new Date().getFullYear();
    const prefix = `INV-${currentYear}`;
    const invCount = await Invoice.countDocuments({ organizationId: orgId, invoiceNumber: { $regex: `^${prefix}` } });
    let seq = invCount + 1;
    let invoiceNumber = `${prefix}-${String(seq).padStart(4, '0')}`;
    let exists = await Invoice.findOne({ organizationId: orgId, invoiceNumber });
    while (exists) {
      seq++;
      invoiceNumber = `${prefix}-${String(seq).padStart(4, '0')}`;
      exists = await Invoice.findOne({ organizationId: orgId, invoiceNumber });
    }

    // Fetch org bank details if available
    const org = await Organization.findById(orgId);
    const bankDetails = org?.bankDetails || {
      accountName: org?.name || '',
      accountNumber: '',
      bankName: '',
      ifscSwiftCode: '',
      upiId: ''
    };

    // Create Invoice
    const invoice = await Invoice.create({
      organizationId: orgId,
      invoiceNumber,
      quotation: quote._id,
      customer: quote.customer,
      deal: quote.deal || undefined,
      status: 'Unpaid',
      issueDate: new Date(),
      dueDate: new Date(+new Date() + 15 * 24 * 60 * 60 * 1000), // 15 days
      paymentTerms: 'Net 15',
      currency: quote.currency || 'INR',
      items: quote.items,
      subtotal: quote.subtotal,
      discountTotal: quote.discountTotal,
      taxTotal: quote.taxTotal,
      grandTotal: quote.grandTotal,
      paidAmount: 0,
      balanceDue: quote.grandTotal,
      bankDetails,
      termsAndConditions: quote.termsAndConditions,
      notes: quote.notes ? `Converted from Quotation ${quote.quotationNumber}. ${quote.notes}` : `Converted from Quotation ${quote.quotationNumber}`,
      createdBy: userId
    });

    // Mark Quotation as Converted
    quote.status = 'Converted';
    quote.convertedInvoiceId = invoice._id;
    await quote.save();

    await logAudit({
      organizationId: orgId,
      action: 'QUOTATION_CONVERTED_TO_INVOICE',
      entity: 'Quotation',
      entityId: quote._id,
      details: { quotationNumber: quote.quotationNumber, invoiceNumber, invoiceId: invoice._id },
      req
    });

    return ApiResponse.created(res, `Quotation converted to Invoice ${invoiceNumber} successfully`, {
      quotation: quote,
      invoice
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE / ARCHIVE QUOTATION
// DELETE /api/v1/quotations/:id
// ============================================================
const deleteQuotation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quote = await Quotation.findOne({ _id: id, organizationId: req.organizationId });

    if (!quote) {
      return ApiResponse.error(res, 'Quotation not found', 404);
    }

    quote.isArchived = true;
    await quote.save();

    await logAudit({
      organizationId: req.organizationId,
      action: 'QUOTATION_ARCHIVED',
      entity: 'Quotation',
      entityId: quote._id,
      details: { quotationNumber: quote.quotationNumber },
      req
    });

    return ApiResponse.success(res, 'Quotation archived successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQuotations,
  getQuotationStats,
  getQuotationById,
  createQuotation,
  updateQuotation,
  updateQuotationStatus,
  convertQuotationToInvoice,
  deleteQuotation
};
