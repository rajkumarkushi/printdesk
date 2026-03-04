// const Razorpay = require("razorpay");
// const crypto = require("crypto");
// const Business = require("../models/Business");

// // Create Order
// exports.createOrder = async (req, res) => {
//   try {
//     const razorpay = new Razorpay({
//       key_id: process.env.RAZORPAY_KEY_ID,
//       key_secret: process.env.RAZORPAY_KEY_SECRET,
//     });

//     const options = {
//       amount: 19900, // ₹199
//       currency: "INR",
//       receipt: `receipt_${Date.now()}`,
//     };

//     const order = await razorpay.orders.create(options);
//     res.json(order);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// // Verify Payment & Upgrade Plan
// exports.verifyPayment = async (req, res) => {
//   try {
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
//       req.body;

//     const generated_signature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(razorpay_order_id + "|" + razorpay_payment_id)
//       .digest("hex");

//     if (generated_signature !== razorpay_signature) {
//       return res.status(400).json({ message: "Invalid payment signature" });
//     }

//     // 🔥 PAYMENT VERIFIED — UPGRADE PLAN
//     await Business.findByIdAndUpdate(req.user._id, {
//       plan: "basic",
//       invoiceLimit: 9999,
//     });

//     res.json({ message: "Payment verified. Plan upgraded to Basic." });

//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };
const Business = require("../models/Business");

// MOCK UPGRADE TO BASIC (Temporary)
exports.mockUpgradeBasic = async (req, res) => {
  try {
    await Business.findByIdAndUpdate(req.user._id, {
      plan: "basic",
      invoiceLimit: 200,
    });

    res.json({ message: "Plan upgraded to Basic (Mock)" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// MOCK UPGRADE TO PRO (Temporary)
exports.mockUpgradePro = async (req, res) => {
  try {
    await Business.findByIdAndUpdate(req.user._id, {
      plan: "pro",
      invoiceLimit: Number.MAX_SAFE_INTEGER,
    });

    res.json({ message: "Plan upgraded to Pro (Mock)" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};