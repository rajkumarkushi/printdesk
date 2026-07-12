const express = require("express");
const {
  createOrder,
  verifyPayment,
  createInvoiceOrder,
  verifyInvoicePayment,
  getPaymentHistory,
} = require("../controllers/paymentController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create-order", protect, createOrder);
router.post("/verify-payment", protect, verifyPayment);
router.post("/create-invoice-order", protect, createInvoiceOrder);
router.post("/verify-invoice-payment", protect, verifyInvoicePayment);
router.get("/history", protect, getPaymentHistory);

module.exports = router;
