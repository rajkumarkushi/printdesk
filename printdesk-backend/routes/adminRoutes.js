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
  markInvoicePaid,
  getAllPayments,
  getUserPayments,
  downloadUserPaymentsPdf,
  downloadSinglePaymentPdf,
  downloadAllPaymentsPdf,
} = require("../controllers/adminController");

const router = express.Router();

router.get("/stats", protect, adminOnly, getAdminStats);
router.get("/users", protect, adminOnly, getAllUsers);
router.put("/users/:id", protect, adminOnly, updateUser);
router.delete("/users/:id", protect, adminOnly, deleteUser);
router.get("/users/:id/invoices", protect, adminOnly, getUserInvoices);
router.get("/users/:id/invoices/:invoiceId/pdf",
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
router.put(
  "/invoices/:id/paid",
  protect,
  adminOnly,
  markInvoicePaid
);
router.get("/payments", protect, adminOnly, getAllPayments);
router.get("/payments-all-pdf", protect, adminOnly, downloadAllPaymentsPdf);
router.get("/payments/:paymentId/pdf", protect, adminOnly, downloadSinglePaymentPdf);
router.get("/users/:id/payments", protect, adminOnly, getUserPayments);
router.get("/users/:id/payments-pdf", protect, adminOnly, downloadUserPaymentsPdf);

module.exports = router;