const { z } = require("zod");
const { optionalNumber } = require("./zodHelpers");

const bankDetailsFields = {
  bankAccountHolder: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankUpiId: z.string().optional()
};

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
    hoursPerDay: optionalNumber(),
    availabilityNotes: z.string().optional(),
    ...bankDetailsFields
  })
});

const createServantSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().min(6),
    bio: z.string().optional(),
    experience: optionalNumber(),
    hourlyRate: optionalNumber(),
    monthlyRate: optionalNumber(),
    availableFrom: z.string().optional(),
    availableTo: z.string().optional(),
    workingDays: z.union([z.string(), z.array(z.string())]).optional(),
    offersSession: z.coerce.boolean().optional(),
    offersMonthly: z.coerce.boolean().optional(),
    weekOffDays: z.union([z.string(), z.array(z.string())]).optional(),
    hoursPerDay: optionalNumber(),
    availabilityNotes: z.string().optional(),
    idProofType: z.string().optional(),
    skills: z.union([z.string(), z.array(z.string())]).optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    ...bankDetailsFields
  })
});

const updateServantSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    bio: z.string().optional(),
    experience: optionalNumber(),
    hourlyRate: optionalNumber(),
    monthlyRate: optionalNumber(),
    availableFrom: z.string().optional(),
    availableTo: z.string().optional(),
    workingDays: z.union([z.string(), z.array(z.string())]).optional(),
    offersSession: z.coerce.boolean().optional(),
    offersMonthly: z.coerce.boolean().optional(),
    weekOffDays: z.union([z.string(), z.array(z.string())]).optional(),
    hoursPerDay: optionalNumber(),
    availabilityNotes: z.string().optional(),
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
