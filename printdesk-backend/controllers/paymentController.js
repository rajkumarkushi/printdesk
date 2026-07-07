const Business = require("../models/Business");

// MOCK UPGRADE TO BASIC (Temporary)
exports.mockUpgradeBasic = async (req, res) => {
  try {
    await Business.findByIdAndUpdate(req.user._id, {
      plan: "basic",
      invoiceLimit: 200,
    });

    res.json({ message: "Plan upgraded to Basic (Mock)" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// MOCK UPGRADE TO PRO (Temporary)
exports.mockUpgradePro = async (req, res) => {
  try {
    await Business.findByIdAndUpdate(req.user._id, {
      plan: "pro",
      invoiceLimit: Number.MAX_SAFE_INTEGER,
    });

    res.json({ message: "Plan upgraded to Pro (Mock)" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};