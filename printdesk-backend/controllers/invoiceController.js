const fs = require("fs");
const path = require("path");
const Invoice = require("../models/Invoice");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

// ======================================
// CREATE INVOICE (MULTI-ITEM)
// ======================================
exports.createInvoice = async (req, res) => {
  try {
    const { customerName, customerPhone, items } = req.body;
    const business = req.user;

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
      typeof business.invoiceLimit === "number"
        ? business.invoiceLimit
        : null;

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

    const invoiceCount = await Invoice.countDocuments({
      businessId: business._id,
      isDeleted: false,
    });

    res.setHeader("X-Business-Name", business.businessName || "");
    res.setHeader("X-Business-Email", business.email || "");
    res.setHeader("X-Business-Plan", business.plan || "");
    res.setHeader("X-Total-Invoices", invoiceCount.toString());

    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`
    );

    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    const templatePath = path.join(
      __dirname,
      "../assets/invoice.png"
    );
    if (fs.existsSync(templatePath)) {
      doc.image(templatePath, 0, 0, {
        width: 595.28,
        height: 841.89,
      });
       // =======================
  // ADD ALL PDF TEXT HERE
  // =======================

 doc.fillColor("black");
doc.fontSize(12);

const labelX = 80;
const valueX = 220;

// Invoice Date
doc.font("Helvetica-Bold");
doc.text("Invoice Date:", labelX, 180);

doc.font("Helvetica");
doc.text(
  new Date(invoice.createdAt).toLocaleDateString(),
  valueX,
  180
);

// Invoice Number
doc.font("Helvetica-Bold");
doc.text("Invoice Number:", labelX, 210);

doc.font("Helvetica");
doc.text(invoice.invoiceNumber, valueX, 210);

// Customer Name
doc.font("Helvetica-Bold");
doc.text("Customer Name:", labelX, 240);

doc.font("Helvetica");
doc.text(invoice.customerName, valueX, 240);

// Phone Number
doc.font("Helvetica-Bold");
doc.text("Phone Number:", labelX, 270);

doc.font("Helvetica");
doc.text(invoice.customerPhone || "-", valueX, 270);

  // =======================
// TABLE: ITEMS + SUBTOTAL
// =======================

        let tableX = 60;
        let tableY = 330;
        let tableWidth = 475;

        let descWidth = 220;
        let qtyWidth = 70;
        let priceWidth = 90;
        let amountWidth = 95;

        let rowHeight = 30;

        // Header row
        doc.font("Helvetica-Bold");
        doc.rect(tableX, tableY, tableWidth, rowHeight).stroke();

        doc.text("Items", tableX + 10, tableY + 10);
        doc.text("Quantity", tableX + descWidth + 10, tableY + 10);
        doc.text("Price", tableX + descWidth + qtyWidth + 10, tableY + 10);
        doc.text("Amount", tableX + descWidth + qtyWidth + priceWidth + 10, tableY + 10);

        // Header vertical lines
        doc.moveTo(tableX + descWidth, tableY).lineTo(tableX + descWidth, tableY + rowHeight).stroke();
        doc.moveTo(tableX + descWidth + qtyWidth, tableY).lineTo(tableX + descWidth + qtyWidth, tableY + rowHeight).stroke();
        doc.moveTo(tableX + descWidth + qtyWidth + priceWidth, tableY).lineTo(tableX + descWidth + qtyWidth + priceWidth, tableY + rowHeight).stroke();

        let y = tableY + rowHeight;
        let subtotal = 0;

        // Item rows
        invoice.items.forEach((item) => {
          const itemTotal = Number(item.quantity) * Number(item.price);
          subtotal += itemTotal;

          doc.font("Helvetica");

          doc.rect(tableX, y, tableWidth, rowHeight).stroke();

          doc.moveTo(tableX + descWidth, y).lineTo(tableX + descWidth, y + rowHeight).stroke();
          doc.moveTo(tableX + descWidth + qtyWidth, y).lineTo(tableX + descWidth + qtyWidth, y + rowHeight).stroke();
          doc.moveTo(tableX + descWidth + qtyWidth + priceWidth, y).lineTo(tableX + descWidth + qtyWidth + priceWidth, y + rowHeight).stroke();

          doc.text(item.itemType, tableX + 10, y + 10);
          doc.text(String(item.quantity), tableX + descWidth + 20, y + 10);
          doc.text(`Rs. ${item.price}`, tableX + descWidth + qtyWidth + 10, y + 10);
          doc.text(`Rs. ${itemTotal}`, tableX + descWidth + qtyWidth + priceWidth + 10, y + 10);

          y += rowHeight;
        });

        // Subtotal row
        doc.font("Helvetica-Bold");

        doc.rect(tableX, y, tableWidth, rowHeight).stroke();

        doc.moveTo(
          tableX + descWidth + qtyWidth + priceWidth,
          y
        )
        .lineTo(
          tableX + descWidth + qtyWidth + priceWidth,
          y + rowHeight
        )
        .stroke();

        doc.text("Subtotal", tableX + 10, y + 10);
        doc.text(
          `Rs. ${subtotal}`,
          tableX + descWidth + qtyWidth + priceWidth + 10,
          y + 10
        );

        y += rowHeight;

        // Total row
        doc.rect(tableX, y, tableWidth, rowHeight).stroke();

        doc.moveTo(
          tableX + descWidth + qtyWidth + priceWidth,
          y
        )
        .lineTo(
          tableX + descWidth + qtyWidth + priceWidth,
          y + rowHeight
        )
        .stroke();

        doc.text("Total Amount", tableX + 10, y + 10);
        doc.text(
          `Rs. ${subtotal}`,
          tableX + descWidth + qtyWidth + priceWidth + 10,
          y + 10
        );
        const upiId = "yourupi@oksbi";
        const payeeName = business.businessName || "PrintDesk";
        const amount = Number(subtotal).toFixed(2);

        const upiLink = 
        `upi://pay?pa=${encodeURIComponent(upiId)}` +
        `&pn=${encodeURIComponent(payeeName)}` +
        `&am=${amount}` +
        `&cu=INR`;

        const qrImage = await QRCode.toDataURL(upiLink);

        doc.image(qrImage, 420, 650, {
          width: 100,
          height: 100,
        });

        doc.font("Helvetica-Bold");
        doc.fontSize(10);
        doc.text("Scan to Pay", 440, 755);
        } else {
          doc.fontSize(18).text("Invoice template image not found", 50, 50);
        }

        doc.end();
      } catch (error) {
        console.log("PDF ERROR:", error);
        res.status(500).json({ error: error.message });
      }
};
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

    invoice.status = "Paid";
    await invoice.save();

    res.json({ message: "Invoice marked as paid" });
  } catch (error) {
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

    res.json({ message: "Invoice deleted (soft delete)" });
  } catch (error) {
    console.log("DELETE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};