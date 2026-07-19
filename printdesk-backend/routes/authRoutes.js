const express = require("express");
const { register, login, registerLogo, forgotPassword, resetPassword } = require("../controllers/authController");
const { createLogoUpload } = require("../utils/upload");

const router = express.Router();

console.log("authRoutes file loaded");

const upload = createLogoUpload((req) => `reg-${req.params.id}`);

router.post("/register", register);
router.post("/login", login);
router.post("/register-logo/:id", upload.single("logo"), registerLogo);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

module.exports = router;
