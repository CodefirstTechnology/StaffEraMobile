const { z } = require("zod");

const emptyToUndefined = (val) =>
  val === undefined || val === null || String(val).trim() === "" ? undefined : val;

const SUPPORTED_LANGUAGES = ["en", "hi", "mr"];

const registerOwnerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.preprocess(emptyToUndefined, z.string().optional()),
    password: z.string().min(6, "Password must be at least 6 characters"),
    address: z.preprocess(emptyToUndefined, z.string().optional()),
    city: z.preprocess(emptyToUndefined, z.string().optional()),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    preferredLanguage: z.enum(SUPPORTED_LANGUAGES).optional()
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
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
    email: z.string().email()
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
    flatNo: z.preprocess(emptyToUndefined, z.string().optional()),
    building: z.preprocess(emptyToUndefined, z.string().optional()),
    area: z.preprocess(emptyToUndefined, z.string().optional()),
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
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateLocationSchema,
  updatePreferencesSchema,
  SUPPORTED_LANGUAGES
};
