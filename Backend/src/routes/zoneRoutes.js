const express = require("express");
const router = express.Router();
const zoneController = require("../controllers/zoneController");
const { authenticate, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { createZoneSchema } = require("../validators/zoneValidator");

router.use(authenticate, requireRole("SERVANT"));

router.get("/me", zoneController.listMyZones);
router.post("/me", validate(createZoneSchema), zoneController.createMyZone);

module.exports = router;
