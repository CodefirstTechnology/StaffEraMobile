const express = require("express");
const router = express.Router();
const zoneController = require("../controllers/zoneController");
const { authenticate, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { createZoneSchema, updateZoneSchema } = require("../validators/zoneValidator");

router.use(authenticate, requireRole("SERVANT"));

router.get("/me", zoneController.listMyZones);
router.post("/me", validate(createZoneSchema), zoneController.createMyZone);
router.patch("/me/:zoneId", validate(updateZoneSchema), zoneController.updateMyZone);
router.delete("/me/:zoneId", zoneController.deleteMyZone);

module.exports = router;
