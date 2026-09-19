const LeadNote = require('../models/LeadNote');
const Lead = require('../models/Lead');
const ApiResponse = require('../utils/apiResponse');

/**
 * GET /api/v1/leads/:id/notes
 */
const getNotes = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notes = await LeadNote.find({
      leadId: id,
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
 * POST /api/v1/leads/:id/notes
 */
const createNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, type } = req.body;

    if (!content || !content.trim()) {
      return ApiResponse.error(res, 'Note content is required', 400);
    }

    const lead = await Lead.findOne({ _id: id, organizationId: req.organizationId });
    if (!lead) {
      return ApiResponse.error(res, 'Lead not found', 404);
    }

    const note = await LeadNote.create({
      leadId:         id,
      organizationId: req.organizationId,
      content:        content.trim(),
      type:           type || 'note',
      createdBy:      req.user._id
    });

    await Lead.findByIdAndUpdate(id, { lastActivityAt: new Date() });

    const populated = await LeadNote.findById(note._id)
      .populate('createdBy', 'firstName lastName');

    return ApiResponse.created(res, 'Note added', populated);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/leads/:id/notes/:nid
 */
const deleteNote = async (req, res, next) => {
  try {
    const { id, nid } = req.params;

    const note = await LeadNote.findOne({
      _id: nid,
      leadId: id,
      organizationId: req.organizationId
    });

    if (!note) {
      return ApiResponse.error(res, 'Note not found', 404);
    }

    await LeadNote.findByIdAndDelete(nid);
    return ApiResponse.success(res, 'Note deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotes, createNote, deleteNote };
