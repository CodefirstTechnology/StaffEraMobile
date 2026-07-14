const { z } = require("zod");
const { optionalPhone } = require("./zodHelpers");

const emptyToUndefined = (val) =>
  val === undefined || val === null || String(val).trim() === "" ? undefined : val;

/** Preserves null so PATCH can clear optional string fields (e.g. agency name). */
const clearableOptionalString = z.preprocess(
  (val) => {
    if (val === undefined) return undefined;
    const trimmed = val === null ? "" : String(val).trim();
    return trimmed === "" ? null : trimmed;
  },
  z.union([z.string(), z.null()]).optional()
);

const MAX_RADIUS_KM = Number(process.env.MAX_SERVICE_RADIUS_KM) || 50;

const radiusKmField = z.coerce
  .number()
  .min(1, "Radius must be at least 1 km")
  .max(MAX_RADIUS_KM, `Radius cannot exceed ${MAX_RADIUS_KM} km`);

const updateAgentProfileSchema = z.object({
  body: z.object({
    agencyName: clearableOptionalString,
    address: z.string().min(5, "Agency location address is required"),
    city: z.preprocess(emptyToUndefined, z.string().optional()),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    serviceRadiusKm: radiusKmField.optional()
  })
});

const updateAgentSchema = z.object({
  body: z.object({
    agencyName: clearableOptionalString,
    address: z.preprocess(emptyToUndefined, z.string().min(5).optional()),
    city: z.preprocess(emptyToUndefined, z.string().optional()),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    serviceRadiusKm: radiusKmField.optional()
  })
});

const createAgentSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Agent name is required"),
    email: z.string().email("Valid email is required"),
    phone: optionalPhone,
    password: z.preprocess(emptyToUndefined, z.string().min(6).optional()),
    generatePassword: z.preprocess(
      (v) => v === true || String(v).toLowerCase() === "true",
      z.boolean().optional()
    ),
    agencyName: z.preprocess(emptyToUndefined, z.string().optional()),
    address: z.string().min(5, "Agency location address is required"),
    city: z.preprocess(emptyToUndefined, z.string().optional()),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    serviceRadiusKm: radiusKmField.optional()
  })
});

module.exports = {
  updateAgentProfileSchema,
  updateAgentSchema,
  createAgentSchema
};
