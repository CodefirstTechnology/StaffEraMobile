const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { authenticate, requireRole } = require("../middleware/auth");

router.use(authenticate, requireRole("ADMIN"));

router.get("/stats", adminController.getStats);
router.get("/users", adminController.listUsers);
router.get("/bookings", adminController.listBookings);
router.get("/servants", adminController.listServants);
router.patch("/users/:id/toggle", adminController.toggleUser);

module.exports = router;
