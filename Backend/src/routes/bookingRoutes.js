const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { authenticate, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  createBookingSchema,
  reviewSchema,
  rejectBookingSchema,
  updateTrackingSchema
} = require("../validators/bookingValidator");

router.post(
  "/",
  authenticate,
  requireRole("HOUSE_OWNER"),
  validate(createBookingSchema),
  bookingController.createBooking
);
router.get("/", authenticate, bookingController.listBookings);
router.get("/:id", authenticate, bookingController.getBooking);
router.get("/:id/tracking", authenticate, bookingController.getBookingTracking);
router.post(
  "/:id/tracking",
  authenticate,
  requireRole("SERVANT"),
  validate(updateTrackingSchema),
  bookingController.updateBookingTracking
);
router.patch(
  "/:id/confirm",
  authenticate,
  requireRole("SERVANT"),
  bookingController.confirmBooking
);
router.patch(
  "/:id/reject",
  authenticate,
  requireRole("SERVANT"),
  validate(rejectBookingSchema),
  bookingController.rejectBooking
);
router.patch(
  "/:id/cancel",
  authenticate,
  requireRole("HOUSE_OWNER"),
  bookingController.cancelBooking
);
router.patch("/:id/complete", authenticate, bookingController.completeBooking);
router.post(
  "/:id/review",
  authenticate,
  requireRole("HOUSE_OWNER"),
  validate(reviewSchema),
  bookingController.createReview
);

module.exports = router;
