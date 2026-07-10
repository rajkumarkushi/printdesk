const path = require("path");
const fs = require("fs");

// ── Page geometry ─────────────────────────────────────────────────────────────
const PAGE_WIDTH_MM = 80;
const PT_PER_MM = 2.83465;
const PAGE_WIDTH_PT = Math.round(PAGE_WIDTH_MM * PT_PER_MM); // ≈ 227 pt
const MARGIN = 12;
const CONTENT_W = PAGE_WIDTH_PT - MARGIN * 2; // ≈ 203 pt

// ── Colour palette ───────────────────────────────────────────────────────────
const DARK     = "#1a2742";
const ACCENT   = "#2955a3";
const LIGHT_BG = "#eef2f8";
const WHITE    = "#ffffff";
const TEXT     = "#1a2332";
const MUTED    = "#64748b";
const BORDER   = "#cbd5e1";

// ── Number formatter ──────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ── Phone formatter ───────────────────────────────────────────────────────────
const formatPhone = (phone) => {
  if (!phone) return "-";
  // Remove spaces, dashes, parentheses to check if it's a raw 10-digit number
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (/^\d{10}$/.test(cleaned)) {
    return `+91 ${cleaned}`;
  }
  return phone;
};

// ── Truncate string to fit a given pixel width at current font/size ───────────
function truncate(doc, str, maxPx) {
  if (!str) return "";
  const ellipsis = "...";
  const ellipsisW = doc.widthOfString(ellipsis);
  if (doc.widthOfString(str) <= maxPx) return str;
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const candidate = str.slice(0, i + 1);
    if (doc.widthOfString(candidate) + ellipsisW > maxPx) break;
    result = candidate;
  }
  return result + ellipsis;
}

// ── Drawing helpers ───────────────────────────────────────────────────────────
function dashedLine(doc, y, x1 = MARGIN, x2 = PAGE_WIDTH_PT - MARGIN, color = BORDER) {
  doc.save()
    .strokeColor(color).lineWidth(0.6)
    .dash(2.5, { space: 2 })
    .moveTo(x1, y).lineTo(x2, y).stroke()
    .undash().restore();
}

function solidLine(doc, y, color = BORDER, lw = 0.75) {
  doc.save()
    .strokeColor(color).lineWidth(lw)
    .moveTo(MARGIN, y).lineTo(PAGE_WIDTH_PT - MARGIN, y).stroke()
    .restore();
}

function filledRect(doc, x, y, w, h, r, fill, stroke = null, strokeW = 0.75) {
  doc.save().roundedRect(x, y, w, h, r).fill(fill);
  if (stroke) doc.roundedRect(x, y, w, h, r).strokeColor(stroke).lineWidth(strokeW).stroke();
  doc.restore();
}

// ── Icon helpers ─────────────────────────────────────────────────────────────
function iconCalendar(doc, x, y, s, c) {
  doc.save().strokeColor(c).lineWidth(0.8);
  doc.roundedRect(x, y + 1.5, s, s - 1.5, 1).stroke();
  doc.moveTo(x + s * 0.28, y).lineTo(x + s * 0.28, y + 3.5).stroke();
  doc.moveTo(x + s * 0.72, y).lineTo(x + s * 0.72, y + 3.5).stroke();
  doc.moveTo(x, y + s * 0.44).lineTo(x + s, y + s * 0.44).stroke();
  doc.restore();
}

function iconClock(doc, x, y, s, c) {
  const cx = x + s / 2, cy = y + s / 2, r = s / 2 - 0.3;
  doc.save().strokeColor(c).lineWidth(0.8);
  doc.circle(cx, cy, r).stroke();
  doc.moveTo(cx, cy).lineTo(cx, cy - r * 0.55).stroke();
  doc.moveTo(cx, cy).lineTo(cx + r * 0.42, cy).stroke();
  doc.restore();
}

