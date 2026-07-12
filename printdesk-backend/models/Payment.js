const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    razorpayOrderId: {
      type: String,
      required: true,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
    },

    razorpaySignature: {
      type: String,
      default: null,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    type: {
      type: String,
      enum: ["subscription", "invoice"],
      required: true,
    },

    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },

    plan: {
      type: String,
      enum: ["basic", "pro", null],
      default: null,
    },

    status: {
      type: String,
      enum: ["paid"],
      default: "paid",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
