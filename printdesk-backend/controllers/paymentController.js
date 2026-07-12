const crypto = require("crypto");
const axios = require("axios");
const Business = require("../models/Business");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_API = "https://api.razorpay.com/v1";

const PLAN_PRICES = {
  basic: 19900,
  pro: 39900,
};

// =====================
// CREATE RAZORPAY ORDER (Subscription)
// =====================
exports.createOrder = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!plan || !PLAN_PRICES[plan]) {
      return res.status(400).json({ message: "Invalid plan. Choose basic or pro." });
    }

    const amount = PLAN_PRICES[plan];

    const response = await axios.post(
      `${RAZORPAY_API}/orders`,
      {
        amount,
        currency: "INR",
        receipt: `rcpt_${plan}_${Date.now().toString(36)}`,
        notes: {
          userId: req.user._id.toString(),
          plan,
        },
      },
      {
        auth: {
          username: RAZORPAY_KEY_ID,
          password: RAZORPAY_KEY_SECRET,
        },
      }
    );

    const order = response.data;

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.log("CREATE ORDER ERROR:", error.response?.data || error.message);
    res.status(500).json({
      message: "Failed to create payment order",
      error: error.response?.data?.error?.description || error.message,
    });
  }
};

// =====================
// VERIFY PAYMENT & UPGRADE (Subscription)
// =====================
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const invoiceLimit = plan === "pro" ? Number.MAX_SAFE_INTEGER : 200;

    const updatedBusiness = await Business.findByIdAndUpdate(
      req.user._id,
      { plan, invoiceLimit },
      { new: true }
    );

    if (!updatedBusiness) {
      return res.status(404).json({ message: "Business not found" });
    }

    await Payment.create({
      businessId: req.user._id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      amount: PLAN_PRICES[plan],
      currency: "INR",
      type: "subscription",
      plan,
      status: "paid",
    });

    res.json({ message: `Plan upgraded to ${plan.charAt(0).toUpperCase() + plan.slice(1)}`, plan });
  } catch (error) {
    console.log("VERIFY PAYMENT ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

// =====================
// CREATE INVOICE ORDER
// =====================
exports.createInvoiceOrder = async (req, res) => {
  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ message: "Invoice ID is required" });
    }

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      businessId: req.user._id,
      isDeleted: false,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (invoice.status === "Paid") {
      return res.status(400).json({ message: "Invoice is already paid" });
    }

    const amount = invoice.totalAmount * 100;

    const response = await axios.post(
      `${RAZORPAY_API}/orders`,
      {
        amount,
        currency: "INR",
        receipt: `rcpt_inv_${invoice.invoiceNumber}_${Date.now().toString(36)}`,
        notes: {
          userId: req.user._id.toString(),
          invoiceId: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
        },
      },
      {
        auth: {
          username: RAZORPAY_KEY_ID,
          password: RAZORPAY_KEY_SECRET,
        },
      }
    );

    const order = response.data;

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
      invoiceNumber: invoice.invoiceNumber,
    });
  } catch (error) {
    console.log("CREATE INVOICE ORDER ERROR:", error.response?.data || error.message);
    res.status(500).json({
      message: "Failed to create payment order",
      error: error.response?.data?.error?.description || error.message,
    });
  }
};

// =====================
// VERIFY INVOICE PAYMENT
// =====================
exports.verifyInvoicePayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !invoiceId) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      businessId: req.user._id,
      isDeleted: false,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (invoice.status === "Paid") {
      return res.status(400).json({ message: "Invoice is already paid" });
    }

    invoice.status = "Paid";
    invoice.paymentMode = "Razorpay";
    invoice.razorpayPaymentId = razorpay_payment_id;
    invoice.paidAt = new Date();
    await invoice.save();

    await Payment.create({
      businessId: req.user._id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      amount: invoice.totalAmount,
      currency: "INR",
      type: "invoice",
      invoiceId: invoice._id,
      status: "paid",
    });

    res.json({ message: "Payment successful", invoice });
  } catch (error) {
    console.log("VERIFY INVOICE PAYMENT ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

// =====================
// GET PAYMENT HISTORY
// =====================
exports.getPaymentHistory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = { businessId: req.user._id };

    if (req.query.type && req.query.type !== "all") {
      filter.type = req.query.type;
    }

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("invoiceId", "invoiceNumber customerName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    res.json({
      payments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.log("PAYMENT HISTORY ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};