// ── Table column layout ────────────────────────────────────────────────────────
// | ITEM / DESCRIPTION | QTY | RATE  | AMOUNT |
// Shift columns left so RATE and AMOUNT have enough room for numbers like 9,000.00
const COL = {
  itemX: MARGIN + 6,
  qtyX:  MARGIN + Math.round(CONTENT_W * 0.44),
  rateX: MARGIN + Math.round(CONTENT_W * 0.55),
  amtX:  MARGIN + Math.round(CONTENT_W * 0.74),
};
COL.itemW = COL.qtyX  - COL.itemX - 4;
COL.qtyW  = COL.rateX - COL.qtyX  - 4;
COL.rateW = COL.amtX  - COL.rateX - 4;
COL.amtW  = (MARGIN + CONTENT_W) - COL.amtX - 6;

// ── Main template ─────────────────────────────────────────────────────────────
async function generateInvoicePdf(doc, invoice, business) {
  let y = MARGIN + 4;

  // ─────────────────────────────────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────────────────────────────────

  // Logo
  const logoPath = business.logoUrl
    ? path.join(__dirname, "../uploads/logos", path.basename(business.logoUrl))
    : null;
  if (logoPath && fs.existsSync(logoPath)) {
    const logoSize = 34;
    try {
      doc.image(logoPath, (PAGE_WIDTH_PT - logoSize) / 2, y, { width: logoSize, height: logoSize });
    } catch (_) {}
    y += logoSize + 6;
  }

  // Business name – always at readable size, wraps freely, tracked via doc.y
  const bName = (business.businessName || "Business").toUpperCase();
  doc.font("Helvetica-Bold").fontSize(16).fillColor(TEXT);
  doc.text(bName, MARGIN, y, { width: CONTENT_W, align: "center" });
  y = doc.y + 3;

  // Tagline
  if (business.tagline || business.businessType) {
    const sub = (business.tagline || business.businessType).toUpperCase();
    doc.font("Helvetica").fontSize(7.5).fillColor(ACCENT);
    doc.text(`-- ${sub} --`, MARGIN, y, { width: CONTENT_W, align: "center" });
    y = doc.y + 3;
  }

  // Address (allow wrap, track actual height via doc.y)
  if (business.address) {
    doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);
    doc.text(business.address, MARGIN, y, { width: CONTENT_W, align: "center" });
    y = doc.y + 3;
  }

  // Phone
  if (business.phone) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(TEXT);
    doc.text(formatPhone(business.phone), MARGIN, y, { width: CONTENT_W, align: "center", lineBreak: false });
    y = doc.y + 3;
  }

  // GST number
  if (business.gstNumber) {
    doc.font("Helvetica").fontSize(7).fillColor(MUTED);
    doc.text(`GST: ${business.gstNumber}`, MARGIN, y, {
      width: CONTENT_W,
      align: "center",
      lineBreak: false,
    });
    y = doc.y + 4;
  }

  dashedLine(doc, y);
  y += 10;

  // ─────────────────────────────────────────────────────────────────────────
  // INVOICE BADGE
  // ─────────────────────────────────────────────────────────────────────────
  const badgeW = 82;
  const badgeH = 19;
  const badgeX = (PAGE_WIDTH_PT - badgeW) / 2;
  filledRect(doc, badgeX, y, badgeW, badgeH, 4, DARK);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(WHITE);
  doc.text("INVOICE", badgeX, y + 5.5, {
    width: badgeW,
    align: "center",
    characterSpacing: 2,
    lineBreak: false,
  });
  y += badgeH + 10;

  // ─────────────────────────────────────────────────────────────────────────
  // DATE | TIME
  // ─────────────────────────────────────────────────────────────────────────
  const invoiceDateObj = invoice.createdAt ? new Date(invoice.createdAt) : null;
  const invoiceDate = invoiceDateObj
    ? invoiceDateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "-";
  const invoiceTime = invoiceDateObj
    ? invoiceDateObj.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "-";

  const halfW = CONTENT_W / 2;
  const iconSz = 8;

  // Date column (left)
  const dateLabel = "DATE";
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(MUTED);
  const dateLabelW = doc.widthOfString(dateLabel, { characterSpacing: 0.5 });
  const dateGroupW = iconSz + 3 + dateLabelW;
  const dateGroupX = MARGIN + (halfW - dateGroupW) / 2;
  iconCalendar(doc, dateGroupX, y + 1.5, iconSz, ACCENT);
  doc.fillColor(MUTED).text(dateLabel, dateGroupX + iconSz + 3, y + 2, {
    lineBreak: false,
    characterSpacing: 0.5,
  });
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(TEXT);
  doc.text(invoiceDate, MARGIN, y + 13, { width: halfW, align: "center", lineBreak: false });

  // Time column (right)
  const timeLabel = "TIME";
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(MUTED);
  const timeLabelW = doc.widthOfString(timeLabel, { characterSpacing: 0.5 });
  const timeGroupW = iconSz + 3 + timeLabelW;
  const timeGroupX = MARGIN + halfW + (halfW - timeGroupW) / 2;
  iconClock(doc, timeGroupX, y + 1.5, iconSz, ACCENT);
  doc.fillColor(MUTED).text(timeLabel, timeGroupX + iconSz + 3, y + 2, {
    lineBreak: false,
    characterSpacing: 0.5,
  });
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(TEXT);
  doc.text(invoiceTime, MARGIN + halfW, y + 13, {
    width: halfW,
    align: "center",
    lineBreak: false,
  });

  y += 29;
  dashedLine(doc, y);
  y += 10;

  // ─────────────────────────────────────────────────────────────────────────
  // DETAILS BOX  – Receipt No / Customer / Payment Mode / Phone
  // ─────────────────────────────────────────────────────────────────────────
  const BP = 9;                                        // inner padding
  const colInnerW = (CONTENT_W - BP * 3) / 2;
  const leftColX  = MARGIN + BP;
  const rightColX = MARGIN + BP * 2 + colInnerW;

  const LABEL_H  = 9;   // height of the small label line
  const LABEL_GAP = 2;  // gap between label and value
  const ROW_GAP  = 8;   // gap between row 1 and row 2

  // Measure actual heights so long names wrap and box expands
  doc.font("Helvetica-Bold").fontSize(9);
  const invNumH  = doc.heightOfString(invoice.invoiceNumber || "-", { width: colInnerW });
  const custNameH = doc.heightOfString(invoice.customerName  || "-", { width: colInnerW });
  const payMode   = (invoice.status === "Paid" ? "PAID" : invoice.paymentMode || "CASH").toUpperCase();
  const payModeH  = doc.heightOfString(payMode,                  { width: colInnerW });
  const formattedPhone = formatPhone(invoice.customerPhone);
  const phoneH    = doc.heightOfString(formattedPhone, { width: colInnerW });

  // Row heights: each row = label + gap + max(left value height, right value height)
  const row1H = LABEL_H + LABEL_GAP + Math.max(invNumH,  custNameH);
  const row2H = LABEL_H + LABEL_GAP + Math.max(payModeH, phoneH);
  const actualBoxH = BP + row1H + ROW_GAP + row2H + BP;

  filledRect(doc, MARGIN, y, CONTENT_W, actualBoxH, 5, LIGHT_BG);

  const bY   = y + BP;            // top of row 1
  const row2Y = bY + row1H + ROW_GAP; // top of row 2

  // ── Left column: Receipt No ──
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(ACCENT);
  doc.text("RECEIPT NO", leftColX, bY, { width: colInnerW, lineBreak: false, characterSpacing: 0.3 });
  doc.font("Helvetica-Bold").fontSize(9).fillColor(TEXT);
  doc.text(invoice.invoiceNumber || "-", leftColX, bY + LABEL_H + LABEL_GAP, { width: colInnerW });

  // ── Right column: Customer (allow full wrap) ──
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(ACCENT);
  doc.text("CUSTOMER", rightColX, bY, { width: colInnerW, lineBreak: false, characterSpacing: 0.3 });
  doc.font("Helvetica-Bold").fontSize(9).fillColor(TEXT);
  doc.text(invoice.customerName || "-", rightColX, bY + LABEL_H + LABEL_GAP, { width: colInnerW });

  // ── Left column: Payment Mode ──
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(ACCENT);
  doc.text("PAYMENT MODE", leftColX, row2Y, { width: colInnerW, lineBreak: false, characterSpacing: 0.3 });
  doc.font("Helvetica-Bold").fontSize(9).fillColor(TEXT);
  doc.text(payMode, leftColX, row2Y + LABEL_H + LABEL_GAP, { width: colInnerW, lineBreak: false });

  // ── Right column: Phone ──
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(ACCENT);
  doc.text("PHONE", rightColX, row2Y, { width: colInnerW, lineBreak: false, characterSpacing: 0.3 });
  doc.font("Helvetica-Bold").fontSize(9).fillColor(TEXT);
  doc.text(formattedPhone, rightColX, row2Y + LABEL_H + LABEL_GAP, { width: colInnerW, lineBreak: false });

  y += actualBoxH + 12;

  // ─────────────────────────────────────────────────────────────────────────
  // ITEMS TABLE HEADER
  // ─────────────────────────────────────────────────────────────────────────
  const HDR_H = 19;
  filledRect(doc, MARGIN, y, CONTENT_W, HDR_H, 3, DARK);

  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(WHITE);
  doc.text("ITEM", COL.itemX, y + 6, {
    width: COL.itemW,
    lineBreak: false,
    characterSpacing: 0.2,
  });
  doc.text("QTY", COL.qtyX, y + 6, {
    width: COL.qtyW,
    align: "center",
    lineBreak: false,
  });
  doc.text("RATE", COL.rateX, y + 6, {
    width: COL.rateW,
    align: "right",
    lineBreak: false,
  });
  doc.text("AMOUNT", COL.amtX, y + 6, {
    width: COL.amtW,
    align: "right",
    lineBreak: false,
  });
  y += HDR_H;

  // ─────────────────────────────────────────────────────────────────────────
  // ITEM ROWS
  // ─────────────────────────────────────────────────────────────────────────
  let subtotal = 0;
  const ROW_H = 20;

  invoice.items.forEach((item, idx) => {
    const qty   = Number(item.quantity) || 0;
    const price = Number(item.price)    || 0;
    const total = qty * price;
    subtotal += total;

    // Alternate row tint
    if (idx % 2 === 1) {
      filledRect(doc, MARGIN, y, CONTENT_W, ROW_H, 0, "#f8fafd");
    }

    const textY = y + 6;

    // Item name – truncate to column width
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(TEXT);
    const itemLabel = truncate(doc.font("Helvetica-Bold").fontSize(8.5), item.itemType || "-", COL.itemW);
    doc.text(itemLabel, COL.itemX, textY, { width: COL.itemW, lineBreak: false });

    // Qty
    doc.font("Helvetica").fontSize(8.5).fillColor(TEXT);
    doc.text(String(qty), COL.qtyX, textY, { width: COL.qtyW, align: "center", lineBreak: false });

    // Rate
    doc.text(`${fmt(price)}`, COL.rateX, textY, { width: COL.rateW, align: "right", lineBreak: false });

    // Amount (bold)
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(TEXT);
    doc.text(`${fmt(total)}`, COL.amtX, textY, { width: COL.amtW, align: "right", lineBreak: false });

    y += ROW_H;

    if (idx < invoice.items.length - 1) {
      dashedLine(doc, y, MARGIN, PAGE_WIDTH_PT - MARGIN, "#e2e8f0");
    }
  });

  solidLine(doc, y, DARK, 1);
  y += 12;

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY (right-aligned rows)
  // ─────────────────────────────────────────────────────────────────────────
  const gstPercent  = Number(invoice.gstPercent) || 0;
  const gstAmount   = Number(invoice.gstAmount)  || 0;
  const discount    = Number(invoice.discount)   || 0;
  const totalAmount = typeof invoice.totalAmount === "number" && !isNaN(invoice.totalAmount)
    ? invoice.totalAmount
    : subtotal + gstAmount - discount;
  const halfGst = gstAmount / 2;

  // Label occupies the right 60% of content; value is right-aligned inside last 30%
  const sumLabelX = MARGIN + Math.round(CONTENT_W * 0.38);
  const sumLabelW = Math.round(CONTENT_W * 0.36);
  const sumValX   = MARGIN + Math.round(CONTENT_W * 0.70);
  const sumValW   = Math.round(CONTENT_W * 0.30) - 4;
  const SUM_ROW_H = 13;

  function summaryRow(label, value) {
    doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);
    doc.text(label, sumLabelX, y, { width: sumLabelW, lineBreak: false });
    doc.font("Helvetica").fontSize(8).fillColor(TEXT);
    doc.text(value, sumValX, y, { width: sumValW, align: "right", lineBreak: false });
    y += SUM_ROW_H;
  }

  summaryRow("SUBTOTAL", `Rs.${fmt(subtotal)}`);

  if (gstAmount > 0) {
    const halfPct = (gstPercent / 2).toFixed(1);
    summaryRow(`CGST (${halfPct}%)`, `Rs.${fmt(halfGst)}`);
    summaryRow(`SGST (${halfPct}%)`, `Rs.${fmt(halfGst)}`);
  }

  // Discount row only if discount > 0
  if (discount > 0) {
    summaryRow("DISCOUNT", `-Rs.${fmt(discount)}`);
  }

  y += 6;

  // ─────────────────────────────────────────────────────────────────────────
  // TOTAL BOX
  // ─────────────────────────────────────────────────────────────────────────
  const TOTAL_H = 26;
  filledRect(doc, MARGIN, y, CONTENT_W, TOTAL_H, 4, DARK);

  doc.font("Helvetica-Bold").fontSize(9).fillColor(WHITE);
  doc.text("TOTAL", MARGIN + 10, y + 9, {
    width: CONTENT_W * 0.36,
    lineBreak: false,
    characterSpacing: 1,
  });

  // Vertical divider
  const divX = MARGIN + Math.round(CONTENT_W * 0.44);
  doc.save()
    .strokeColor("#4a6299").lineWidth(0.8)
    .moveTo(divX, y + 5).lineTo(divX, y + TOTAL_H - 5)
    .stroke().restore();

  // Total amount (auto-fit font size so Rs.1,00,000.00 still fits)
  const totalStr = `Rs.${fmt(totalAmount)}`;
  const totalAvailW = CONTENT_W - (divX - MARGIN) - 14;
  let totalFontSize = 13;
  doc.font("Helvetica-Bold").fontSize(totalFontSize);
  while (doc.widthOfString(totalStr) > totalAvailW && totalFontSize > 9) {
    totalFontSize -= 1;
    doc.fontSize(totalFontSize);
  }
  doc.fillColor(WHITE);
  doc.text(totalStr, divX + 8, y + (TOTAL_H - totalFontSize) / 2 + 1, {
    width: totalAvailW,
    align: "right",
    lineBreak: false,
  });

  y += TOTAL_H + 14;

  // ─────────────────────────────────────────────────────────────────────────
  // FOOTER
  // ─────────────────────────────────────────────────────────────────────────
  const tyText = "THANK YOU  *  VISIT AGAIN";
  doc.font("Helvetica-Bold").fontSize(7).fillColor(MUTED);
  const tyW = doc.widthOfString(tyText, { characterSpacing: 0.8 });
  const tyX = (PAGE_WIDTH_PT - tyW) / 2;

  const dashGap = 8;
  const lineY = y + 3.5;
  const leftEnd   = Math.max(MARGIN, tyX - dashGap);
  const rightStart = Math.min(PAGE_WIDTH_PT - MARGIN, tyX + tyW + dashGap);
  if (leftEnd > MARGIN) {
    dashedLine(doc, lineY, MARGIN, leftEnd, BORDER);
  }
  if (rightStart < PAGE_WIDTH_PT - MARGIN) {
    dashedLine(doc, lineY, rightStart, PAGE_WIDTH_PT - MARGIN, BORDER);
  }
  doc.text(tyText, tyX, y, { lineBreak: false, characterSpacing: 0.8 });
  y += 14;

  // Powered-by watermark
  doc.font("Helvetica").fontSize(6).fillColor("#c0cad8");
  doc.text("Powered by Billora", MARGIN, y, {
    width: CONTENT_W,
    align: "center",
    lineBreak: false,
  });
  y += 10;

  // ─────────────────────────────────────────────────────────────────────────
  // Trim page to content
  // ─────────────────────────────────────────────────────────────────────────
  doc.page.height = y + MARGIN;
}

module.exports = { generateInvoicePdf, PAGE_WIDTH_PT };