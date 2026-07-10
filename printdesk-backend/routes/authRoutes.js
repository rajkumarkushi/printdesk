// const express = require("express");
// const { register, login } = require("../controllers/authController");

// const router = express.Router();

// router.post("/register", register);
// router.post("/login", login);

// module.exports = router; 
const multer = require("multer");
const path = require("path");
const { register, login, registerLogo } = require("../controllers/authController");

const router = express.Router();

console.log("authRoutes file loaded");

// Multer setup for register logo upload (before login)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads", "logos"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `reg-${req.params.id}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

router.post("/register", register);
router.post("/login", login);
router.post("/register-logo/:id", upload.single("logo"), registerLogo);

module.exports = router;