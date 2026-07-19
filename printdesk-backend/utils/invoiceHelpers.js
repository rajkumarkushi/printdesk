const Invoice = require("../models/Invoice");

const validateInvoiceFields = (customerName, customerPhone, items) => {
  if (!customerName || !customerName.trim()) {
    return "Customer name is required";
  }
  if (!customerPhone || !customerPhone.trim()) {
    return "Customer phone number is required";
  }
  if (!items || items.length === 0) {
    return "At least one item is required";
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.itemType || !item.itemType.trim()) {
      return `Item type is required for item ${i + 1}`;
    }
    if (!item.designName || !item.designName.trim()) {
      return `Design name is required for item ${i + 1}`;
    }
    if (!item.quantity || Number(item.quantity) <= 0) {
      return `Valid quantity is required for item ${i + 1}`;
    }
    if (!item.price || Number(item.price) <= 0) {
      return `Valid price is required for item ${i + 1}`;
    }
  }
  return null;
};

const getStartOfMonth = () => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const checkInvoiceLimit = async (business) => {
  const overrideLimit =
    typeof business.invoiceLimit === "number" ? business.invoiceLimit : null;

  if (business.plan === "free") {
    const totalInvoices = await Invoice.countDocuments({
      businessId: business._id,
    });
    const limit = overrideLimit ?? 30;
    if (totalInvoices >= limit) {
      return "Free plan invoice limit reached. Please upgrade your plan to continue.";
    }
  } else {
    const startOfMonth = getStartOfMonth();
    const invoiceCount = await Invoice.countDocuments({
      businessId: business._id,
      createdAt: { $gte: startOfMonth },
    });
    const limit = business.plan === "pro"
      ? (overrideLimit ?? Number.MAX_SAFE_INTEGER)
      : (overrideLimit ?? 200);
    if (invoiceCount >= limit) {
      return "Invoice limit reached for this month. It will reset next month.";
    }
  }
  return null;
};

module.exports = { validateInvoiceFields, getStartOfMonth, checkInvoiceLimit };
