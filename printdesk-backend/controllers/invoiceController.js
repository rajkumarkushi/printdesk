const fs = require("fs");
const path = require("path");
const Invoice = require("../models/Invoice");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const { generateInvoicePdf, PAGE_WIDTH_PT } = require("../utils/invoicePdfTemplate");
const { validateInvoiceFields, getStartOfMonth, checkInvoiceLimit } = require("../utils/invoiceHelpers");
const { parsePagination } = require("../utils/pagination");

// ===============================
// COMMON CALCULATION FUNCTION
// ===============================
const calculateInvoiceTotals = (items, gstPercentInput, discountInput) => {
  const subtotal = items.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    return acc + qty * price;
  }, 0);

  const allowedGstRates = [0, 5, 12, 18, 28];

  const requestedGst = Number(gstPercentInput);
  const gstPercent = allowedGstRates.includes(requestedGst)
    ? requestedGst
    : 18;

  const gstAmount = Math.round((subtotal * gstPercent) / 100);

  const requestedDiscount = Number(discountInput);
  const discount =
    Number.isFinite(requestedDiscount) && requestedDiscount >= 0
      ? Math.min(requestedDiscount, 100)
      : 0;

  const discountAmount = Math.round((subtotal * discount) / 100);
  const totalAmount = Math.max(0, subtotal + gstAmount - discountAmount);

  return {
    subtotal,
    gstPercent,
    gstAmount,
    discount,
    totalAmount,
  };
};

// ======================================
// CREATE INVOICE
// ======================================
exports.createInvoice = async (req, res) => {
  try {
    const { customerName, customerPhone, items, gstPercent, discount } = req.body;
    const business = req.user;

    const limitError = await checkInvoiceLimit(business);
    if (limitError) {
      return res.status(403).json({ message: limitError });
    }

    const validationError = validateInvoiceFields(customerName, customerPhone, items);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const totals = calculateInvoiceTotals(items, gstPercent, discount);

    const globalInvoiceCount = await Invoice.countDocuments({
      businessId: business._id,
    });

    const invoice = await Invoice.create({
      businessId: business._id,
      invoiceNumber: `INV-${globalInvoiceCount + 1}`,
      customerName,
      customerPhone,
      items: items.map((item) => ({
        itemType: item.itemType,
        designName: item.designName,
        quantity: Number(item.quantity),
        price: Number(item.price),
      })),
      gstPercent: totals.gstPercent,
      gstAmount: totals.gstAmount,
      discount: totals.discount,
      totalAmount: totals.totalAmount,
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.log("CREATE INVOICE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};
// ======================================
// GET ALL INVOICES (paginated)
// ======================================
exports.getInvoices = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const filter = { businessId: req.user._id, isDeleted: false };

    if (req.query.search && req.query.search.trim()) {
      const search = req.query.search.trim();
      filter.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
        { invoiceNumber: { $regex: search, $options: "i" } },
      ];
    }

    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    if (req.query.startDate) {
      filter.createdAt = { ...filter.createdAt, $gte: new Date(req.query.startDate) };
    }

    if (req.query.endDate) {
      const end = new Date(req.query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { ...filter.createdAt, $lte: end };
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Invoice.countDocuments(filter),
    ]);

    res.json({
      invoices,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.log("GET INVOICES ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

// ======================================
// GET MONTHLY USAGE
// ======================================
exports.getUsage = async (req, res) => {
  try {
    const business = req.user;

    const startOfMonth = getStartOfMonth();

    const used = await Invoice.countDocuments({
      businessId: business._id,
      createdAt: { $gte: startOfMonth },
    });

    // Pro plan = always unlimited
    if (business.plan === "pro") {
      return res.json({
        plan: business.plan,
        used,
        limit: null,
        remaining: null,
      });
    }

    const overrideLimit =
      typeof business.invoiceLimit === "number" ? business.invoiceLimit : null;

    // Free plan: lifetime usage (no monthly reset)
    if (business.plan === "free") {
      const totalUsed = await Invoice.countDocuments({
        businessId: business._id,
      });
      const limitForApi = overrideLimit ?? 30;
      return res.json({
        plan: business.plan,
        used: totalUsed,
        limit: limitForApi,
        remaining: Math.max(limitForApi - totalUsed, 0),
      });
    }

    // Basic plan: monthly usage (resets every month)
    const limitForApi = overrideLimit ?? 200;

    res.json({
      plan: business.plan,
      used,
      limit: limitForApi,
      remaining: Math.max(limitForApi - used, 0),
    });
  } catch (error) {
    console.log("USAGE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

// ======================================
// GET SINGLE INVOICE
// ======================================
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      businessId: req.user._id,
      isDeleted: false,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json(invoice);
  } catch (error) {
    console.log("GET SINGLE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

// ======================================
// UPDATE INVOICE
// ======================================
exports.updateInvoice = async (req, res) => {
  try {
    const { customerName, customerPhone, items, gstPercent, discount } = req.body;

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      businessId: req.user._id,
      isDeleted: false,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const validationError = validateInvoiceFields(customerName, customerPhone, items);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const totals = calculateInvoiceTotals(items, gstPercent, discount);

    invoice.customerName = customerName;
    invoice.customerPhone = customerPhone;

    invoice.items = items.map((item) => ({
      itemType: item.itemType,
      designName: item.designName,
      quantity: Number(item.quantity),
      price: Number(item.price),
    }));

    invoice.gstPercent = totals.gstPercent;
    invoice.gstAmount = totals.gstAmount;
    invoice.discount = totals.discount;
    invoice.totalAmount = totals.totalAmount;

    await invoice.save();

    res.json({ message: "Invoice updated successfully", invoice });
  } catch (error) {
    console.log("UPDATE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

// ======================================
// DOWNLOAD INVOICE PDF
// ======================================
exports.downloadInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      businessId: req.user._id,
      isDeleted: false,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const business = req.user;

    const doc = new PDFDocument({
      size: [PAGE_WIDTH_PT, 600],
      margin: 0,
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=receipt-${invoice.invoiceNumber}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    await generateInvoicePdf(doc, invoice, business);

    doc.end();
  } catch (error) {
    console.log("PDF ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

// ======================================
// MARK INVOICE AS PAID
// ======================================
exports.markInvoicePaid = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      businessId: req.user._id,
      isDeleted: false,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const { paymentMode } = req.body;
    invoice.status = "Paid";
    invoice.paidAt = new Date();
    if (paymentMode) {
      invoice.paymentMode = paymentMode;
    }
    await invoice.save();

    res.json({ message: "Invoice marked as paid", invoice });
  } catch (error) {
    console.log("MARK PAID ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

// ======================================
// DELETE INVOICE SOFT DELETE
// ======================================
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      businessId: req.user._id,
      isDeleted: false,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    invoice.isDeleted = true;
    await invoice.save();

    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.log("DELETE INVOICE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};
