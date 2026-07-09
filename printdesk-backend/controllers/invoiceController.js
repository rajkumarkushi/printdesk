const fs = require("fs");
const path = require("path");
const Invoice = require("../models/Invoice");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

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
    Number.isFinite(requestedDiscount) && requestedDiscount > 0
      ? Math.min(requestedDiscount, subtotal + gstAmount)
      : 0;

  const totalAmount = Math.max(0, subtotal - gstAmount - discount);

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

    let limitForCheck;
    const overrideLimit =
      typeof business.invoiceLimit === "number" ? business.invoiceLimit : null;

    if (business.plan === "free") {
      limitForCheck = overrideLimit ?? 30;
    } else if (business.plan === "basic") {
      limitForCheck = overrideLimit ?? 200;
    } else if (business.plan === "pro") {
      limitForCheck = overrideLimit ?? Number.MAX_SAFE_INTEGER;
    } else {
      limitForCheck = overrideLimit ?? 30;
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const invoiceCount = await Invoice.countDocuments({
      businessId: business._id,
      createdAt: { $gte: startOfMonth },
    });

    if (invoiceCount >= limitForCheck) {
      return res.status(403).json({
        message: "Invoice limit reached for this account.",
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "At least one item is required",
      });
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
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

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

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const used = await Invoice.countDocuments({
      businessId: business._id,
      createdAt: { $gte: startOfMonth },
    });

    const overrideLimit =
      typeof business.invoiceLimit === "number" ? business.invoiceLimit : null;

    let limitForApi;

    if (business.plan === "free") {
      limitForApi = overrideLimit ?? 30;
    } else if (business.plan === "basic") {
      limitForApi = overrideLimit ?? 200;
    } else if (business.plan === "pro") {
      limitForApi = overrideLimit ?? null;
    } else {
      limitForApi = overrideLimit ?? 30;
    }

    res.json({
      plan: business.plan,
      used,
      limit: limitForApi,
      remaining: limitForApi === null ? null : Math.max(limitForApi - used, 0),
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

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "At least one item is required",
      });
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
      size: [226, 700],
      margin: 15,
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=receipt-${invoice.invoiceNumber}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    const logoPath = path.join(__dirname, "../assets/billora.png");

    if (fs.existsSync(logoPath)) {
      doc.opacity(0.2);
      doc.image(logoPath, 38, 180, {
        width: 150,
      });
      doc.opacity(1);
    }

    let y = 20;

    const line = () => {
      doc.moveTo(15, y).lineTo(211, y).stroke();
      y += 12;
    };

    doc.font("Helvetica-Bold").fontSize(18).text("BILLORA", {
      align: "center",
    });

    y += 30;

    doc.font("Helvetica").fontSize(10);
    doc.text(`Invoice #${invoice.invoiceNumber}`, 15, y);
    y += 14;
    doc.text(new Date(invoice.createdAt).toLocaleDateString(), 15, y);

    y += 20;
    doc.text(invoice.customerName || "-", 15, y);
    y += 14;
    doc.text(invoice.customerPhone || "-", 15, y);

    y += 20;
    line();

    doc.font("Helvetica-Bold");
    doc.text("Item", 15, y);
    doc.text("Qty", 120, y);
    doc.text("Amount", 160, y);

    y += 15;
    line();

    let subtotal = 0;

    invoice.items.forEach((item) => {
      const itemTotal = Number(item.quantity) * Number(item.price);
      subtotal += itemTotal;

      doc.font("Helvetica").fontSize(10);
      doc.text(item.itemType || "-", 15, y, { width: 90 });
      doc.text(String(item.quantity), 125, y);
      doc.text(`Rs. ${itemTotal}`, 160, y);

      y += 18;
    });

    y += 5;
    line();

    const gstPercent = Number(invoice.gstPercent) || 0;
    const gstAmount = Number(invoice.gstAmount) || 0;
    const discount = Number(invoice.discount) || 0;
    const totalAmount = Number(invoice.totalAmount) || 0;

    doc.font("Helvetica").fontSize(10);

    doc.text("Subtotal", 15, y);
    doc.text(`Rs. ${subtotal}`, 155, y);

    y += 15;

    doc.text(`GST (${gstPercent}%)`, 15, y);
    doc.text(`Rs. ${gstAmount}`, 155, y);

    y += 15;

    doc.text("Discount", 15, y);
    doc.text(`Rs. ${discount}`, 155, y);

    y += 18;
    line();

    doc.font("Helvetica-Bold").fontSize(14);
    doc.text("TOTAL", 15, y);
    doc.text(`Rs. ${totalAmount}`, 145, y);

    y += 30;

    const upiId = "yourupi@oksbi";
    const payeeName = business.businessName || "Billora";
    const amount = totalAmount.toFixed(2);

    const upiLink =
      `upi://pay?pa=${encodeURIComponent(upiId)}` +
      `&pn=${encodeURIComponent(payeeName)}` +
      `&am=${amount}` +
      `&cu=INR`;

    const qrImage = await QRCode.toDataURL(upiLink);

    const qrSize = 90;
    const qrX = doc.page.width - qrSize - 15;

    doc.image(qrImage, qrX, y + 30, {
      width: qrSize,
      height: qrSize,
    });

    y += 140;
    line();

    doc.font("Helvetica-Bold").fontSize(12);
    doc.text("Thank you!", 0, y, {
      align: "center",
      width: doc.page.width,
    });

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

    invoice.status = "paid";
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