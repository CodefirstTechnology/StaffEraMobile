const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { authenticate, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  createBookingSchema,
  reviewSchema,
  rejectBookingSchema,
  updateTrackingSchema,
  verifyWorkOtpSchema
} = require("../validators/bookingValidator");

router.post(
  "/",
  authenticate,
  requireRole("HOUSE_OWNER"),
  validate(createBookingSchema),
  bookingController.createBooking
);
router.get("/", authenticate, bookingController.listBookings);
router.get(
  "/open-requests",
  authenticate,
  requireRole("SERVANT"),
  bookingController.listOpenRequests
);
router.get(
  "/declined-open-ids",
  authenticate,
  requireRole("SERVANT"),
  bookingController.listDeclinedOpenBookingIds
);
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
  "/:id/decline-open",
  authenticate,
  requireRole("SERVANT"),
  validate(rejectBookingSchema),
  bookingController.declineOpenRequest
);
router.patch(
  "/:id/arrived",
  authenticate,
  requireRole("SERVANT"),
  bookingController.markArrived
);
router.post(
  "/:id/verify-work-otp",
  authenticate,
  requireRole("SERVANT"),
  validate(verifyWorkOtpSchema),
  bookingController.verifyWorkOtp
);
router.post(
  "/:id/resend-work-otp",
  authenticate,
  requireRole("SERVANT"),
  bookingController.resendWorkOtp
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
router.patch(
  "/:id/request-extension",
  authenticate,
  requireRole("HOUSE_OWNER"),
  bookingController.requestExtension
);
router.patch(
  "/:id/respond-extension",
  authenticate,
  requireRole("SERVANT"),
  bookingController.respondExtension
);

module.exports = router;
