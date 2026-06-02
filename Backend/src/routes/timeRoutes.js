const express = require("express");
const router = express.Router();
const timeController = require("../controllers/timeController");
const { authenticate, requireRole } = require("../middleware/auth");

router.post(
  "/clock-in",
  authenticate,
  requireRole("SERVANT"),
  timeController.clockIn
);
router.post(
  "/clock-out",
  authenticate,
  requireRole("SERVANT"),
  timeController.clockOut
);
router.get(
  "/today",
  authenticate,
  requireRole("SERVANT"),
  timeController.getToday
);
router.get(
  "/month",
  authenticate,
  requireRole("SERVANT"),
  timeController.getMonth
);
router.get(
  "/history",
  authenticate,
  requireRole("SERVANT"),
  timeController.getHistory
);

module.exports = router;
