const { z } = require("zod");
const { optionalNumber, optionalPositiveInt } = require("./zodHelpers");

const createBookingSchema = z.object({
  body: z
    .object({
      servantId: optionalPositiveInt(),
      bookingType: z.enum(["MONTHLY", "SESSION"]),
      requestedSkill: z.string().optional(),
      monthlyStartDate: z.string().min(1).optional(),
      monthlyEndDate: z.string().min(1).optional(),
      hoursPerDay: optionalNumber(),
      workingDays: z.union([z.string(), z.array(z.string())]).optional(),
      sessionDate: z.string().min(1).optional(),
      sessionStartTime: z.string().optional(),
      sessionEndTime: z.string().optional(),
      sessionHours: optionalNumber(),
      address: z.string().optional(),
      latitude: optionalNumber(z.number().min(-90).max(90)),
      longitude: optionalNumber(z.number().min(-180).max(180)),
      notes: z.string().optional(),
      totalAmount: optionalNumber()
    })
    .superRefine((data, ctx) => {
      if (data.bookingType === "MONTHLY") {
        if (!data.monthlyStartDate || !data.monthlyEndDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Monthly bookings require start and end dates"
          });
        }
      }
      if (data.bookingType === "SESSION") {
        if (!data.sessionDate || !data.sessionStartTime || !data.sessionEndTime) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Session bookings require date and time range"
          });
        }
      }
      if (!data.servantId) {
        if (data.latitude == null || data.longitude == null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Live location (latitude and longitude) is required for area requests"
          });
        }
        if (!data.address?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Address is required for area requests"
          });
        }
      }
    })
});

const reviewSchema = z.object({
  body: z.object({
    rating: z.coerce.number().min(1).max(5),
    comment: z.string().optional()
  })
});

const rejectBookingSchema = z.object({
  body: z.object({
    reason: z.string().optional()
  })
});

const updateTrackingSchema = z.object({
  body: z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180)
  })
});

module.exports = {
  createBookingSchema,
  reviewSchema,
  rejectBookingSchema,
  updateTrackingSchema
};
