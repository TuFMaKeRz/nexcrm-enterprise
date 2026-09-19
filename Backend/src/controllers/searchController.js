const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Contact = require('../models/Contact');
const Deal = require('../models/Deal');
const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');
const ApiResponse = require('../utils/apiResponse');

// ============================================================
// GLOBAL MULTI-ENTITY SEARCH
// GET /api/v1/search?q=...&category=all|leads|customers|deals|quotations|invoices
// ============================================================
const globalSearch = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { q = '', category = 'all', limit = 8 } = req.query;

    const trimmedQuery = q.trim();
    if (!trimmedQuery) {
      return ApiResponse.success(res, 'Search query empty', {
        query: '',
        totalResults: 0,
        results: {
          leads: [],
          customers: [],
          contacts: [],
          deals: [],
          quotations: [],
          invoices: []
        }
      });
    }

    const regex = new RegExp(trimmedQuery, 'i');
    const itemLimit = parseInt(limit, 10) || 8;

    const searchTasks = [];

    // 1. Search Leads
    if (category === 'all' || category === 'leads') {
      searchTasks.push(
        Lead.find({
          organizationId: orgId,
          isArchived: false,
          $or: [
            { firstName: regex },
            { lastName: regex },
            { company: regex },
            { email: regex },
            { phone: regex },
            { city: regex }
          ]
        })
          .select('firstName lastName company email phone status score expectedValue temperature')
          .populate('status', 'name color')
          .limit(itemLimit)
          .lean()
          .then((items) =>
            items.map((item) => ({
              id: item._id,
              type: 'lead',
              category: 'Leads',
              title: `${item.firstName} ${item.lastName || ''}`.trim(),
              subtitle: item.company || item.email || item.phone || 'Lead Account',
              details: {
                email: item.email,
                phone: item.phone,
                company: item.company,
                status: item.status?.name || 'New',
                score: item.score,
                temperature: item.temperature
              },
              link: '/leads'
            }))
          )
      );
    } else {
      searchTasks.push(Promise.resolve([]));
    }

    // 2. Search Customers
    if (category === 'all' || category === 'customers') {
      searchTasks.push(
        Customer.find({
          organizationId: orgId,
          isArchived: false,
          $or: [
            { name: regex },
            { companyName: regex },
            { email: regex },
            { phone: regex },
            { industry: regex },
            { 'billingAddress.city': regex }
          ]
        })
          .select('name companyName email phone industry billingAddress')
          .limit(itemLimit)
          .lean()
          .then((items) =>
            items.map((item) => ({
              id: item._id,
              type: 'customer',
              category: 'Customers',
              title: item.companyName || item.name,
              subtitle: `${item.industry || 'Account'} • ${item.email || item.phone || ''}`,
              details: {
                name: item.name,
                companyName: item.companyName,
                email: item.email,
                phone: item.phone,
                city: item.billingAddress?.city
              },
              link: '/customers'
            }))
          )
      );
    } else {
      searchTasks.push(Promise.resolve([]));
    }

    // 3. Search Contacts
    if (category === 'all' || category === 'customers' || category === 'contacts') {
      searchTasks.push(
        Contact.find({
          organizationId: orgId,
          isArchived: false,
          $or: [
            { name: regex },
            { email: regex },
            { phone: regex },
            { designation: regex },
            { department: regex }
          ]
        })
          .populate('customerId', 'companyName name')
          .limit(itemLimit)
          .lean()
          .then((items) =>
            items.map((item) => ({
              id: item._id,
              type: 'contact',
              category: 'Contacts',
              title: item.name,
              subtitle: `${item.designation || 'Contact'} at ${item.customerId?.companyName || item.customerId?.name || 'Customer'}`,
              details: {
                email: item.email,
                phone: item.phone,
                designation: item.designation,
                customer: item.customerId?.companyName || item.customerId?.name
              },
              link: '/customers'
            }))
          )
      );
    } else {
      searchTasks.push(Promise.resolve([]));
    }

    // 4. Search Deals
    if (category === 'all' || category === 'deals') {
      searchTasks.push(
        Deal.find({
          organizationId: orgId,
          isArchived: false,
          $or: [{ title: regex }, { winLossReason: regex }, { tags: regex }]
        })
          .populate('customerId', 'name companyName')
          .populate('assignedTo', 'firstName lastName')
          .limit(itemLimit)
          .lean()
          .then((items) =>
            items.map((item) => ({
              id: item._id,
              type: 'deal',
              category: 'Deals',
              title: item.title,
              subtitle: `₹${(item.value || 0).toLocaleString('en-IN')} • ${item.customerId?.companyName || item.customerId?.name || 'Account'}`,
              details: {
                value: item.value,
                status: item.status,
                probability: item.probability,
                customer: item.customerId?.companyName || item.customerId?.name,
                assignedTo: item.assignedTo ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}` : null
              },
              link: '/deals'
            }))
          )
      );
    } else {
      searchTasks.push(Promise.resolve([]));
    }

    // 5. Search Quotations
    if (category === 'all' || category === 'quotations') {
      searchTasks.push(
        Quotation.find({
          organizationId: orgId,
          isArchived: false,
          $or: [{ quotationNumber: regex }, { termsAndConditions: regex }]
        })
          .populate('customer', 'name companyName')
          .limit(itemLimit)
          .lean()
          .then((items) =>
            items.map((item) => ({
              id: item._id,
              type: 'quotation',
              category: 'Quotations',
              title: item.quotationNumber,
              subtitle: `₹${(item.grandTotal || 0).toLocaleString('en-IN')} • ${item.customer?.companyName || item.customer?.name || 'Customer'}`,
              details: {
                status: item.status,
                grandTotal: item.grandTotal,
                validUntil: item.validUntil
              },
              link: '/quotations'
            }))
          )
      );
    } else {
      searchTasks.push(Promise.resolve([]));
    }

    // 6. Search Invoices
    if (category === 'all' || category === 'invoices') {
      searchTasks.push(
        Invoice.find({
          organizationId: orgId,
          isArchived: false,
          $or: [{ invoiceNumber: regex }, { notes: regex }]
        })
          .populate('customer', 'name companyName')
          .limit(itemLimit)
          .lean()
          .then((items) =>
            items.map((item) => ({
              id: item._id,
              type: 'invoice',
              category: 'Invoices',
              title: item.invoiceNumber,
              subtitle: `₹${(item.grandTotal || 0).toLocaleString('en-IN')} • ${item.status}`,
              details: {
                status: item.status,
                grandTotal: item.grandTotal,
                paidAmount: item.paidAmount,
                balanceDue: item.balanceDue
              },
              link: '/invoices'
            }))
          )
      );
    } else {
      searchTasks.push(Promise.resolve([]));
    }

    const [leads, customers, contacts, deals, quotations, invoices] = await Promise.all(searchTasks);

    const flatList = [...leads, ...customers, ...contacts, ...deals, ...quotations, ...invoices];

    return ApiResponse.success(res, 'Global search results fetched', {
      query: trimmedQuery,
      totalResults: flatList.length,
      flatResults: flatList,
      grouped: {
        leads,
        customers,
        contacts,
        deals,
        quotations,
        invoices
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  globalSearch
};
