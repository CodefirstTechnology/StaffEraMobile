const express = require("express");
const router = express.Router();
const agentController = require("../controllers/agentController");
const { authenticate, requireRole } = require("../middleware/auth");
const upload = require("../middleware/upload");
const validate = require("../middleware/validate");
const {
  createServantSchema,
  verifyServantSchema
} = require("../validators/servantValidator");

router.use(authenticate, requireRole("AGENT", "ADMIN"));

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

module.exports = router;
