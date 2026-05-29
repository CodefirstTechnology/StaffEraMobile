const { z } = require("zod");

const updateServantMeSchema = z.object({
  body: z.object({
    bio: z.string().optional(),
    profilePhoto: z.string().optional(),
    availableFrom: z.string().optional(),
    availableTo: z.string().optional(),
    workingDays: z.union([z.string(), z.array(z.string())]).optional(),
    offersSession: z.coerce.boolean().optional(),
    offersMonthly: z.coerce.boolean().optional(),
    weekOffDays: z.union([z.string(), z.array(z.string())]).optional(),
    hoursPerDay: z.coerce.number().optional(),
    availabilityNotes: z.string().optional()
  })
});

const createServantSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().min(6),
    bio: z.string().optional(),
    experience: z.coerce.number().optional(),
    hourlyRate: z.coerce.number().optional(),
    monthlyRate: z.coerce.number().optional(),
    availableFrom: z.string().optional(),
    availableTo: z.string().optional(),
    workingDays: z.union([z.string(), z.array(z.string())]).optional(),
    offersSession: z.coerce.boolean().optional(),
    offersMonthly: z.coerce.boolean().optional(),
    weekOffDays: z.union([z.string(), z.array(z.string())]).optional(),
    hoursPerDay: z.coerce.number().optional(),
    availabilityNotes: z.string().optional(),
    idProofType: z.string().optional(),
    skills: z.union([z.string(), z.array(z.string())]).optional()
  })
});

const updateServantSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    bio: z.string().optional(),
    experience: z.coerce.number().optional(),
    hourlyRate: z.coerce.number().optional(),
    monthlyRate: z.coerce.number().optional(),
    availableFrom: z.string().optional(),
    availableTo: z.string().optional(),
    workingDays: z.union([z.string(), z.array(z.string())]).optional(),
    offersSession: z.coerce.boolean().optional(),
    offersMonthly: z.coerce.boolean().optional(),
    weekOffDays: z.union([z.string(), z.array(z.string())]).optional(),
    hoursPerDay: z.coerce.number().optional(),
    availabilityNotes: z.string().optional(),
    idProofType: z.string().optional(),
    skills: z.union([z.string(), z.array(z.string())]).optional()
  })
});

const verifyServantSchema = z.object({
  body: z.object({
    status: z.enum(["VERIFIED", "REJECTED", "UNDER_REVIEW", "PENDING"]),
    reason: z.string().optional()
  })
});

module.exports = {
  updateServantMeSchema,
  createServantSchema,
  updateServantSchema,
  verifyServantSchema
};
