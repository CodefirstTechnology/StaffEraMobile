const express = require("express");
const router = express.Router();
const servantController = require("../controllers/servantController");
const { authenticate, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { updateServantMeSchema } = require("../validators/servantValidator");

router.get(
  "/",
  authenticate,
  requireRole("HOUSE_OWNER"),
  servantController.listServants
);

router.get(
  "/me/schedule",
  authenticate,
  requireRole("SERVANT"),
  servantController.getMySchedule
);
router.get(
  "/me/time-entries",
  authenticate,
  requireRole("SERVANT"),
  servantController.getMyTimeEntries
);
router.get(
  "/me",
  authenticate,
  requireRole("SERVANT"),
  servantController.getMyProfile
);
router.patch(
  "/me",
  authenticate,
  requireRole("SERVANT"),
  validate(updateServantMeSchema),
  servantController.updateMyProfile
);

router.get("/:id", authenticate, servantController.getServant);

module.exports = router;
