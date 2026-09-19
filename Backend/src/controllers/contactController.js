const Contact = require('../models/Contact');
const Customer = require('../models/Customer');
const ApiResponse = require('../utils/apiResponse');

/**
 * GET /api/v1/customers/:id/contacts
 */
const getContacts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const contacts = await Contact.find({
      customerId: id,
      organizationId: req.organizationId,
      isActive: true
    }).sort({ isPrimary: -1, createdAt: 1 });

    return ApiResponse.success(res, 'Contacts fetched', contacts);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/customers/:id/contacts
 */
const createContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, secondaryPhone, designation, department, linkedIn, notes, isPrimary } = req.body;

    if (!firstName || !firstName.trim()) {
      return ApiResponse.error(res, 'First name is required', 400);
    }

    // Verify customer belongs to org
    const customer = await Customer.findOne({ _id: id, organizationId: req.organizationId });
    if (!customer) {
      return ApiResponse.error(res, 'Customer not found', 404);
    }

    // If setting as primary, unset existing primary
    if (isPrimary) {
      await Contact.updateMany({ customerId: id, organizationId: req.organizationId }, { isPrimary: false });
    }

    const contact = await Contact.create({
      customerId: id,
      organizationId: req.organizationId,
      firstName: firstName.trim(),
      lastName: lastName || '',
      email: email ? email.toLowerCase() : '',
      phone: phone || '',
      secondaryPhone: secondaryPhone || '',
      designation: designation || '',
      department: department || '',
      linkedIn: linkedIn || '',
      notes: notes || '',
      isPrimary: isPrimary || false
    });

    return ApiResponse.created(res, 'Contact added successfully', contact);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/customers/:id/contacts/:cid
 */
const updateContact = async (req, res, next) => {
  try {
    const { id, cid } = req.params;
    const contact = await Contact.findOne({ _id: cid, customerId: id, organizationId: req.organizationId });
    if (!contact) {
      return ApiResponse.error(res, 'Contact not found', 404);
    }

    const fields = ['firstName', 'lastName', 'email', 'phone', 'secondaryPhone', 'designation', 'department', 'linkedIn', 'notes'];
    fields.forEach(f => { if (req.body[f] !== undefined) contact[f] = req.body[f]; });

    await contact.save();
    return ApiResponse.success(res, 'Contact updated', contact);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/customers/:id/contacts/:cid
 */
const deleteContact = async (req, res, next) => {
  try {
    const { id, cid } = req.params;
    const contact = await Contact.findOne({ _id: cid, customerId: id, organizationId: req.organizationId });
    if (!contact) {
      return ApiResponse.error(res, 'Contact not found', 404);
    }

    contact.isActive = false;
    await contact.save();
    return ApiResponse.success(res, 'Contact removed');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/customers/:id/contacts/:cid/primary
 */
const setPrimaryContact = async (req, res, next) => {
  try {
    const { id, cid } = req.params;

    // Unset all
    await Contact.updateMany({ customerId: id, organizationId: req.organizationId }, { isPrimary: false });
    // Set this one
    const contact = await Contact.findOneAndUpdate(
      { _id: cid, customerId: id, organizationId: req.organizationId },
      { isPrimary: true },
      { new: true }
    );

    if (!contact) return ApiResponse.error(res, 'Contact not found', 404);
    return ApiResponse.success(res, `${contact.firstName} set as primary contact`, contact);
  } catch (error) {
    next(error);
  }
};

module.exports = { getContacts, createContact, updateContact, deleteContact, setPrimaryContact };
