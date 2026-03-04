const express = require("express");
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const {
  getAdminStats,
  getAllUsers,
  updateUser,
  deleteUser,
  getUserInvoices,
  downloadUserInvoicePdf,
  downloadUserSummaryPdf,
} = require("../controllers/adminController");

const router = express.Router();

router.get("/stats", protect, adminOnly, getAdminStats);
router.get("/users", protect, adminOnly, getAllUsers);
router.put("/users/:id", protect, adminOnly, updateUser);
router.delete("/users/:id", protect, adminOnly, deleteUser);
router.get("/users/:id/invoices", protect, adminOnly, getUserInvoices);
router.get(
  "/users/:id/invoices/:invoiceId/pdf",
  protect,
  adminOnly,
  downloadUserInvoicePdf
);
router.get(
  "/users/:id/summary-pdf",
  protect,
  adminOnly,
  downloadUserSummaryPdf
);

module.exports = router;