const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const Business = require("../models/Business");
const Invoice = require("../models/Invoice");
const { generateInvoicePdf, PAGE_WIDTH_PT } = require("../utils/invoicePdfTemplate");

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
// GET ALL USERS (paginated)
// =====================
exports.getAllUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const baseUserQuery = {
      $or: [{ role: "user" }, { role: { $exists: false } }],
    };

    const { search, plan, startDate, endDate } = req.query;

    if (plan && ["free", "basic", "pro"].includes(plan)) {
      baseUserQuery.plan = plan;
    }

    if (search && search.trim()) {
      const term = search.trim();
      baseUserQuery.$and = [
        {
          $or: [
            { businessName: { $regex: term, $options: "i" } },
            { email: { $regex: term, $options: "i" } },
          ],
        },
      ];
    }

    if (startDate) {
      baseUserQuery.createdAt = { ...baseUserQuery.createdAt, $gte: new Date(startDate) };
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      baseUserQuery.createdAt = { ...baseUserQuery.createdAt, $lte: end };
    }

    const [users, total] = await Promise.all([
      Business.find(baseUserQuery)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Business.countDocuments(baseUserQuery),
    ]);

    res.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
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
// GET USER INVOICES (paginated)
// =====================
exports.getUserInvoices = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = { businessId: req.params.id, isDeleted: false };

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
      .fillColor("#000000")
      .text(business.businessName || "Billora", 150, headerY, { continued: false });

    doc
      .fontSize(10)
      .fillColor("#555555")
      .text("Smart Billing for Growing Businesses", 150, headerY + 22);

    // Divider line
    let y = headerY + 100;
    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor("#cccccc")
      .stroke();
    y += 20;

    // Business Summary section header
    doc
      .fontSize(14)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("Business Summary", 50, y);
    y += 25;

    // Business details with aligned layout
    const labelX = 50;
    const valueX = 175;

    const details = [
      ["Business Name", business.businessName || "-"],
      ["Owner Name", business.ownerName || "-"],
      ["Email", business.email || "-"],
      ["Phone", business.phone || "-"],
      ["Address", business.address || "-"],
      ["GST Number", business.gstNumber || "-"],
      ["Plan", (business.plan || "free").toUpperCase()],
      ["Invoice Limit", String(business.invoiceLimit ?? "-")],
    ];

    doc.font("Helvetica").fontSize(11);

    details.forEach(([label, value], i) => {
      const rowY = y + i * 20;

      doc
        .fillColor("#555555")
        .text(`${label}:`, labelX, rowY, { width: 120, continued: false })
        .fillColor("#000000")
        .text(value, valueX, rowY, { width: 370, ellipsis: true });
    });

    y += details.length * 20 + 15;

    // Divider line
    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor("#cccccc")
      .stroke();
    y += 20;

    // Totals row
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#000000")
      .text(`Total Active Invoices: ${totalUserInvoices}`, 50, y)
      .text(`Total Revenue: Rs. ${totalRevenue}`, 320, y);
    y += 25;

    // Divider line
    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor("#cccccc")
      .stroke();
    y += 20;

    // Invoices section header
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#000000")
      .text("Invoices", 50, y);
    y += 25;

    if (invoices.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#555555")
        .text("No invoices found for this user.", 50, y);
      doc.end();
      return;
    }

    // Table column definitions
    const columns = [
      { label: "#", x: 50, width: 30, align: "left" },
      { label: "Invoice No", x: 80, width: 100, align: "left" },
      { label: "Customer", x: 180, width: 140, align: "left" },
      { label: "Status", x: 320, width: 60, align: "left" },
      { label: "Total", x: 380, width: 70, align: "right" },
      { label: "Date", x: 455, width: 90, align: "left" },
    ];

    // Table header
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#000000");

    columns.forEach((col) => {
      doc.text(col.label, col.x, y, { width: col.width, align: col.align });
    });

    y += 18;

    // Header underline
    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor("#000000")
      .stroke();
    y += 8;

    // Table rows
    const maxY = doc.page.height - 80;

    invoices.forEach((inv, index) => {
      if (y > maxY) {
        doc.addPage();
        y = 60;

        // Re-draw header on new page
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor("#000000");

        columns.forEach((col) => {
          doc.text(col.label, col.x, y, { width: col.width, align: col.align });
        });

        y += 18;
        doc
          .moveTo(50, y)
          .lineTo(545, y)
          .strokeColor("#000000")
          .stroke();
        y += 8;
      }

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#000000");

      const rowData = [
        String(index + 1),
        inv.invoiceNumber || "-",
        inv.customerName || "-",
        inv.status || "Unpaid",
        `Rs. ${Number(inv.totalAmount) || 0}`,
        inv.createdAt
          ? new Date(inv.createdAt).toLocaleDateString("en-IN")
          : "-",
      ];

      columns.forEach((col, i) => {
        doc.text(rowData[i], col.x, y, {
          width: col.width,
          align: col.align,
          ellipsis: true,
        });
      });

      y += 20;

      // Light row separator
      doc
        .moveTo(50, y - 5)
        .lineTo(545, y - 5)
        .strokeColor("#eeeeee")
        .stroke();
    });

    // Bottom border
    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor("#000000")
      .stroke();
    y += 25;

    // Footer
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#777777")
      .text("User summary generated via Billora Admin Dashboard", 50, y, {
        align: "center",
        width: 495,
      });

    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};