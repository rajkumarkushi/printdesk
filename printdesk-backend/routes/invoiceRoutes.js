const express = require("express");
const { 
  createInvoice, 
  getInvoices, 
  getUsage,
  getInvoiceById,
  updateInvoice,
  downloadInvoice,
  deleteInvoice,
  markInvoicePaid,
} = require("../controllers/invoiceController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/usage", protect, getUsage);
router.get("/:id/pdf", protect, downloadInvoice);
router.get("/:id", protect, getInvoiceById);
router.put("/:id/paid", protect, markInvoicePaid);
router.put("/:id", protect, updateInvoice);
router.delete("/:id", protect, deleteInvoice);
router.post("/", protect, createInvoice);
router.get("/", protect, getInvoices);
module.exports = router;