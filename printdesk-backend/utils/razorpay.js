const crypto = require("crypto");
const axios = require("axios");

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_API = "https://api.razorpay.com/v1";

const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
};

const createRazorpayOrder = async ({ amount, receipt, notes }) => {
  const response = await axios.post(
    `${RAZORPAY_API}/orders`,
    {
      amount,
      currency: "INR",
      receipt,
      notes,
    },
    {
      auth: {
        username: RAZORPAY_KEY_ID,
        password: RAZORPAY_KEY_SECRET,
      },
    }
  );

  const order = response.data;
  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: RAZORPAY_KEY_ID,
  };
};

module.exports = { verifyRazorpaySignature, createRazorpayOrder, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET };
