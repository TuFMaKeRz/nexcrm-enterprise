const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CustomerDocument = require('../models/CustomerDocument');
const Customer = require('../models/Customer');
const ApiResponse = require('../utils/apiResponse');

// ── Multer Configuration ────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(
      __dirname,
      '..',
      'uploads',
      'documents',
      req.organizationId.toString(),
      req.params.id
    );
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/png', 'image/webp',
    'text/plain'
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not supported: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// Export middleware separately so route can use it
const uploadMiddleware = upload.single('file');

// ── Controllers ─────────────────────────────────────────────

/**
 * GET /api/v1/customers/:id/documents
 */
const getDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const docs = await CustomerDocument.find({
      customerId: id,
      organizationId: req.organizationId
    })
      .populate('uploadedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, 'Documents fetched', docs);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/customers/:id/documents  (uses multer middleware in route)
 */
const uploadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category } = req.body;

    if (!req.file) {
      return ApiResponse.error(res, 'No file uploaded', 400);
    }

    const customer = await Customer.findOne({ _id: id, organizationId: req.organizationId });
    if (!customer) {
      return ApiResponse.error(res, 'Customer not found', 404);
    }

    const doc = await CustomerDocument.create({
      customerId: id,
      organizationId: req.organizationId,
      name: name || req.file.originalname,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      category: category || 'Other',
      uploadedBy: req.user._id
    });

    const populated = await CustomerDocument.findById(doc._id).populate('uploadedBy', 'firstName lastName');
    return ApiResponse.created(res, 'Document uploaded successfully', populated);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/customers/:id/documents/:did/download
 */
const downloadDocument = async (req, res, next) => {
  try {
    const { id, did } = req.params;
    const doc = await CustomerDocument.findOne({ _id: did, customerId: id, organizationId: req.organizationId });
    if (!doc) return ApiResponse.error(res, 'Document not found', 404);

    if (!fs.existsSync(doc.filePath)) {
      return ApiResponse.error(res, 'File not found on server', 404);
    }

    res.download(doc.filePath, doc.originalName);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/customers/:id/documents/:did
 */
const deleteDocument = async (req, res, next) => {
  try {
    const { id, did } = req.params;
    const doc = await CustomerDocument.findOne({ _id: did, customerId: id, organizationId: req.organizationId });
    if (!doc) return ApiResponse.error(res, 'Document not found', 404);

    // Delete physical file
    if (fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }

    await CustomerDocument.findByIdAndDelete(did);
    return ApiResponse.success(res, 'Document deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadMiddleware, getDocuments, uploadDocument, downloadDocument, deleteDocument };
