const fs = require("fs");
const path = require("path");
const Invoice = require("../models/Invoice");
const PDFDocument = require("pdfkit");

// ======================================
// CREATE INVOICE (MULTI-ITEM)
// ======================================
exports.createInvoice = async (req, res) => {
  try {
    const { customerName, customerPhone, items } = req.body;
    const business = req.user;

    // Plan-based monthly limits (admin can override per user via invoiceLimit)
    let limitForCheck;
    const overrideLimit =
      typeof business.invoiceLimit === "number"
        ? business.invoiceLimit
        : null;

    if (business.plan === "free") {
      limitForCheck = overrideLimit ?? 30;
    } else if (business.plan === "basic") {
      limitForCheck = overrideLimit ?? 200;
    } else if (business.plan === "pro") {
      // If admin sets a custom limit for pro, respect it; otherwise unlimited
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

    const totalAmount = items.reduce((acc, item) => {
      const qty = Number(item.quantity);
      const price = Number(item.price);
      return acc + qty * price;
    }, 0);

    const invoice = await Invoice.create({
      businessId: business._id,
      invoiceNumber: `INV-${invoiceCount + 1}`,
      customerName,
      customerPhone,
      items: items.map((item) => ({
        itemType: item.itemType,
        designName: item.designName,
        quantity: Number(item.quantity),
        price: Number(item.price),
      })),
      totalAmount,
    });

    res.status(201).json(invoice);

  } catch (error) {
    console.log("CREATE INVOICE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

// ======================================
// GET ALL INVOICES
// ======================================
exports.getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({
      businessId: req.user._id,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    res.json(invoices);
  } catch (error) {
    console.log("GET INVOICES ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

// ======================================
// GET MONTHLY USAGE (VERY IMPORTANT)
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
      typeof business.invoiceLimit === "number"
        ? business.invoiceLimit
        : null;

    let limitForApi;
    if (business.plan === "free") {
      limitForApi = overrideLimit ?? 30;
    } else if (business.plan === "basic") {
      limitForApi = overrideLimit ?? 200;
    } else if (business.plan === "pro") {
      // If admin sets a custom limit, expose it; otherwise unlimited
      limitForApi = overrideLimit ?? null;
    } else {
      limitForApi = overrideLimit ?? 30;
    }

    res.json({
      plan: business.plan,
      used,
      limit: limitForApi,
      remaining:
        limitForApi === null ? null : Math.max(limitForApi - used, 0),
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
    const { customerName, customerPhone, items } = req.body;

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      businessId: req.user._id,
      isDeleted: false,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const totalAmount = items.reduce((acc, item) => {
      return acc + Number(item.quantity) * Number(item.price);
    }, 0);

    invoice.customerName = customerName;
    invoice.customerPhone = customerPhone;
    invoice.items = items.map((item) => ({
      itemType: item.itemType,
      designName: item.designName,
      quantity: Number(item.quantity),
      price: Number(item.price),
    }));
    invoice.totalAmount = totalAmount;

    await invoice.save();

    res.json({ message: "Invoice updated successfully" });

  } catch (error) {
    console.log("UPDATE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};
// ======================================
// PROFESSIONAL PDF DOWNLOAD
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

    // return some metadata as custom headers so frontend can access
    const invoiceCount = await Invoice.countDocuments({
      businessId: business._id,
      isDeleted: false,
    });

    res.setHeader('X-Business-Name', business.businessName || '');
    res.setHeader('X-Business-Email', business.email || '');
    res.setHeader('X-Business-Plan', business.plan || '');
    res.setHeader('X-Total-Invoices', invoiceCount.toString());

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    // Header: Billora brand + business logo + business name
    let headerY = 50;

    if (business.logoUrl) {
      const logoPath = path.join(__dirname, "..", business.logoUrl);
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 50, headerY, { width: 80 });
        } catch (e) {
          // If image fails to load, just skip it
        }
      }
    }

    // Product branding
    doc
      .fontSize(18)
      .text("Billora", 150, headerY, { continued: false });

    doc
      .fontSize(10)
      .fillColor("#555555")
      .text("Smart Billing for Growing Businesses", 150, headerY + 22);

    // Business name just below branding
    doc
      .fontSize(12)
      .fillColor("#000000")
      .text(business.businessName || "Your Business", 150, headerY + 40)
      .moveDown(2);

    doc
      .fontSize(12)
      .text(`Invoice No: ${invoice.invoiceNumber}`)
      .text(`Customer: ${invoice.customerName}`)
      .text(`Phone: ${invoice.customerPhone || "-"}`)
      .text(`Date: ${invoice.createdAt.toDateString()}`)
      .moveDown();

    // Table Header
    const tableTop = doc.y + 10;
    const itemX = 50;
    const qtyX = 250;
    const priceX = 320;
    const totalX = 400;

    doc
      .fontSize(12)
      .text("Item", itemX, tableTop)
      .text("Qty", qtyX, tableTop)
      .text("Price", priceX, tableTop)
      .text("Total", totalX, tableTop);

    let position = tableTop + 25;

    invoice.items.forEach((item) => {
      const itemTotal = item.quantity * item.price;

      doc
        .fontSize(12)
        .text(item.itemType, itemX, position)
        .text(item.quantity.toString(), qtyX, position)
        .text(`₹${item.price}`, priceX, position)
        .text(`₹${itemTotal}`, totalX, position);

      position += 20;
    });

    doc.moveDown(2);

    doc
      .fontSize(14)
      .text(`Grand Total: ₹${invoice.totalAmount}`, {
        align: "right",
      });

    doc.end();

  } catch (error) {
    console.log("PDF ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

// ======================================
// SOFT DELETE INVOICE
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

    // Note: we do NOT decrement any usage counters here.
    res.json({ message: "Invoice deleted (soft delete)" });
  } catch (error) {
    console.log("DELETE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};
