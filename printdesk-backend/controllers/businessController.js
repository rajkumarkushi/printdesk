const Business = require("../models/Business");

// @desc    Get logged-in business profile
// @route   GET /api/business/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const business = await Business.findById(req.user._id).select("-password");

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    res.json(business);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Update logged-in business profile
// @route   PUT /api/business/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { businessName, address, gstNumber } = req.body;

    const business = await Business.findById(req.user._id);

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    if (businessName !== undefined) business.businessName = businessName;
    if (address !== undefined) business.address = address;
    if (gstNumber !== undefined) business.gstNumber = gstNumber;

    await business.save();

    res.json({ message: "Profile updated" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Upload / update business logo
// @route   POST /api/business/logo
// @access  Private
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No logo file uploaded" });
    }

    const business = await Business.findById(req.user._id);

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    // Store a URL the frontend can use directly
    const relativePath = `/uploads/logos/${req.file.filename}`;
    business.logoUrl = relativePath;

    await business.save();

    res.json({
      message: "Logo updated",
      logoUrl: relativePath,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};