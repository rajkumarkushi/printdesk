const Business = require("../models/Business");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// REGISTER
exports.register = async (req, res) => {
  try {
    const { businessName, ownerName, email, password, phone, address, gstNumber } = req.body;

    const existing = await Business.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await Business.create({
      businessName,
      ownerName,
      email,
      password: hashedPassword,
      phone: phone || "",
      address: address || "",
      gstNumber: gstNumber || "",
    });

    res.status(201).json({ message: "Registered successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    console.log("LOGIN FUNCTION EXECUTED");

    const { email, password } = req.body;

    const business = await Business.findOne({ email });

    if (!business) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log("Business Role:", business.role);

    const isMatch = await bcrypt.compare(password, business.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: business._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      role: business.role,
      businessName: business.businessName,
      email: business.email,
      id: business._id,
    });

  } catch (error) {
    console.log("LOGIN ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};