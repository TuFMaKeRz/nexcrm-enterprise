const express = require('express');
const router = express.Router();

const {
  getProducts,
  getProductStats,
  quickSearch,
  getProductById,
  createProduct,
  updateProduct,
  adjustStock,
  deleteProduct
} = require('../controllers/productController');
const { protect, requirePermission } = require('../middlewares/authMiddleware');
const { requireTenant } = require('../middlewares/tenantContext');
const { PERMISSIONS } = require('../utils/permissions');

router.use(protect);
router.use(requireTenant);

// Stats & Quick Search (before /:id)
router.get('/stats',            requirePermission(PERMISSIONS.PRODUCTS_VIEW),   getProductStats);
router.get('/search',           requirePermission(PERMISSIONS.PRODUCTS_VIEW),   quickSearch);

// Core CRUD
router.get('/',                 requirePermission(PERMISSIONS.PRODUCTS_VIEW),   getProducts);
router.post('/',                requirePermission(PERMISSIONS.PRODUCTS_MANAGE), createProduct);
router.get('/:id',              requirePermission(PERMISSIONS.PRODUCTS_VIEW),   getProductById);
router.put('/:id',              requirePermission(PERMISSIONS.PRODUCTS_MANAGE), updateProduct);
router.delete('/:id',           requirePermission(PERMISSIONS.PRODUCTS_MANAGE), deleteProduct);

// Stock Adjustment
router.patch('/:id/stock',      requirePermission(PERMISSIONS.PRODUCTS_MANAGE), adjustStock);

module.exports = router;
