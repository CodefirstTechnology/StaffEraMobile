const express = require("express");
const router = express.Router();
const zoneController = require("../controllers/zoneController");
const { authenticate, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  createZoneSchema,
  updateZoneSchema
} = require("../validators/zoneValidator");

router.use(authenticate, requireRole("SERVANT"));

router.get("/me", zoneController.listMyZones);
router.post("/", validate(createZoneSchema), zoneController.createZone);
router.patch("/:id", validate(updateZoneSchema), zoneController.updateZone);
router.delete("/:id", zoneController.deleteZone);

module.exports = router;
