const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const Business = require("../models/Business");
const Invoice = require("../models/Invoice");

// =====================
// GET ADMIN STATS
// =====================
exports.getAdminStats = async (req, res) => {
  try {
    // Many existing businesses may not have "role" or "plan" set yet.
    // Treat missing role as "user" and missing plan as "free" for stats.
    const baseUserQuery = {
      $or: [{ role: "user" }, { role: { $exists: false } }],
    };

    const totalUsers = await Business.countDocuments(baseUserQuery);

    const freeUsers = await Business.countDocuments({
      $and: [
        baseUserQuery,
        { $or: [{ plan: "free" }, { plan: { $exists: false } }] },
      ],
    });

    const basicUsers = await Business.countDocuments({
      $and: [baseUserQuery, { plan: "basic" }],
    });

    const proUsers = await Business.countDocuments({
      $and: [baseUserQuery, { plan: "pro" }],
    });

    const totalInvoices = await Invoice.countDocuments();

    res.json({
      totalUsers,
      freeUsers,
      basicUsers,
      proUsers,
      totalInvoices,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// =====================
// GET ALL USERS
// =====================
exports.getAllUsers = async (req, res) => {
  try {
    const baseUserQuery = {
      $or: [{ role: "user" }, { role: { $exists: false } }],
    };

    const users = await Business.find(baseUserQuery)
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// =====================
// UPDATE USER (PLAN / LIMIT / BASIC DETAILS)
// =====================
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { businessName, email, plan, invoiceLimit } = req.body;

    const user = await Business.findById(id);
    if (!user || (user.role && user.role !== "user")) {
    return res.status(404).json({ message: "User not found" });
    }
    if (businessName !== undefined) user.businessName = businessName;
    if (email !== undefined) user.email = email;
    if (plan !== undefined) user.plan = plan;
    if (invoiceLimit !== undefined) user.invoiceLimit = invoiceLimit;

    await user.save();

    const sanitized = user.toObject();
    delete sanitized.password;

    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// =====================
// DELETE USER
// =====================
exports.deleteUser = async (req, res) => {
  try {
    const user = await Business.findById(req.params.id);

   if (!user || (user.role && user.role !== "user")) {
     return res.status(404).json({ message: "User not found" });
    }
    await Invoice.deleteMany({ businessId: user._id });
    await user.deleteOne();

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// =====================
// GET USER INVOICES
// =====================
exports.getUserInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({
      businessId: req.params.id,
    })
      .sort({ createdAt: -1 });

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ======================================
// MARK INVOICE AS PAID
// Updates invoice payment status from
// "Unpaid" to "Paid"
// ======================================
exports.markInvoicePaid = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status: "Paid" },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: "Error updating status" });
  }
};

// =====================
// ADMIN DOWNLOAD USER INVOICE (SINGLE INVOICE PDF)
// =====================
exports.downloadUserInvoicePdf = async (req, res) => {
  try {
    const { id: userId, invoiceId } = req.params;

    const business = await Business.findById(userId);
    if (!business || (business.role && business.role !== "user")) {
      return res.status(404).json({ message: "User not found" });
    }

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      businessId: business._id,
      isDeleted: false,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found for this user" });
    }

    // Total active invoices for this user
    const totalUserInvoices = await Invoice.countDocuments({
      businessId: business._id,
      isDeleted: false,
    });

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    // Header with optional logo
    let headerY = 50;

    if (business.logoUrl) {
      const logoPath = path.join(__dirname, "..", business.logoUrl);
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 50, headerY, { width: 80 });
        } catch (e) {
          // ignore logo rendering errors
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

    // Business details block
    const planLabel = (business.plan || "free").toUpperCase();

    doc
      .fontSize(12)
      .fillColor("#000000")
      .text(business.businessName || "Business Name", 150, headerY + 40)
      .text(business.email || "", 150, headerY + 56)
      .text(`Plan: ${planLabel}`, 150, headerY + 72)
      .text(`Total Invoices (active): ${totalUserInvoices}`, 150, headerY + 88)
      .moveDown(2);

    // Invoice summary
    doc
      .fontSize(12)
      .text(`Invoice No: ${invoice.invoiceNumber}`)
      .text(`Customer: ${invoice.customerName}`)
      .text(`Phone: ${invoice.customerPhone || "-"}`)
      .text(`Status: ${invoice.status || "Unpaid"}`)
      .text(`Date: ${invoice.createdAt.toDateString()}`)
      .moveDown();

      // Items table 
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
     
    doc.y = position + 20;

    const subtotal = invoice.items.reduce((sum, item) => {
      return sum + Number(item.quantity) * Number(item.price);
    }, 0);

    const gstPercent = Number(invoice.gstPercent) || 0;
    const gstAmount = Number(invoice.gstAmount) || 0;
    const discount = Number(invoice.discount) || 0;
    const totalAmount = Number(invoice.totalAmount) || 0;

    doc.moveDown(2);

    doc
      .fontSize(12)
      .text(`Subtotal : ₹${subtotal}`, { align: "right" })
      .text(`GST (${gstPercent}%) : ₹${gstAmount}`, { align: "right" })
      .text(`Discount : ₹${discount}`, { align: "right" });

    doc
      .fontSize(14)
      .text(`Grand Total : ₹${totalAmount}`, {
        align: "right",
      });

    // Footer note for admin-generated copy
    doc
      .moveDown(2)
      .fontSize(9)
      .fillColor("#777777")
      .text("Generated via Billora Admin Dashboard", { align: "center" });

    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// =====================
// ADMIN DOWNLOAD FULL USER SUMMARY (BUSINESS + ALL INVOICES)
// =====================
exports.downloadUserSummaryPdf = async (req, res) => {
  try {
    const { id: userId } = req.params;

    const business = await Business.findById(userId);
    if (!business || (business.role && business.role !== "user")) {
      return res.status(404).json({ message: "User not found" });
    }

    const invoices = await Invoice.find({
      businessId: business._id,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    const totalUserInvoices = invoices.length;
    const totalRevenue = invoices.reduce(
      (sum, inv) => sum + (Number(inv.totalAmount) || 0),
      0
    );

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=user-${business.businessName || "business"}-summary.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    let headerY = 50;

    if (business.logoUrl) {
      const logoPath = path.join(__dirname, "..", business.logoUrl);
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 50, headerY, { width: 80 });
        } catch (e) {
          // ignore logo errors
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

    // Business block
    const planLabel = (business.plan || "free").toUpperCase();

    doc
      .fontSize(12)
      .fillColor("#000000")
      .text("Business Summary", 50, headerY + 60)
      .moveDown(0.5);

    doc
      .fontSize(11)
      .text(`Business Name : ${business.businessName || "-"}`)
      .text(`Owner Name    : ${business.ownerName || "-"}`)
      .text(`Email         : ${business.email || "-"}`)
      .text(`Phone         : ${business.phone || "-"}`)
      .text(`Address       : ${business.address || "-"}`)
      .text(`GST Number    : ${business.gstNumber || "-"}`)
      .text(`Plan          : ${planLabel}`)
      .text(`Invoice Limit : ${business.invoiceLimit ?? "-"}`)
      .moveDown();

    doc
      .fontSize(11)
      .text(`Total Active Invoices : ${totalUserInvoices}`)
      .text(`Total Revenue         : ₹${totalRevenue}`)
      .moveDown(1.5);

    // Invoices section
    doc
      .fontSize(12)
      .text("Invoices", { underline: true })
      .moveDown(0.5);

    if (invoices.length === 0) {
      doc.fontSize(11).text("No invoices found for this user.");
      doc.end();
      return;
    }

    const tableTop = doc.y + 5;
    const numX = 50;
    const invNoX = 80;
    const customerX = 180;
    const totalX = 340;
    const dateX = 420;

    doc
      .fontSize(11)
      .text("#", numX, tableTop)
      .text("Invoice No", invNoX, tableTop)
      .text("Customer", customerX, tableTop)
      .text("Total", totalX, tableTop)
      .text("Date", dateX, tableTop);

    let position = tableTop + 20;
    const maxY = doc.page.height - 80;

    invoices.forEach((inv, index) => {
      if (position > maxY) {
        doc.addPage();
        position = 60;
      }

      doc
        .fontSize(10)
        .text(String(index + 1), numX, position)
        .text(inv.invoiceNumber || "-", invNoX, position)
        .text(inv.customerName || "-", customerX, position, {
          width: 140,
          ellipsis: true,
        })
        .text(`₹${inv.totalAmount}`, totalX, position)
        .text(
          inv.createdAt
            ? new Date(inv.createdAt).toLocaleDateString()
            : "-",
          dateX,
          position
        );

      position += 18;
    });

    doc
      .moveDown(2)
      .fontSize(9)
      .fillColor("#777777")
      .text("User summary generated via Billora Admin Dashboard", {
        align: "center",
      });

    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};