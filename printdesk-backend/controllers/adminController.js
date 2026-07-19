const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const Business = require("../models/Business");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const { generateInvoicePdf, PAGE_WIDTH_PT } = require("../utils/invoicePdfTemplate");
const { parsePagination } = require("../utils/pagination");
const { getStartOfMonth } = require("../utils/invoiceHelpers");

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
    const { page, limit, skip } = parsePagination(req.query);

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

    const startOfMonth = getStartOfMonth();

    const usersWithUsage = await Promise.all(
      users.map(async (user) => {
        const u = user.toObject();
        const plan = (u.plan || "free").toLowerCase();
        const overrideLimit = typeof u.invoiceLimit === "number" ? u.invoiceLimit : null;

        if (plan === "pro") {
          const used = await Invoice.countDocuments({
            businessId: u._id,
            createdAt: { $gte: startOfMonth },
          });
          u.usageUsed = used;
          u.usageLimit = null;
          u.usageRemaining = null;
        } else if (plan === "basic") {
          const used = await Invoice.countDocuments({
            businessId: u._id,
            createdAt: { $gte: startOfMonth },
          });
          const limit = overrideLimit ?? 200;
          u.usageUsed = used;
          u.usageLimit = limit;
          u.usageRemaining = Math.max(limit - used, 0);
        } else {
          const used = await Invoice.countDocuments({ businessId: u._id });
          const limit = overrideLimit ?? 30;
          u.usageUsed = used;
          u.usageLimit = limit;
          u.usageRemaining = Math.max(limit - used, 0);
        }

        return u;
      })
    );

    res.json({
      users: usersWithUsage,
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
    const { page, limit, skip } = parsePagination(req.query);

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
    const { paymentMode } = req.body;
    const update = { status: "Paid", paidAt: new Date() };
    if (paymentMode) {
      update.paymentMode = paymentMode;
    }

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      update,
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

// ======================================
// DOWNLOAD ALL PAYMENTS PDF (all businesses)
// ======================================
exports.downloadAllPaymentsPdf = async (req, res) => {
  try {
    const activeInvoiceIds = await Invoice.find({ isDeleted: false }).distinct("_id");
    const payments = await Payment.find({
      $or: [
        { invoiceId: null },
        { invoiceId: { $in: activeInvoiceIds } },
      ],
    })
      .populate("invoiceId", "invoiceNumber customerName")
      .populate("businessId", "businessName")
      .sort({ createdAt: -1 });

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=all-payments.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    let y = 50;

    doc
      .fontSize(18)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("Billora", 50, y, { continued: false });

    doc
      .fontSize(10)
      .fillColor("#555555")
      .text("All Payments Report", 50, y + 22);

    y += 80;
    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor("#cccccc")
      .stroke();
    y += 20;

    doc
      .fontSize(14)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("Payment History", 50, y);
    y += 25;

    const totalAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#000000")
      .text(`Total Payments: ${payments.length}  |  Total Amount: Rs. ${Number(totalAmount).toLocaleString("en-IN")}`, 50, y);
    y += 25;

    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor("#cccccc")
      .stroke();
    y += 20;

    if (payments.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#555555")
        .text("No payments found.", 50, y);
      doc.end();
      return;
    }

    const columns = [
      { label: "#", x: 50, width: 25, align: "left" },
      { label: "Date", x: 75, width: 75, align: "left" },
      { label: "Business", x: 155, width: 100, align: "left" },
      { label: "Type", x: 260, width: 60, align: "left" },
      { label: "Amount", x: 325, width: 60, align: "right" },
      { label: "Invoice", x: 390, width: 70, align: "left" },
      { label: "Status", x: 465, width: 45, align: "left" },
    ];

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

    const maxY = doc.page.height - 80;

    payments.forEach((p, index) => {
      if (y > maxY) {
        doc.addPage();
        y = 60;

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
        p.createdAt
          ? new Date(p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          : "-",
        p.businessId ? (p.businessId.businessName || "-") : "-",
        p.type === "subscription" ? "Subscription" : "Invoice",
        `Rs. ${Number(p.amount || 0).toLocaleString("en-IN")}`,
        p.invoiceId ? (p.invoiceId.invoiceNumber || "-") : "-",
        p.status || "-",
      ];

      columns.forEach((col, i) => {
        doc.text(rowData[i], col.x, y, {
          width: col.width,
          align: col.align,
          ellipsis: true,
        });
      });

      y += 20;

      doc
        .moveTo(50, y - 5)
        .lineTo(545, y - 5)
        .strokeColor("#eeeeee")
        .stroke();
    });

    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor("#000000")
      .stroke();
    y += 25;

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#777777")
      .text("All payments report generated via Billora Admin Dashboard", 50, y, {
        align: "center",
        width: 495,
      });

    doc.end();
  } catch (error) {
    console.log("ALL PAYMENTS PDF ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};
exports.downloadSinglePaymentPdf = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId)
      .populate("invoiceId", "invoiceNumber customerName totalAmount")
      .populate("businessId", "businessName ownerName email phone address plan");

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const business = payment.businessId;
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    const PAGE_WIDTH_MM = 80;
    const PT_PER_MM = 2.83465;
    const PAGE_WIDTH_PT = Math.round(PAGE_WIDTH_MM * PT_PER_MM);
    const MARGIN = 20;
    const CONTENT_W = PAGE_WIDTH_PT - MARGIN * 2;

    const doc = new PDFDocument({
      size: [PAGE_WIDTH_PT, 500],
      margin: 0,
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=payment-receipt-${paymentId}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    let y = MARGIN + 4;

    // Header
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#1a2742");
    doc.text(business.businessName || "Billora", MARGIN, y, {
      width: CONTENT_W,
      align: "center",
    });
    y += 18;

    if (business.address) {
      doc.font("Helvetica").fontSize(7.5).fillColor("#64748b");
      doc.text(business.address, MARGIN, y, { width: CONTENT_W, align: "center" });
      y += doc.y - y + 2;
    }

    if (business.phone) {
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#1a2332");
      doc.text(business.phone, MARGIN, y, { width: CONTENT_W, align: "center", lineBreak: false });
      y += 12;
    }

    // Divider
    doc.save()
      .strokeColor("#cbd5e1").lineWidth(0.6)
      .dash(2.5, { space: 2 })
      .moveTo(MARGIN, y).lineTo(PAGE_WIDTH_PT - MARGIN, y).stroke()
      .undash().restore();
    y += 10;

    // Receipt badge
    const badgeW = 90;
    const badgeH = 18;
    const badgeX = (PAGE_WIDTH_PT - badgeW) / 2;
    doc.save().roundedRect(badgeX, y, badgeW, badgeH, 4).fill("#1a2742");
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
    doc.text("PAYMENT RECEIPT", badgeX, y + 5, {
      width: badgeW,
      align: "center",
      characterSpacing: 1.5,
      lineBreak: false,
    });
    doc.restore();
    y += badgeH + 14;

    // Details
    const labelX = MARGIN;
    const valueX = MARGIN + 90;
    const detailW = CONTENT_W - 90;
    const ROW_H = 16;

    function detailRow(label, value) {
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#64748b");
      doc.text(label, labelX, y, { width: 85, lineBreak: false });
      doc.font("Helvetica").fontSize(9).fillColor("#1a2332");
      doc.text(value || "-", valueX, y, { width: detailW, lineBreak: false });
      y += ROW_H;
    }

    detailRow("Receipt No", `RCPT-${payment._id.toString().slice(-8).toUpperCase()}`);
    detailRow("Date", payment.createdAt
      ? new Date(payment.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "-");
    detailRow("Time", payment.createdAt
      ? new Date(payment.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
      : "-");
    detailRow("Type", payment.type === "subscription" ? "Subscription" : "Invoice");
    if (payment.plan) {
      detailRow("Plan", payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1));
    }
    if (payment.invoiceId) {
      detailRow("Invoice No", payment.invoiceId.invoiceNumber || "-");
      detailRow("Customer", payment.invoiceId.customerName || "-");
    }
    detailRow("Payment ID", payment.razorpayPaymentId || "N/A");
    detailRow("Status", "PAID");

    y += 6;

    // Divider
    doc.save()
      .strokeColor("#cbd5e1").lineWidth(0.6)
      .moveTo(MARGIN, y).lineTo(PAGE_WIDTH_PT - MARGIN, y).stroke()
      .restore();
    y += 10;

    // Amount box
    const amtBoxH = 30;
    doc.save().roundedRect(MARGIN, y, CONTENT_W, amtBoxH, 4).fill("#1a2742");
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
    doc.text("AMOUNT PAID", MARGIN + 10, y + 5, { lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(14);
    doc.text(`Rs. ${Number(payment.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, MARGIN + 10, y + 16, { lineBreak: false });
    doc.restore();
    y += amtBoxH + 14;

    // Footer
    doc.font("Helvetica").fontSize(6.5).fillColor("#c0cad8");
    doc.text("Powered by Billora", MARGIN, y, { width: CONTENT_W, align: "center", lineBreak: false });

    doc.page.height = y + MARGIN;
    doc.end();
  } catch (error) {
    console.log("SINGLE PAYMENT PDF ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

// ======================================
// DOWNLOAD USER PAYMENTS PDF
// ======================================
exports.downloadUserPaymentsPdf = async (req, res) => {
  try {
    const { id: userId } = req.params;

    const business = await Business.findById(userId);
    if (!business || (business.role && business.role !== "user")) {
      return res.status(404).json({ message: "User not found" });
    }

    const activeInvoiceIds = await Invoice.find({
      businessId: business._id,
      isDeleted: false,
    }).distinct("_id");

    const payments = await Payment.find({
      businessId: business._id,
      $or: [
        { invoiceId: null },
        { invoiceId: { $in: activeInvoiceIds } },
      ],
    })
      .populate("invoiceId", "invoiceNumber customerName")
      .sort({ createdAt: -1 });

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=payments-${business.businessName || "business"}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    let headerY = 50;

    if (business.logoUrl) {
      const logoPath = path.join(__dirname, "..", business.logoUrl);
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 50, headerY, { width: 80 });
        } catch (e) {}
      }
    }

    doc
      .fontSize(18)
      .fillColor("#000000")
      .text(business.businessName || "Billora", 150, headerY, { continued: false });

    doc
      .fontSize(10)
      .fillColor("#555555")
      .text("Smart Billing for Growing Businesses", 150, headerY + 22);

    let y = headerY + 100;
    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor("#cccccc")
      .stroke();
    y += 20;

    doc
      .fontSize(14)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("Payment History", 50, y);
    y += 25;

    const labelX = 50;
    const valueX = 175;

    const details = [
      ["Business Name", business.businessName || "-"],
      ["Owner Name", business.ownerName || "-"],
      ["Email", business.email || "-"],
      ["Plan", (business.plan || "free").toUpperCase()],
      ["Total Payments", String(payments.length)],
    ];

    doc.font("Helvetica").fontSize(11);

    const colonX = 155;

    details.forEach(([label, value]) => {
      const startY = doc.y;
      doc
        .fillColor("#555555")
        .text(label, labelX, startY, { width: 100, lineBreak: false });
      doc
        .text(":", colonX, startY, { width: 20, lineBreak: false });
      doc
        .fillColor("#000000")
        .text(value || "-", valueX, startY, { width: 370, ellipsis: true });
      const afterValue = doc.y;
      const afterLabel = startY + doc.heightOfString(label, { width: 100 });
      doc.y = Math.max(afterLabel, afterValue) + 6;
    });

    y = doc.y + 15;

    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor("#cccccc")
      .stroke();
    y += 20;

    const totalAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#000000")
      .text(`Total Payments: ${payments.length}  |  Total Amount: Rs. ${Number(totalAmount).toLocaleString("en-IN")}`, 50, y);
    y += 25;

    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor("#cccccc")
      .stroke();
    y += 20;

    if (payments.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#555555")
        .text("No payments found for this user.", 50, y);
      doc.end();
      return;
    }

    const columns = [
      { label: "#", x: 50, width: 25, align: "left" },
      { label: "Date", x: 75, width: 80, align: "left" },
      { label: "Type", x: 160, width: 65, align: "left" },
      { label: "Amount", x: 230, width: 65, align: "right" },
      { label: "Invoice", x: 300, width: 80, align: "left" },
      { label: "Plan", x: 385, width: 55, align: "left" },
      { label: "Payment ID", x: 445, width: 100, align: "left" },
    ];

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

    const maxY = doc.page.height - 80;

    payments.forEach((p, index) => {
      if (y > maxY) {
        doc.addPage();
        y = 60;

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
        p.createdAt
          ? new Date(p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          : "-",
        p.type === "subscription" ? "Subscription" : "Invoice",
        `Rs. ${Number(p.amount || 0).toLocaleString("en-IN")}`,
        p.invoiceId ? (p.invoiceId.invoiceNumber || "-") : "-",
        p.plan ? p.plan.charAt(0).toUpperCase() + p.plan.slice(1) : "-",
        p.razorpayPaymentId || "-",
      ];

      columns.forEach((col, i) => {
        doc.text(rowData[i], col.x, y, {
          width: col.width,
          align: col.align,
          ellipsis: true,
        });
      });

      y += 20;

      doc
        .moveTo(50, y - 5)
        .lineTo(545, y - 5)
        .strokeColor("#eeeeee")
        .stroke();
    });

    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor("#000000")
      .stroke();
    y += 25;

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#777777")
      .text("Payment history generated via Billora Admin Dashboard", 50, y, {
        align: "center",
        width: 495,
      });

    doc.end();
  } catch (error) {
    console.log("PAYMENTS PDF ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

// =====================
// GET ALL PAYMENTS (Admin - all users)
// =====================
exports.getAllPayments = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const activeInvoiceIds = await Invoice.find({ isDeleted: false }).distinct("_id");

    const filter = {
      $or: [
        { invoiceId: null },
        { invoiceId: { $in: activeInvoiceIds } },
      ],
    };

    if (req.query.type && req.query.type !== "all") {
      filter.type = req.query.type;
    }

    if (req.query.userId) {
      filter.businessId = req.query.userId;
    }

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("businessId", "businessName email")
        .populate("invoiceId", "invoiceNumber customerName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    res.json({
      payments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.log("ADMIN ALL PAYMENTS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

// =====================
// GET USER PAYMENTS (Admin - single user)
// =====================
exports.getUserPayments = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const activeInvoiceIds = await Invoice.find({
      businessId: req.params.id,
      isDeleted: false,
    }).distinct("_id");

    const filter = {
      businessId: req.params.id,
      $or: [
        { invoiceId: null },
        { invoiceId: { $in: activeInvoiceIds } },
      ],
    };

    if (req.query.type && req.query.type !== "all") {
      filter.type = req.query.type;
    }

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("invoiceId", "invoiceNumber customerName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    res.json({
      payments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.log("ADMIN USER PAYMENTS ERROR:", error);
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
    y += 10;

    // Business Summary section header
    doc
      .fontSize(14)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("Business Summary", 50, y);
    y += 55;
    doc.y = y;

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

    const colonX = 155;

    details.forEach(([label, value]) => {
      const startY = doc.y;
      doc
        .fillColor("#555555")
        .text(label, labelX, startY, { width: 100, lineBreak: false });
      doc
        .text(":", colonX, startY, { width: 20, lineBreak: false });
      doc
        .fillColor("#000000")
        .text(value || "-", valueX, startY, { width: 370, ellipsis: true });
      const afterValue = doc.y;
      const afterLabel = startY + doc.heightOfString(label, { width: 100 });
      doc.y = Math.max(afterLabel, afterValue) + 6;
    });

    y = doc.y + 15;

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
      { label: "#", x: 50, width: 25, align: "left" },
      { label: "Invoice No", x: 75, width: 95, align: "left" },
      { label: "Customer", x: 175, width: 130, align: "left" },
      { label: "Status", x: 310, width: 55, align: "left" },
      { label: "Total", x: 375, width: 65, align: "right" },
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