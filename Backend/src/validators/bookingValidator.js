const { z } = require("zod");

const createBookingSchema = z.object({
  body: z
    .object({
      servantId: z.coerce.number().int().positive(),
      bookingType: z.enum(["MONTHLY", "SESSION"]),
      monthlyStartDate: z.string().min(1).optional(),
      monthlyEndDate: z.string().min(1).optional(),
      hoursPerDay: z.coerce.number().optional(),
      workingDays: z.union([z.string(), z.array(z.string())]).optional(),
      sessionDate: z.string().min(1).optional(),
      sessionStartTime: z.string().optional(),
      sessionEndTime: z.string().optional(),
      sessionHours: z.coerce.number().optional(),
      address: z.string().optional(),
      latitude: z.coerce.number().min(-90).max(90).optional(),
      longitude: z.coerce.number().min(-180).max(180).optional(),
      notes: z.string().optional(),
      totalAmount: z.coerce.number().optional()
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
