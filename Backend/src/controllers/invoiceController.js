const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Organization = require('../models/Organization');
const ApiResponse = require('../utils/apiResponse');
const { logAudit } = require('../middlewares/auditLogger');

// Helper to generate sequential Invoice Number: INV-YYYY-0001
const generateInvoiceNumber = async (organizationId) => {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}`;

  const count = await Invoice.countDocuments({
    organizationId,
    invoiceNumber: { $regex: `^${prefix}` }
  });

  let seq = count + 1;
  let invCandidate = `${prefix}-${String(seq).padStart(4, '0')}`;

  let exists = await Invoice.findOne({ organizationId, invoiceNumber: invCandidate });
  while (exists) {
    seq++;
    invCandidate = `${prefix}-${String(seq).padStart(4, '0')}`;
    exists = await Invoice.findOne({ organizationId, invoiceNumber: invCandidate });
  }

  return invCandidate;
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
// GET ALL INVOICES
// GET /api/v1/invoices
// ============================================================
const getInvoices = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { status, customerId, search, page, limit, sort = 'createdAt' } = req.query;

    const filter = { organizationId: orgId, isArchived: false };

    if (status && status !== 'all') {
      if (status === 'overdue') {
        filter.status = { $ne: 'Paid' };
        filter.dueDate = { $lt: new Date() };
      } else if (status === 'unpaid') {
        filter.status = 'Unpaid';
      } else if (status === 'partially_paid') {
        filter.status = 'Partially Paid';
      } else if (status === 'paid') {
        filter.status = 'Paid';
      } else {
        filter.status = status;
      }
    }

    if (customerId && customerId !== 'all') {
      filter.customer = customerId;
    }

    if (search && search.trim()) {
      filter.$or = [
        { invoiceNumber: { $regex: search.trim(), $options: 'i' } },
        { notes: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const sortOption = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

    const query = Invoice.find(filter)
      .populate('customer', 'name email phone companyName address taxId')
      .populate('deal', 'title')
      .populate('quotation', 'quotationNumber')
      .populate('createdBy', 'firstName lastName')
      .sort(sortOption);

    if (page && limit) {
      const skip = (Number(page) - 1) * Number(limit);
      const [items, total] = await Promise.all([
        query.skip(skip).limit(Number(limit)),
        Invoice.countDocuments(filter)
      ]);

      return ApiResponse.success(res, 'Invoices fetched', {
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
    return ApiResponse.success(res, 'Invoices fetched', { items });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET INVOICE KPI STATS
// GET /api/v1/invoices/stats
// ============================================================
const getInvoiceStats = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const allInvoices = await Invoice.find({ organizationId: orgId, isArchived: false })
      .select('grandTotal paidAmount balanceDue status dueDate');

    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalReceivables = 0;
    let overdueCount = 0;
    let paidCount = 0;

    const now = new Date();

    allInvoices.forEach((inv) => {
      totalInvoiced += inv.grandTotal || 0;
      totalCollected += inv.paidAmount || 0;
      totalReceivables += inv.balanceDue || 0;

      if (inv.status === 'Paid') {
        paidCount++;
      } else if (inv.dueDate && new Date(inv.dueDate) < now) {
        overdueCount++;
      }
    });

    return ApiResponse.success(res, 'Invoice stats fetched', {
      totalInvoices: allInvoices.length,
      totalInvoiced: Math.round(totalInvoiced),
      totalCollected: Math.round(totalCollected),
      totalReceivables: Math.round(totalReceivables),
      overdueCount,
      paidCount
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET INVOICE BY ID
// GET /api/v1/invoices/:id
// ============================================================
const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findOne({ _id: id, organizationId: req.organizationId })
      .populate('customer')
      .populate('deal')
      .populate('quotation')
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('payments.recordedBy', 'firstName lastName email');

    if (!invoice) {
      return ApiResponse.error(res, 'Invoice not found', 404);
    }

    const org = await Organization.findById(req.organizationId);

    return ApiResponse.success(res, 'Invoice fetched', {
      invoice,
      organization: org
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CREATE DIRECT INVOICE
// POST /api/v1/invoices
// ============================================================
const createInvoice = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const userId = req.user._id;
    const {
      customer, deal, quotation, items = [],
      issueDate, dueDate, paymentTerms, currency, bankDetails, termsAndConditions, notes
    } = req.body;

    if (!customer) {
      return ApiResponse.error(res, 'Customer is required for invoice', 400);
    }
    if (!items || items.length === 0) {
      return ApiResponse.error(res, 'At least one line item is required', 400);
    }

    const invoiceNumber = await generateInvoiceNumber(orgId);
    const { computedItems, subtotal, discountTotal, taxTotal, grandTotal } = calculateTotals(items);

    const invoice = await Invoice.create({
      organizationId: orgId,
      invoiceNumber,
      customer,
      deal: deal || undefined,
      quotation: quotation || undefined,
      items: computedItems,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      paidAmount: 0,
      balanceDue: grandTotal,
      issueDate: issueDate || new Date(),
      dueDate: dueDate || new Date(+new Date() + 15 * 24 * 60 * 60 * 1000),
      paymentTerms: paymentTerms || 'Net 15',
      currency: currency || 'INR',
      bankDetails: bankDetails || undefined,
      termsAndConditions,
      notes,
      createdBy: userId,
      status: 'Unpaid'
    });

    await logAudit({
      organizationId: orgId,
      action: 'INVOICE_CREATED',
      entity: 'Invoice',
      entityId: invoice._id,
      details: { invoiceNumber, grandTotal, customer },
      req
    });

    const populated = await Invoice.findById(invoice._id)
      .populate('customer', 'name email phone companyName')
      .populate('createdBy', 'firstName lastName');

    return ApiResponse.created(res, `Invoice ${invoiceNumber} created successfully`, populated);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// RECORD PAYMENT ON INVOICE
// POST /api/v1/invoices/:id/payments
// ============================================================
const recordPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, paymentDate, paymentMethod, referenceNumber, notes } = req.body;

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return ApiResponse.error(res, 'Payment amount must be greater than 0', 400);
    }

    const invoice = await Invoice.findOne({ _id: id, organizationId: req.organizationId });
    if (!invoice) {
      return ApiResponse.error(res, 'Invoice not found', 404);
    }

    if (invoice.balanceDue <= 0 && invoice.status === 'Paid') {
      return ApiResponse.error(res, 'This invoice is already fully paid.', 400);
    }

    // Add payment subdocument
    invoice.payments.push({
      amount: paymentAmount,
      paymentDate: paymentDate || new Date(),
      paymentMethod: paymentMethod || 'Bank Transfer',
      referenceNumber: referenceNumber || '',
      notes: notes || '',
      recordedBy: req.user._id,
      recordedAt: new Date()
    });

    invoice.paidAmount = (invoice.paidAmount || 0) + paymentAmount;
    await invoice.save(); // pre-save recalculates balanceDue and updates status!

    await logAudit({
      organizationId: req.organizationId,
      action: 'PAYMENT_RECORDED',
      entity: 'Invoice',
      entityId: invoice._id,
      details: {
        invoiceNumber: invoice.invoiceNumber,
        paymentAmount,
        newBalanceDue: invoice.balanceDue,
        status: invoice.status,
        method: paymentMethod
      },
      req
    });

    return ApiResponse.success(res, `Payment of ${paymentAmount} recorded successfully. Status: ${invoice.status}`, invoice);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE INVOICE
// PUT /api/v1/invoices/:id
// ============================================================
const updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findOne({ _id: id, organizationId: req.organizationId });

    if (!invoice) {
      return ApiResponse.error(res, 'Invoice not found', 404);
    }

    const { items, customer, deal, status, issueDate, dueDate, paymentTerms, bankDetails, termsAndConditions, notes } = req.body;

    if (items && items.length > 0) {
      const { computedItems, subtotal, discountTotal, taxTotal, grandTotal } = calculateTotals(items);
      invoice.items = computedItems;
      invoice.subtotal = subtotal;
      invoice.discountTotal = discountTotal;
      invoice.taxTotal = taxTotal;
      invoice.grandTotal = grandTotal;
    }

    if (customer) invoice.customer = customer;
    if (deal !== undefined) invoice.deal = deal || undefined;
    if (status) invoice.status = status;
    if (issueDate) invoice.issueDate = issueDate;
    if (dueDate) invoice.dueDate = dueDate;
    if (paymentTerms) invoice.paymentTerms = paymentTerms;
    if (bankDetails) invoice.bankDetails = bankDetails;
    if (termsAndConditions !== undefined) invoice.termsAndConditions = termsAndConditions;
    if (notes !== undefined) invoice.notes = notes;

    await invoice.save();

    await logAudit({
      organizationId: req.organizationId,
      action: 'INVOICE_UPDATED',
      entity: 'Invoice',
      entityId: invoice._id,
      details: { invoiceNumber: invoice.invoiceNumber, grandTotal: invoice.grandTotal },
      req
    });

    return ApiResponse.success(res, 'Invoice updated successfully', invoice);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE / ARCHIVE INVOICE
// DELETE /api/v1/invoices/:id
// ============================================================
const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findOne({ _id: id, organizationId: req.organizationId });

    if (!invoice) {
      return ApiResponse.error(res, 'Invoice not found', 404);
    }

    invoice.isArchived = true;
    await invoice.save();

    await logAudit({
      organizationId: req.organizationId,
      action: 'INVOICE_ARCHIVED',
      entity: 'Invoice',
      entityId: invoice._id,
      details: { invoiceNumber: invoice.invoiceNumber },
      req
    });

    return ApiResponse.success(res, 'Invoice archived successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInvoices,
  getInvoiceStats,
  getInvoiceById,
  createInvoice,
  recordPayment,
  updateInvoice,
  deleteInvoice
};
