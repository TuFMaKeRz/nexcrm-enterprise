const Lead = require('../models/Lead');
const LeadSource = require('../models/LeadSource');
const LeadStatus = require('../models/LeadStatus');
const Deal = require('../models/Deal');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

// ============================================================
// BATCH LEAD IMPORT WITH COLUMN MAPPING & VALIDATION
// POST /api/v1/data/import/leads
// ============================================================
const importLeadsBatch = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const userId = req.user._id;
    const { rows = [], defaultSourceId, defaultStatusId, defaultAssignedTo } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return ApiResponse.error(res, 'No lead rows provided for import', 400);
    }

    // 1. Fetch existing sources and statuses for auto-resolution
    const [existingSources, existingStatuses, existingLeads] = await Promise.all([
      LeadSource.find({ organizationId: orgId }),
      LeadStatus.find({ organizationId: orgId }),
      Lead.find({ organizationId: orgId, isArchived: false }).select('email')
    ]);

    const existingEmailSet = new Set(
      existingLeads.map((l) => (l.email ? l.email.toLowerCase().trim() : '')).filter(Boolean)
    );

    const defaultSource = existingSources.find((s) => s.isDefault) || existingSources[0];
    const defaultStatus = existingStatuses.find((s) => s.isDefault) || existingStatuses[0];

    const validLeadsToInsert = [];
    const errors = [];
    let skippedCount = 0;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    rows.forEach((row, index) => {
      const rowNum = index + 1;
      const firstName = (row.firstName || row.name || '').trim();
      const lastName = (row.lastName || '').trim();
      const email = (row.email || '').toLowerCase().trim();
      const phone = (row.phone || '').trim();
      const company = (row.company || row.companyName || '').trim();
      const expectedValue = parseFloat(row.expectedValue || row.value || 0) || 0;
      const city = (row.city || '').trim();
      const state = (row.state || '').trim();
      const country = (row.country || 'India').trim();
      const industry = (row.industry || '').trim();
      const website = (row.website || '').trim();
      const notes = (row.notes || row.description || '').trim();

      // Check required first name
      if (!firstName) {
        errors.push({ row: rowNum, error: 'First name is required', raw: row });
        skippedCount++;
        return;
      }

      // Validate email format if provided
      if (email && !emailRegex.test(email)) {
        errors.push({ row: rowNum, error: `Invalid email format: ${email}`, raw: row });
        skippedCount++;
        return;
      }

      // Check duplicate email
      if (email && existingEmailSet.has(email)) {
        errors.push({ row: rowNum, error: `Duplicate email already exists: ${email}`, raw: row });
        skippedCount++;
        return;
      }

      // Check duplicate within the incoming batch
      if (email) {
        existingEmailSet.add(email);
      }

      // Resolve source
      let sourceId = defaultSourceId || defaultSource?._id;
      if (row.source) {
        const matchedSource = existingSources.find(
          (s) => s.name.toLowerCase() === String(row.source).toLowerCase().trim()
        );
        if (matchedSource) sourceId = matchedSource._id;
      }

      // Resolve status
      let statusId = defaultStatusId || defaultStatus?._id;
      if (row.status) {
        const matchedStatus = existingStatuses.find(
          (s) => s.name.toLowerCase() === String(row.status).toLowerCase().trim()
        );
        if (matchedStatus) statusId = matchedStatus._id;
      }

      // Calculate initial score & temperature
      let score = parseInt(row.score, 10) || 10;
      if (email) score += 20;
      if (phone) score += 20;
      if (company) score += 20;
      if (expectedValue > 100000) score += 20;
      score = Math.min(100, score);

      const temperature = score > 80 ? 'Very Hot' : score > 60 ? 'Hot' : score > 30 ? 'Warm' : 'Cold';

      validLeadsToInsert.push({
        organizationId: orgId,
        firstName,
        lastName,
        email,
        phone,
        company,
        expectedValue,
        city,
        state,
        country,
        industry,
        website,
        source: sourceId,
        status: statusId,
        assignedTo: row.assignedTo || defaultAssignedTo || userId,
        score,
        temperature,
        notes: notes ? [{ text: notes, createdBy: userId, createdAt: new Date() }] : [],
        tags: Array.isArray(row.tags) ? row.tags : (row.tags ? String(row.tags).split(',').map((t) => t.trim()) : ['Imported']),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    let insertedLeads = [];
    if (validLeadsToInsert.length > 0) {
      insertedLeads = await Lead.insertMany(validLeadsToInsert);
    }

    return ApiResponse.success(res, `Lead batch import complete. Inserted: ${insertedLeads.length}, Skipped: ${skippedCount}`, {
      insertedCount: insertedLeads.length,
      skippedCount,
      totalProcessed: rows.length,
      errors,
      insertedLeads: insertedLeads.slice(0, 5) // Return top 5 sample
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// MULTI-SELECT BULK ACTIONS (LEADS & DEALS)
// POST /api/v1/data/bulk-actions
// ============================================================
const bulkActions = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { entity = 'leads', action, ids = [], payload = {} } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return ApiResponse.error(res, 'No entity IDs provided for bulk action', 400);
    }

    let result;

    if (entity === 'leads') {
      const filter = { organizationId: orgId, _id: { $in: ids } };

      switch (action) {
        case 'assign': {
          if (!payload.assignedTo) {
            return ApiResponse.error(res, 'Target assigned user ID is required', 400);
          }
          result = await Lead.updateMany(filter, { $set: { assignedTo: payload.assignedTo } });
          break;
        }
        case 'status': {
          if (!payload.statusId) {
            return ApiResponse.error(res, 'Target status ID is required', 400);
          }
          result = await Lead.updateMany(filter, { $set: { status: payload.statusId } });
          break;
        }
        case 'tag': {
          const tags = Array.isArray(payload.tags) ? payload.tags : [payload.tags].filter(Boolean);
          if (tags.length === 0) {
            return ApiResponse.error(res, 'At least one tag is required', 400);
          }
          result = await Lead.updateMany(filter, { $addToSet: { tags: { $each: tags } } });
          break;
        }
        case 'archive':
        case 'delete': {
          result = await Lead.updateMany(filter, { $set: { isArchived: true } });
          break;
        }
        default:
          return ApiResponse.error(res, `Unsupported bulk action: ${action}`, 400);
      }
    } else if (entity === 'deals') {
      const filter = { organizationId: orgId, _id: { $in: ids } };

      switch (action) {
        case 'assign': {
          if (!payload.assignedTo) {
            return ApiResponse.error(res, 'Target assigned user ID is required', 400);
          }
          result = await Deal.updateMany(filter, { $set: { assignedTo: payload.assignedTo } });
          break;
        }
        case 'status':
        case 'stage': {
          const update = {};
          if (payload.stageId) update.stageId = payload.stageId;
          if (payload.status) update.status = payload.status;
          if (payload.probability !== undefined) update.probability = payload.probability;
          result = await Deal.updateMany(filter, { $set: update });
          break;
        }
        case 'tag': {
          const tags = Array.isArray(payload.tags) ? payload.tags : [payload.tags].filter(Boolean);
          if (tags.length === 0) {
            return ApiResponse.error(res, 'At least one tag is required', 400);
          }
          result = await Deal.updateMany(filter, { $addToSet: { tags: { $each: tags } } });
          break;
        }
        case 'archive':
        case 'delete': {
          result = await Deal.updateMany(filter, { $set: { isArchived: true } });
          break;
        }
        default:
          return ApiResponse.error(res, `Unsupported bulk action: ${action}`, 400);
      }
    } else {
      return ApiResponse.error(res, `Unsupported entity type: ${entity}`, 400);
    }

    return ApiResponse.success(res, `Bulk ${action} executed successfully on ${result.modifiedCount || result.matchedCount} ${entity}`, {
      entity,
      action,
      affectedCount: result.modifiedCount || result.matchedCount
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// FILTERED MULTI-ENTITY DATA EXPORT (CSV)
// POST /api/v1/data/export
// ============================================================
const filteredExport = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { entity = 'leads', startDate, endDate, status, assignedTo, format = 'csv' } = req.body;

    const query = { organizationId: orgId, isArchived: false };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    if (status) {
      if (entity === 'leads') query.status = status;
      else if (entity === 'deals' || entity === 'invoices') query.status = status;
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    let csvContent = '';
    const filename = `${entity}_filtered_${new Date().toISOString().split('T')[0]}.csv`;

    if (entity === 'leads') {
      const leads = await Lead.find(query)
        .populate('assignedTo', 'firstName lastName')
        .populate('source', 'name')
        .populate('status', 'name');

      const headers = ['First Name', 'Last Name', 'Company', 'Email', 'Phone', 'Source', 'Status', 'Score', 'Expected Value', 'Assigned Rep', 'Created Date'];
      const rows = leads.map((l) => [
        `"${l.firstName || ''}"`,
        `"${l.lastName || ''}"`,
        `"${l.company || ''}"`,
        `"${l.email || ''}"`,
        `"${l.phone || ''}"`,
        `"${l.source?.name || ''}"`,
        `"${l.status?.name || ''}"`,
        l.score || 0,
        l.expectedValue || 0,
        `"${l.assignedTo ? `${l.assignedTo.firstName} ${l.assignedTo.lastName}` : 'Unassigned'}"`,
        `"${new Date(l.createdAt).toLocaleDateString()}"`
      ]);

      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (entity === 'deals') {
      const deals = await Deal.find(query)
        .populate('customerId', 'name companyName')
        .populate('assignedTo', 'firstName lastName');

      const headers = ['Deal Title', 'Customer', 'Deal Value', 'Status', 'Probability %', 'Expected Close', 'Owner'];
      const rows = deals.map((d) => [
        `"${d.title || ''}"`,
        `"${d.customerId?.companyName || d.customerId?.name || ''}"`,
        d.value || 0,
        `"${d.status || ''}"`,
        d.probability || 0,
        `"${d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString() : ''}"`,
        `"${d.assignedTo ? `${d.assignedTo.firstName} ${d.assignedTo.lastName}` : ''}"`
      ]);

      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (entity === 'customers') {
      const customers = await Customer.find(query).populate('accountManager', 'firstName lastName');
      const headers = ['Company Name', 'Contact Name', 'Email', 'Phone', 'Industry', 'City', 'Account Manager'];
      const rows = customers.map((c) => [
        `"${c.companyName || ''}"`,
        `"${c.name || ''}"`,
        `"${c.email || ''}"`,
        `"${c.phone || ''}"`,
        `"${c.industry || ''}"`,
        `"${c.billingAddress?.city || ''}"`,
        `"${c.accountManager ? `${c.accountManager.firstName} ${c.accountManager.lastName}` : ''}"`
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (entity === 'invoices') {
      const invoices = await Invoice.find(query).populate('customer', 'name companyName');
      const headers = ['Invoice Number', 'Customer', 'Grand Total', 'Paid Amount', 'Balance Due', 'Status', 'Due Date'];
      const rows = invoices.map((inv) => [
        `"${inv.invoiceNumber || ''}"`,
        `"${inv.customer?.companyName || inv.customer?.name || ''}"`,
        inv.grandTotal || 0,
        inv.paidAmount || 0,
        inv.balanceDue || 0,
        `"${inv.status || ''}"`,
        `"${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : ''}"`
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    if (format === 'json') {
      return ApiResponse.success(res, 'Export data prepared', { count: rows?.length || 0 });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  importLeadsBatch,
  bulkActions,
  filteredExport
};
