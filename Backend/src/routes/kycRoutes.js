const express = require("express");
const router = express.Router();
const kycController = require("../controllers/kycController");
const { authenticate, requireRole } = require("../middleware/auth");
const { uploadAadhaarZip } = require("../middleware/uploadKyc");

router.post(
  "/aadhaar/xml/verify",
  authenticate,
  requireRole("SERVANT"),
  uploadAadhaarZip.single("aadhaarZip"),
  kycController.verifyAadhaarXmlForMe
);

router.get(
  "/aadhaar/status",
  authenticate,
  requireRole("SERVANT"),
  kycController.getMyAadhaarStatus
);

router.post(
  "/aadhaar/xml/verify/:id",
  authenticate,
  requireRole("AGENT", "ADMIN"),
  uploadAadhaarZip.single("aadhaarZip"),
  kycController.verifyAadhaarXmlForServant
);

router.get(
  "/aadhaar/status/:id",
  authenticate,
  requireRole("AGENT", "ADMIN", "SERVANT"),
  kycController.getAadhaarStatus
);

module.exports = router;
