const express = require("express");
const {
  updateProfile,
  getProfile,
  uploadLogo,
} = require("../controllers/businessController");
const protect = require("../middleware/authMiddleware");
const { createLogoUpload } = require("../utils/upload");

const router = express.Router();

const upload = createLogoUpload((req) => req.user._id);

router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.post("/logo", protect, upload.single("logo"), uploadLogo);

module.exports = router;
