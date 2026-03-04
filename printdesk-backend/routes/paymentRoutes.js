// const express = require("express");
// const { createOrder, verifyPayment } = require("../controllers/paymentController");
// const protect = require("../middleware/authMiddleware");
// const router = express.Router();
// router.post("/create-order", protect, createOrder);
// router.post("/verify-payment", protect, verifyPayment);
// module.exports = router;


const express = require("express");
const { mockUpgradeBasic, mockUpgradePro } = require("../controllers/paymentController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/mock-upgrade-basic", protect, mockUpgradeBasic);
router.post("/mock-upgrade-pro", protect, mockUpgradePro);

module.exports = router;