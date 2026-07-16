const { z } = require("zod");
const { optionalNumber, optionalNonNegativeNumber, optionalRateNumber, requiredPhone, optionalPhone, strictEmail, booleanString } = require("./zodHelpers");

const bankDetailsFields = {
  bankAccountHolder: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankUpiId: z.string().optional()
};

const updateServantMeSchema = z.object({
  body: z.object({
    bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    profilePhoto: z.string().optional(),
    availableFrom: z.string().optional(),
    availableTo: z.string().optional(),
    workingDays: z.union([z.string(), z.array(z.string())]).optional(),
    offersSession: booleanString().optional(),
    offersMonthly: booleanString().optional(),
    weekOffDays: z.union([z.string(), z.array(z.string())]).optional(),
    hoursPerDay: optionalNonNegativeNumber(),
    availabilityNotes: z.string().max(500, "Availability notes cannot exceed 500 characters").optional(),
    ...bankDetailsFields
  })
});

const createServantSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: strictEmail(),
    phone: requiredPhone,
    password: z.string().min(6),
    bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
    experience: optionalRateNumber().refine(val => val === undefined || val === null || val < 20, "Years of experience must be under 20 years"),
    hourlyRate: optionalRateNumber().refine(val => val === undefined || val === null || val < 999, "Hourly rate must be under 999"),
    monthlyRate: optionalRateNumber().refine(val => val === undefined || val === null || val < 30000, "Monthly rate must be under 30000"),
    availableFrom: z.string().optional(),
    availableTo: z.string().optional(),
    workingDays: z.union([z.string(), z.array(z.string())]).optional(),
    offersSession: booleanString().optional(),
    offersMonthly: booleanString().optional(),
    weekOffDays: z.union([z.string(), z.array(z.string())]).optional(),
    hoursPerDay: optionalNonNegativeNumber(),
    availabilityNotes: z.string().max(500, "Availability notes cannot exceed 500 characters").optional(),
    idProofType: z.string().optional(),
    skills: z.union([z.string(), z.array(z.string())]).optional(),
    address: z.string().max(500, "Address cannot exceed 500 characters").optional(),
    city: z.string().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    ...bankDetailsFields
  })
});

const updateServantSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: optionalPhone,
    address: z.string().max(500, "Address cannot exceed 500 characters").optional(),
    city: z.string().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
    experience: optionalRateNumber().refine(val => val === undefined || val === null || val < 20, "Years of experience must be under 20 years"),
    hourlyRate: optionalRateNumber().refine(val => val === undefined || val === null || val < 999, "Hourly rate must be under 999"),
    monthlyRate: optionalRateNumber().refine(val => val === undefined || val === null || val < 30000, "Monthly rate must be under 30000"),
    availableFrom: z.string().optional(),
    availableTo: z.string().optional(),
    workingDays: z.union([z.string(), z.array(z.string())]).optional(),
    offersSession: booleanString().optional(),
    offersMonthly: booleanString().optional(),
    weekOffDays: z.union([z.string(), z.array(z.string())]).optional(),
    hoursPerDay: optionalNonNegativeNumber(),
    availabilityNotes: z.string().max(500, "Availability notes cannot exceed 500 characters").optional(),
    idProofType: z.string().optional(),
    skills: z.union([z.string(), z.array(z.string())]).optional(),
    ...bankDetailsFields
  })
});

const setServantPasswordSchema = z.object({
  body: z.object({
    password: z.string().min(6).optional(),
    generatePassword: z.coerce.boolean().optional()
  })
});

const verifyServantSchema = z.object({
  body: z.object({
    status: z.enum(["VERIFIED", "REJECTED", "UNDER_REVIEW", "PENDING"]),
    reason: z.string().optional(),
    password: z.string().min(6).optional(),
    generatePassword: z.coerce.boolean().optional()
  })
});

module.exports = {
  updateServantMeSchema,
  createServantSchema,
  updateServantSchema,
  setServantPasswordSchema,
  verifyServantSchema
};
