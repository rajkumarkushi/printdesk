const crypto = require("crypto");
const axios = require("axios");
const Business = require("../models/Business");

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_API = "https://api.razorpay.com/v1";

const PLAN_PRICES = {
  basic: 19900,
  pro: 39900,
};

// =====================
// CREATE RAZORPAY ORDER
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
// VERIFY PAYMENT & UPGRADE
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

    res.json({ message: `Plan upgraded to ${plan.charAt(0).toUpperCase() + plan.slice(1)}`, plan });
  } catch (error) {
    console.log("VERIFY PAYMENT ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};
