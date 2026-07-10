const fs = require("fs");
const path = require("path");

const PAGE_WIDTH_MM = 85;
const PT_PER_MM = 2.83465;
const PAGE_WIDTH_PT = Math.round(PAGE_WIDTH_MM * PT_PER_MM); // ~241pt
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH_PT - MARGIN * 2;

const DARK = "#1a2742";      // navy used for badge / table header / total box
const ACCENT = "#2955a3";    // mid blue used for "HOTELS", Thank You!, Visit Again
const LIGHT_BG = "#eef2f8";  // light blue-gray box background
const WHITE = "#ffffff";
const TEXT = "#1a2332";
const MUTED = "#6b7280";
const BORDER = "#d5dbe4";

function fmt(n) {
  return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function drawDashedLine(doc, y, x1 = MARGIN, x2 = PAGE_WIDTH_PT - MARGIN, color = BORDER) {
  doc.save()
    .strokeColor(color)
    .lineWidth(0.75)
    .dash(3, { space: 2.5 })
    .moveTo(x1, y)
    .lineTo(x2, y)
    .stroke()
    .undash()
    .restore();
}

function drawSolidLine(doc, y, color = DARK) {
  doc.save()
    .strokeColor(color)
    .lineWidth(1)
    .moveTo(MARGIN, y)
    .lineTo(PAGE_WIDTH_PT - MARGIN, y)
    .stroke()
    .restore();
}

// ---------- simple vector icons (drawn, not embedded images) ----------

function drawCalendarIcon(doc, x, y, size, color) {
  doc.save().strokeColor(color).lineWidth(0.9);
  doc.roundedRect(x, y + 2, size, size - 2, 1).stroke();
  doc.moveTo(x + size * 0.25, y).lineTo(x + size * 0.25, y + 4).stroke();
  doc.moveTo(x + size * 0.75, y).lineTo(x + size * 0.75, y + 4).stroke();
  doc.moveTo(x, y + size * 0.45).lineTo(x + size, y + size * 0.45).stroke();
  doc.restore();
}

function drawClockIcon(doc, x, y, size, color) {
  const cx = x + size / 2, cy = y + size / 2, r = size / 2;
  doc.save().strokeColor(color).lineWidth(0.9);
  doc.circle(cx, cy, r).stroke();
  doc.moveTo(cx, cy).lineTo(cx, cy - r * 0.55).stroke();
  doc.moveTo(cx, cy).lineTo(cx + r * 0.45, cy).stroke();
  doc.restore();
}

function drawHeartIcon(doc, x, y, size, color) {
  const w = size, h = size;
  doc.save().fillColor(color);
  doc.path(
    `M ${x + w / 2} ${y + h * 0.28}
     C ${x + w / 2} ${y}, ${x} ${y}, ${x} ${y + h * 0.32}
     C ${x} ${y + h * 0.58}, ${x + w / 2} ${y + h * 0.78}, ${x + w / 2} ${y + h}
     C ${x + w / 2} ${y + h * 0.78}, ${x + w} ${y + h * 0.58}, ${x + w} ${y + h * 0.32}
     C ${x + w} ${y}, ${x + w / 2} ${y}, ${x + w / 2} ${y + h * 0.28} Z`
  ).fill();
  doc.restore();
}

// ---------- main template ----------

async function generateInvoicePdf(doc, invoice, business) {
  let y = MARGIN;

  // ========== BUSINESS NAME ==========
  doc.font("Helvetica-Bold").fontSize(21).fillColor(TEXT);
  doc.text((business.businessName || "Business").toUpperCase(), MARGIN, y, {
    width: CONTENT_WIDTH,
    align: "center",
    characterSpacing: 3,
  });
  y = doc.y + 3;

  // ========== SUBTITLE (— HOTELS —) ==========
  if (business.tagline || business.businessType) {
    const sub = (business.tagline || business.businessType).toUpperCase();
    doc.font("Helvetica").fontSize(10).fillColor(ACCENT);
    doc.text(`\u2014 ${sub} \u2014`, MARGIN, y, {
      width: CONTENT_WIDTH,
      align: "center",
      characterSpacing: 2,
    });
    y = doc.y + 6;
  }

  // ========== ADDRESS ==========
  if (business.address) {
    doc.font("Helvetica").fontSize(8).fillColor(MUTED);
    doc.text(business.address, MARGIN, y, {
      width: CONTENT_WIDTH,
      align: "center",
    });
    y = doc.y + 3;
  }

  // ========== BUSINESS PHONE ==========
  if (business.phone) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(TEXT);
    doc.text(business.phone, MARGIN, y, {
      width: CONTENT_WIDTH,
      align: "center",
    });
    y = doc.y + 5;
  }

  // ========== DASHED LINE ==========
  drawDashedLine(doc, y);
  y += 10;

  // ========== INVOICE BADGE ==========
  const badgeW = 90;
  const badgeX = (PAGE_WIDTH_PT - badgeW) / 2;
  doc.save().roundedRect(badgeX, y, badgeW, 22, 4).fill(DARK).restore();
  doc.font("Helvetica-Bold").fontSize(10).fillColor(WHITE);
  doc.text("INVOICE", badgeX, y + 6, { width: badgeW, align: "center", characterSpacing: 1.5 });
  y += 32;

  // ========== DATE | TIME ROW ==========
  const cols = 2;
  const colW = CONTENT_WIDTH / cols;
  const invoiceDateObj = invoice.createdAt ? new Date(invoice.createdAt) : null;
  const invoiceDate = invoiceDateObj ? invoiceDateObj.toLocaleDateString("en-IN") : "-";
  const invoiceTime = invoiceDateObj
    ? invoiceDateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    : "-";

  const rowData = [
    { label: "DATE", value: invoiceDate, icon: drawCalendarIcon },
    { label: "TIME", value: invoiceTime, icon: drawClockIcon },
  ];

  const iconSize = 9;
  rowData.forEach((col, i) => {
    const colX = MARGIN + colW * i;
    const labelText = col.label;
    doc.font("Helvetica-Bold").fontSize(7);
    const labelW = doc.widthOfString(labelText, { characterSpacing: 0.5 });
    const groupW = iconSize + 4 + labelW;
    const groupX = colX + (colW - groupW) / 2;

    col.icon(doc, groupX, y + 1, iconSize, ACCENT);
    doc.fillColor(MUTED).text(labelText, groupX + iconSize + 4, y, { lineBreak: false, characterSpacing: 0.5 });

    doc.font("Helvetica").fontSize(9).fillColor(TEXT);
    doc.text(col.value, colX, y + 13, { width: colW, align: "center" });
  });
  y += 32;

  // ========== DASHED LINE ==========
  drawDashedLine(doc, y);
  y += 10;

  // ========== DETAILS BOX ==========
  const boxH = 54;
  doc.save().roundedRect(MARGIN, y, CONTENT_WIDTH, boxH, 5).fill(LIGHT_BG).restore();

  const boxPad = 9;
  const boxInnerW = (CONTENT_WIDTH - boxPad * 3) / 2;
  const leftX = MARGIN + boxPad;
  const rightX = MARGIN + boxPad + boxInnerW + boxPad;
  let boxY = y + boxPad;

  // Left column
  doc.font("Helvetica-Bold").fontSize(7).fillColor(ACCENT);
  doc.text("RECEIPT NO", leftX, boxY, { width: boxInnerW, characterSpacing: 0.3 });
  boxY += 11;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(TEXT);
  doc.text(invoice.invoiceNumber || "-", leftX, boxY, { width: boxInnerW });
  boxY += 17;

  doc.font("Helvetica-Bold").fontSize(7).fillColor(ACCENT);
  doc.text("PAYMENT MODE", leftX, boxY, { width: boxInnerW, characterSpacing: 0.3 });
  boxY += 11;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(TEXT);
  doc.text(invoice.status || "Unpaid", leftX, boxY, { width: boxInnerW });

  // Right column
  let rightBoxY = y + boxPad;
  doc.font("Helvetica-Bold").fontSize(7).fillColor(ACCENT);
  doc.text("CUSTOMER", rightX, rightBoxY, { width: boxInnerW, characterSpacing: 0.3 });
  rightBoxY += 11;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(TEXT);
  doc.text(invoice.customerName || "-", rightX, rightBoxY, { width: boxInnerW, ellipsis: true });
  rightBoxY += 17;

  doc.font("Helvetica-Bold").fontSize(7).fillColor(ACCENT);
  doc.text("PHONE", rightX, rightBoxY, { width: boxInnerW, characterSpacing: 0.3 });
  rightBoxY += 11;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(TEXT);
  doc.text(invoice.customerPhone || "-", rightX, rightBoxY, { width: boxInnerW, ellipsis: true });

  y += boxH + 12;

  // ========== ITEMS TABLE HEADER ==========
  const hdrH = 20;
  doc.save().roundedRect(MARGIN, y, CONTENT_WIDTH, hdrH, 3).fill(DARK).restore();

  const itemColX = MARGIN + 8;
  const qtyColX = MARGIN + CONTENT_WIDTH * 0.5;
  const rateColX = MARGIN + CONTENT_WIDTH * 0.64;
  const amtColX = MARGIN + CONTENT_WIDTH * 0.8;
  const itemColW = qtyColX - itemColX - 4;
  const qtyW = rateColX - qtyColX - 4;
  const rateW = amtColX - rateColX - 4;
  const amtW = CONTENT_WIDTH - (amtColX - MARGIN) - 8;

  doc.font("Helvetica-Bold").fontSize(7).fillColor(WHITE);
  doc.text("ITEM", itemColX, y + 6, { width: itemColW, characterSpacing: 0.3 });
  doc.text("QTY", qtyColX, y + 6, { width: qtyW, align: "center", characterSpacing: 0.3 });
  doc.text("RATE (Rs.)", rateColX, y + 6, { width: rateW, align: "right" });
  doc.text("AMOUNT (Rs.)", amtColX, y + 6, { width: amtW, align: "right" });
  y += hdrH;

  // ========== ITEMS ROWS (white bg, thin dashed dividers) ==========
  let subtotal = 0;
  const rowH = 24;
  invoice.items.forEach((item, i) => {
    const itemTotal = Number(item.quantity) * Number(item.price);
    subtotal += itemTotal;

    doc.font("Helvetica-Bold").fontSize(9).fillColor(TEXT);
    doc.text(item.itemType || "-", itemColX, y + 7, { width: itemColW, ellipsis: true });
    doc.font("Helvetica").fontSize(9).fillColor(TEXT);
    doc.text(String(item.quantity), qtyColX, y + 7, { width: qtyW, align: "center" });
    doc.text(fmt(item.price), rateColX, y + 7, { width: rateW, align: "right" });
    doc.font("Helvetica-Bold");
    doc.text(fmt(itemTotal), amtColX, y + 7, { width: amtW, align: "right" });

    y += rowH;
    if (i < invoice.items.length - 1) {
      drawDashedLine(doc, y - 4);
    }
  });

  // Bottom line of table
  drawSolidLine(doc, y);
  y += 14;

  // ========== THANK YOU (left) + SUMMARY (right) ==========
  const gstPercent = Number(invoice.gstPercent) || 0;
  const gstAmount = Number(invoice.gstAmount) || 0;
  const discount = Number(invoice.discount) || 0;
  const totalAmount = Number(invoice.totalAmount) || 0;
  const halfGst = gstAmount / 2;

  const leftColW = CONTENT_WIDTH * 0.5;
  const summaryRightX = MARGIN + CONTENT_WIDTH * 0.55;
  const summaryRightW = CONTENT_WIDTH * 0.45;
  const sectionTopY = y;

  // --- Left: Thank You block ---
  doc.font("Helvetica-BoldOblique").fontSize(15).fillColor(ACCENT);
  doc.text("Thank You!", MARGIN, y, { width: leftColW });
  y = doc.y + 4;

  drawHeartIcon(doc, MARGIN, y, 9, ACCENT);
  y += 15;

  doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);
  doc.text("We hope you enjoyed", MARGIN, y, { width: leftColW });
  y = doc.y + 1;
  doc.text("your meal.", MARGIN, y, { width: leftColW });
  y = doc.y + 8;

  drawDashedLine(doc, y, MARGIN, MARGIN + leftColW - 10);
  y += 8;

  doc.font("Helvetica-Bold").fontSize(8).fillColor(ACCENT);
  doc.text("VISIT AGAIN!", MARGIN, y, { width: leftColW, characterSpacing: 0.5 });
  const leftBottomY = doc.y;

  // --- Right: summary rows ---
  let sumY = sectionTopY;
  const rowGap = 15;

  const summaryRow = (label, value, opts = {}) => {
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(MUTED);
    doc.text(label, summaryRightX, sumY, { width: summaryRightW * 0.55, characterSpacing: 0.3 });
    doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor(TEXT);
    doc.text(value, summaryRightX + summaryRightW * 0.5, sumY - 1, {
      width: summaryRightW * 0.5,
      align: "right",
    });
    sumY += rowGap;
  };

  summaryRow("SUBTOTAL", `Rs.${fmt(subtotal)}`);
  if (gstAmount > 0) {
    summaryRow(`CGST (${(gstPercent / 2).toFixed(1)}%)`, `Rs.${fmt(halfGst)}`);
    summaryRow(`SGST (${(gstPercent / 2).toFixed(1)}%)`, `Rs.${fmt(halfGst)}`);
  }
  if (discount > 0) {
    summaryRow("DISCOUNT", `-Rs.${fmt(discount)}`);
  }

  y = Math.max(leftBottomY, sumY) + 8;

  // ========== TOTAL BOX (full width) ==========
  const totalBoxH = 26;
  doc.save().roundedRect(MARGIN, y, CONTENT_WIDTH, totalBoxH, 4).fill(DARK).restore();

  doc.font("Helvetica-Bold").fontSize(10).fillColor(WHITE);
  doc.text("TOTAL", MARGIN + 10, y + 8, { width: CONTENT_WIDTH * 0.3, characterSpacing: 0.5 });

  // vertical divider "|"
  const dividerX = MARGIN + CONTENT_WIDTH * 0.38;
  doc.save().strokeColor("#5a6b8c").lineWidth(1)
    .moveTo(dividerX, y + 6).lineTo(dividerX, y + totalBoxH - 6).stroke().restore();

  doc.font("Helvetica-Bold").fontSize(13).fillColor(WHITE);
  doc.text(`Rs.${fmt(totalAmount)}`, dividerX + 10, y + 6, {
    width: CONTENT_WIDTH - (dividerX - MARGIN) - 18,
    align: "right",
  });
  y += totalBoxH + 12;

  // ========== FOOTER ==========
  const dotR = 1.5;
  const footerText = "THANK YOU. VISIT AGAIN.";
  doc.font("Helvetica-Bold").fontSize(7).fillColor(MUTED);
  const footerW = doc.widthOfString(footerText, { characterSpacing: 1 });
  const footerTextX = (PAGE_WIDTH_PT - footerW) / 2;
  const lineGap = 14;

  doc.save().fillColor(MUTED)
    .circle(footerTextX - lineGap - dotR, y + 3, dotR).fill()
    .circle(footerTextX + footerW + lineGap + dotR, y + 3, dotR).fill()
    .restore();
  drawDashedLine(doc, y + 3, MARGIN, footerTextX - lineGap - 6);
  drawDashedLine(doc, y + 3, footerTextX + footerW + lineGap + 6, PAGE_WIDTH_PT - MARGIN);

  doc.text(footerText, footerTextX, y, { lineBreak: false, characterSpacing: 1 });
  y += 18;

  // Adjust page height to content
  doc.page.height = y + MARGIN;
}

module.exports = { generateInvoicePdf, PAGE_WIDTH_PT };