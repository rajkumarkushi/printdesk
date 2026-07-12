const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    invoiceNumber: {
      type: String,
      required: true,
    },

    customerName: {
      type: String,
      required: true,
    },

    customerPhone: String,

    items: [
      {
        itemType: String,
        designName: String,
        quantity: Number,
        price: Number,
      },
    ],

    // GST applied as a percentage of the items subtotal.
    // Allowed rates are enforced in the controller; common Indian slabs: 0, 5, 12, 18, 28.
    gstPercent: {
      type: Number,
      default: 18,
    },

    // Computed GST amount (subtotal * gstPercent / 100). Stored so it can be
    // rendered without re-computing even if the rate is updated later.
    gstAmount: {
      type: Number,
      default: 0,
    },

    // Flat ₹ discount applied after GST.
    discount: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
    },
     status: {
      type: String,
      enum: ["Unpaid", "Paid"],
      default: "Unpaid",
    },

    paymentMode: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Netbanking", "Razorpay"],
      default: "Cash",
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    // Soft delete flag – when true, invoice is hidden in UI but still counts towards usage
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);