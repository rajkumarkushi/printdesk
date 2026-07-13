const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  updateProfile,
  getProfile,
  uploadLogo,
} = require("../controllers/businessController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Multer storage for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads", "logos"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user._id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = [".png", ".jpg", ".jpeg"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG and JPG logos are supported"));
    }
  },
});

router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.post("/logo", protect, upload.single("logo"), uploadLogo);

module.exports = router;