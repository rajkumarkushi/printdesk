const Business = require("../models/Business");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// REGISTER
exports.register = async (req, res) => {
  try {
    const { businessName, ownerName, email, password, phone, address, gstNumber } = req.body;

    const existing = await Business.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const business = await Business.create({
      businessName,
      ownerName,
      email,
      password: hashedPassword,
      phone: phone || "",
      address: address || "",
      gstNumber: gstNumber || "",
    });

    res.status(201).json({ message: "Registered successfully", id: business._id });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// REGISTER LOGO (Wizard)
exports.registerLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No logo file uploaded" });
    }
    const business = await Business.findById(req.params.id);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }
    const relativePath = `/uploads/logos/${req.file.filename}`;
    business.logoUrl = relativePath;
    await business.save();
    res.json({ message: "Logo uploaded successfully", logoUrl: relativePath });
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

// FORGOT PASSWORD - Send reset token via email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const business = await Business.findOne({ email: email.toLowerCase() });

    if (!business) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    business.resetPasswordToken = hashedToken;
    business.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await business.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"Billora" <${process.env.SMTP_EMAIL}>`,
      to: business.email,
      subject: "Reset Your Password - Billora",
      html: `
        <div style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#1a2742 0%,#2d4a7a 100%);padding:36px 40px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Billora</h1>
                      <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Smart Billing for Growing Businesses</p>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:40px 40px 20px;">
                      <div style="width:56px;height:56px;background-color:#eef2ff;border-radius:50%;margin:0 auto 24px;text-align:center;line-height:56px;font-size:28px;">🔒</div>
                      <h2 style="margin:0 0 12px;color:#1a2742;font-size:22px;text-align:center;font-weight:700;">Reset Your Password</h2>
                      <p style="margin:0 0 8px;color:#475569;font-size:15px;text-align:center;">Hi <strong>${business.ownerName || "there"}</strong>,</p>
                      <p style="margin:0 0 28px;color:#64748b;font-size:14px;line-height:1.7;text-align:center;">
                        We received a request to reset the password for your Billora account associated with <strong style="color:#1a2742;">${business.email}</strong>.
                      </p>
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding:0 0 28px;">
                            <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#1a2742 0%,#2d4a7a 100%);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:10px;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(26,39,66,0.35);">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:0 0 20px;color:#94a3b8;font-size:13px;text-align:center;">
                        This link will expire in <strong style="color:#64748b;">15 minutes</strong>.
                      </p>
                    </td>
                  </tr>
                  <!-- Divider -->
                  <tr>
                    <td style="padding:0 40px;">
                      <div style="border-top:1px solid #e2e8f0;"></div>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding:24px 40px 36px;">
                      <p style="margin:0 0 12px;color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;">
                        If you didn't request a password reset, you can safely ignore this email.<br>
                        Your password will remain unchanged.
                      </p>
                      <p style="margin:0;color:#cbd5e1;font-size:11px;text-align:center;">
                        © ${new Date().getFullYear()} Billora. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      res.json({ message: "Password reset link sent to your email" });
    } catch (emailError) {
      console.log("EMAIL SEND ERROR:", emailError.message);
      // If email fails, return the token directly for development purposes
      res.json({
        message: "Email service not configured. Use the reset link below.",
        resetToken,
        resetUrl,
      });
    }
  } catch (error) {
    console.log("FORGOT PASSWORD ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

// RESET PASSWORD - Set new password using token
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const business = await Business.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!business) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    business.password = hashedPassword;
    business.resetPasswordToken = null;
    business.resetPasswordExpire = null;
    await business.save({ validateBeforeSave: false });

    res.json({ message: "Password reset successful. You can now login with your new password." });
  } catch (error) {
    console.log("RESET PASSWORD ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};