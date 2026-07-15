const { z } = require("zod");
const { optionalPhone, requiredPhone, strictEmail } = require("./zodHelpers");

const emptyToUndefined = (val) =>
  val === undefined || val === null || String(val).trim() === "" ? undefined : val;

const SUPPORTED_LANGUAGES = ["en", "hi", "mr"];

const optionalFiniteCoord = (min, max) =>
  z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === "") return undefined;
      const n = Number(val);
      return Number.isFinite(n) ? n : undefined;
    },
    z.number().min(min).max(max).optional()
  );

const parseSkillsBody = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : val.trim() ? [val] : [];
    } catch {
      return val.trim() ? [val] : [];
    }
  }
  return [];
};

const registerServantSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: strictEmail("Invalid email address"),
    phone: requiredPhone,
    address: z.string().min(5, "Address is required"),
    skills: z.preprocess(parseSkillsBody, z.array(z.string()).min(1, "Select at least one skill")),
    city: z.preprocess(emptyToUndefined, z.string().optional()),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    preferredLanguage: z.preprocess(
      (val) => (SUPPORTED_LANGUAGES.includes(val) ? val : undefined),
      z.enum(SUPPORTED_LANGUAGES).optional()
    )
  })
});

const registerOwnerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: strictEmail("Invalid email address"),
    phone: optionalPhone,
    password: z.string().min(6, "Password must be at least 6 characters"),
    address: z.preprocess(emptyToUndefined, z.string().optional()),
    flatNo: z.string().optional(),
    building: z.string().optional(),
    area: z.string().optional(),
    city: z.preprocess(emptyToUndefined, z.string().optional()),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    preferredLanguage: z.enum(SUPPORTED_LANGUAGES).optional()
  })
});

const loginSchema = z.object({
  body: z.object({
    email: strictEmail(),
    password: z.string().min(1)
  })
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1)
  })
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: strictEmail()
  })
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    password: z.string().min(6)
  })
});

const updateLocationSchema = z.object({
  body: z.object({
    address: z.preprocess(emptyToUndefined, z.string().optional()),
    flatNo: z.string().optional(),
    building: z.string().optional(),
    area: z.string().optional(),
    city: z.preprocess(emptyToUndefined, z.string().optional()),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional()
  })
});

const updatePreferencesSchema = z.object({
  body: z.object({
    preferredLanguage: z.enum(SUPPORTED_LANGUAGES)
  })
});

module.exports = {
  registerOwnerSchema,
  registerServantSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateLocationSchema,
  updatePreferencesSchema,
  SUPPORTED_LANGUAGES
};
