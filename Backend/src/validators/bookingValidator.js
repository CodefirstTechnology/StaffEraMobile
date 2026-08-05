const { z } = require("zod");
const { optionalNumber, optionalPositiveInt } = require("./zodHelpers");

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const sessionSlotSchema = z.object({
  start: z.string().regex(TIME_PATTERN, "Invalid time slot start (use HH:MM)"),
  end: z.string().regex(TIME_PATTERN, "Invalid time slot end (use HH:MM)")
});

const timeToMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
};

const isValidTimeRange = (start, end) => timeToMinutes(end) > timeToMinutes(start);

const validateSessionSchedule = (data, ctx, { requireDate = true } = {}) => {
  const hasSlots = Array.isArray(data.sessionSlots) && data.sessionSlots.length > 0;
  const hasRange = data.sessionStartTime && data.sessionEndTime;

  if (requireDate && !data.sessionDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Session bookings require a visit date",
      path: ["sessionDate"]
    });
  }

  if (!hasSlots && !hasRange) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Session bookings require date and at least one time slot",
      path: ["sessionSlots"]
    });
    return;
  }

  if (hasRange) {
    if (!TIME_PATTERN.test(String(data.sessionStartTime))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid session start time (use HH:MM)",
        path: ["sessionStartTime"]
      });
    }
    if (!TIME_PATTERN.test(String(data.sessionEndTime))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid session end time (use HH:MM)",
        path: ["sessionEndTime"]
      });
    }
    if (
      TIME_PATTERN.test(String(data.sessionStartTime)) &&
      TIME_PATTERN.test(String(data.sessionEndTime)) &&
      !isValidTimeRange(data.sessionStartTime, data.sessionEndTime)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Session end time must be after start time",
        path: ["sessionEndTime"]
      });
    }
  }

  if (hasSlots) {
    for (const slot of data.sessionSlots) {
      if (!isValidTimeRange(slot.start, slot.end)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each session time slot must have end after start",
          path: ["sessionSlots"]
        });
        break;
      }
    }
  }
};

const validateOpenRequestLocation = (data, ctx) => {
  if (data.latitude == null || data.longitude == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Live location (latitude and longitude) is required for area requests",
      path: ["latitude"]
    });
  }
  if (!data.address?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Address is required for area requests",
      path: ["address"]
    });
  }
};

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
      sessionSlots: z.array(sessionSlotSchema).optional(),
      address: z.string().optional(),
      flatNo: z.string().optional(),
      building: z.string().optional(),
      area: z.string().optional(),
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
            message: "Monthly bookings require start and end dates",
            path: ["monthlyStartDate"]
          });
        }
      }

      if (data.bookingType === "SESSION") {
        validateSessionSchedule(data, ctx);
      }

      if (!data.servantId) {
        if (!data.requestedSkill?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Service category is required for area requests",
            path: ["requestedSkill"]
          });
        }
        validateOpenRequestLocation(data, ctx);
      } else if (data.latitude != null && data.longitude != null && !data.address?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Address is required when location coordinates are provided",
          path: ["address"]
        });
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
    reason: z
      .string({ required_error: "Decline reason is required" })
      .trim()
      .min(3, "Decline reason must be at least 3 characters")
      .max(500, "Decline reason cannot exceed 500 characters")
  })
});

const updateTrackingSchema = z.object({
  body: z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180)
  })
});

const verifyWorkOtpSchema = z.object({
  body: z.object({
    otp: z.string().regex(/^\d{4}$/, "OTP must be 4 digits")
  })
});

const respondExtensionSchema = z.object({
  body: z.object({
    accept: z.boolean()
  })
});

const updateBookingSchema = z.object({
  body: z
    .object({
      requestedSkill: z.string().optional(),
      monthlyStartDate: z.string().min(1).optional(),
      monthlyEndDate: z.string().min(1).optional(),
      hoursPerDay: optionalNumber(),
      workingDays: z.union([z.string(), z.array(z.string())]).optional(),
      sessionDate: z.string().min(1).optional(),
      sessionStartTime: z.string().optional(),
      sessionEndTime: z.string().optional(),
      sessionHours: optionalNumber(),
      sessionSlots: z.array(sessionSlotSchema).optional(),
      address: z.string().optional(),
      flatNo: z.string().optional(),
      building: z.string().optional(),
      area: z.string().optional(),
      latitude: optionalNumber(z.number().min(-90).max(90)),
      longitude: optionalNumber(z.number().min(-180).max(180)),
      notes: z.string().optional(),
      totalAmount: optionalNumber()
    })
    .superRefine((data, ctx) => {
      const keys = Object.keys(data);
      if (keys.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one field is required to update the booking"
        });
        return;
      }

      const hasSessionFields =
        data.sessionDate !== undefined ||
        data.sessionStartTime !== undefined ||
        data.sessionEndTime !== undefined ||
        data.sessionSlots !== undefined;

      if (hasSessionFields) {
        validateSessionSchedule(data, ctx, { requireDate: data.sessionDate !== undefined });
      }

      const hasMonthlyFields =
        data.monthlyStartDate !== undefined || data.monthlyEndDate !== undefined;

      if (hasMonthlyFields && (!data.monthlyStartDate || !data.monthlyEndDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Monthly bookings require start and end dates",
          path: ["monthlyStartDate"]
        });
      }

      const touchesLocation =
        data.address !== undefined ||
        data.latitude !== undefined ||
        data.longitude !== undefined;

      if (touchesLocation) {
        const lat = data.latitude;
        const lng = data.longitude;
        const address = data.address;
        if (lat != null && lng != null && !String(address || "").trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Address is required when location coordinates are provided",
            path: ["address"]
          });
        }
        if (String(address || "").trim() && (lat == null || lng == null)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Latitude and longitude are required with address",
            path: ["latitude"]
          });
        }
      }

      if (data.requestedSkill !== undefined && !String(data.requestedSkill).trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Service category cannot be empty",
          path: ["requestedSkill"]
        });
      }
    })
});

module.exports = {
  createBookingSchema,
  updateBookingSchema,
  reviewSchema,
  rejectBookingSchema,
  updateTrackingSchema,
  verifyWorkOtpSchema,
  respondExtensionSchema
};
