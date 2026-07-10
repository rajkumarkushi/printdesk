require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const connectDB = require("./config/db");
connectDB();

// Ensure upload directories exist
const uploadLogosPath = path.join(__dirname, "uploads", "logos");
if (!fs.existsSync(uploadLogosPath)) {
  fs.mkdirSync(uploadLogosPath, { recursive: true });
}

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded logos and other files
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/invoices", require("./routes/invoiceRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/business", require("./routes/businessRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

app.get("/", (req, res) => {
  res.send("Billora API Running - Smart Billing for Growing Businesses");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));