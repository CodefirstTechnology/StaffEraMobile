const express = require("express");
const router = express.Router();
const agentController = require("../controllers/agentController");
const { authenticate, requireRole } = require("../middleware/auth");
const upload = require("../middleware/upload");
const validate = require("../middleware/validate");
const {
  createServantSchema,
  verifyServantSchema,
  setServantPasswordSchema
} = require("../validators/servantValidator");
const { updateAgentProfileSchema } = require("../validators/agentValidator");
const {
  createZoneSchema,
  updateZoneSchema
} = require("../validators/zoneValidator");

router.use(authenticate, requireRole("AGENT", "ADMIN"));

router.get("/stats", agentController.getStats);

router.patch(
  "/profile",
  validate(updateAgentProfileSchema),
  agentController.updateProfile
);

router.post(
  "/servants",
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "idProof", maxCount: 1 }
  ]),
  validate(createServantSchema),
  agentController.createServant
);
router.get("/servants", agentController.listServants);
router.get("/servants/:id", agentController.getServant);
router.patch(
  "/servants/:id/password",
  validate(setServantPasswordSchema),
  agentController.setServantPassword
);
router.patch(
  "/servants/:id",
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "idProof", maxCount: 1 }
  ]),
  agentController.updateServant
);
router.patch(
  "/servants/:id/verify",
  validate(verifyServantSchema),
  agentController.verifyServant
);
router.post(
  "/servants/:id/upload-id",
  upload.single("idProof"),
  agentController.uploadIdProof
);

router.get("/servants/:id/zones", agentController.listServantZones);
router.post(
  "/servants/:id/zones",
  validate(createZoneSchema),
  agentController.createServantZone
);
router.patch(
  "/servants/:id/zones/:zoneId",
  validate(updateZoneSchema),
  agentController.updateServantZone
);
router.delete("/servants/:id/zones/:zoneId", agentController.deleteServantZone);

module.exports = router;
