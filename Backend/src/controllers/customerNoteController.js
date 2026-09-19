const CustomerNote = require('../models/CustomerNote');
const Customer = require('../models/Customer');
const ApiResponse = require('../utils/apiResponse');

/**
 * GET /api/v1/customers/:id/notes
 */
const getNotes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notes = await CustomerNote.find({
      customerId: id,
      organizationId: req.organizationId
    })
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, 'Notes fetched', notes);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/customers/:id/notes
 */
const createNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, type } = req.body;

    if (!content || !content.trim()) {
      return ApiResponse.error(res, 'Note content is required', 400);
    }

    const customer = await Customer.findOne({ _id: id, organizationId: req.organizationId });
    if (!customer) {
      return ApiResponse.error(res, 'Customer not found', 404);
    }

    const note = await CustomerNote.create({
      customerId: id,
      organizationId: req.organizationId,
      content: content.trim(),
      type: type || 'note',
      createdBy: req.user._id
    });

    const populated = await CustomerNote.findById(note._id).populate('createdBy', 'firstName lastName');
    return ApiResponse.created(res, 'Note added', populated);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/customers/:id/notes/:nid
 */
const deleteNote = async (req, res, next) => {
  try {
    const { id, nid } = req.params;
    const note = await CustomerNote.findOne({ _id: nid, customerId: id, organizationId: req.organizationId });
    if (!note) return ApiResponse.error(res, 'Note not found', 404);

    await CustomerNote.findByIdAndDelete(nid);
    return ApiResponse.success(res, 'Note deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotes, createNote, deleteNote };
