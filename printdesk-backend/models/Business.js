const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true },
    ownerName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    gstNumber: { type: String },
    logoUrl: { type: String },

    plan: { type: String, default: "free" }, // free | basic | pro

    invoiceLimit: {
      type: Number,
      default: 30,
    },

    // 🔥 ADD THIS
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    resetPasswordToken: { type: String, default: null },
    resetPasswordExpire: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Business", businessSchema);