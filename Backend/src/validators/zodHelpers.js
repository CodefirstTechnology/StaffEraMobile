const { z } = require("zod");

const emptyToUndefined = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return value;
};

const phoneDigitsOnly = (val) => String(val ?? "").replace(/\D/g, "");

/** Required mobile — digits only, 10–15 characters. */
const requiredPhone = z.preprocess(
  (val) => phoneDigitsOnly(val),
  z
    .string()
    .min(10, "Mobile number must be at least 10 digits")
    .max(15, "Mobile number is too long")
);

/** Optional mobile — empty allowed; otherwise digits only, 10–15 characters. */
const optionalPhone = z.preprocess(
  (val) => {
    const digits = phoneDigitsOnly(val);
    return digits || undefined;
  },
  z
    .string()
    .min(10, "Mobile number must be at least 10 digits")
    .max(15, "Mobile number is too long")
    .optional()
);

const optionalNumber = (schema = z.number()) =>
  z.preprocess(
    emptyToUndefined,
    z
      .union([z.undefined(), z.coerce.number().pipe(schema)])
      .optional()
  );

const optionalInt = () => optionalNumber(z.number().int());
const optionalPositiveInt = () => optionalNumber(z.number().int().positive());

const optionalNonNegativeNumber = () =>
  optionalNumber(z.number().min(0, "Must be 0 or greater"));

const optionalRateNumber = () =>
  optionalNumber(
    z.number()
      .min(0, "Must be 0 or greater")
      .refine(
        (val) => {
          const str = String(val);
          const parts = str.split(".");
          return parts.length <= 1 || parts[1].length <= 2;
        },
        { message: "Rate cannot have more than 2 decimal places" }
      )
  );

const booleanString = () => z.preprocess(
  (v) => {
    if (v === undefined || v === null) return undefined;
    if (v === true || v === false) return v;
    return String(v).toLowerCase() === "true";
  },
  z.boolean()
);

const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9]+([._-]?[a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-]?[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;

const strictEmail = (msg = "Invalid email address") =>
  z.string().regex(STRICT_EMAIL_REGEX, msg);

module.exports = {
  emptyToUndefined,
  phoneDigitsOnly,
  requiredPhone,
  optionalPhone,
  optionalNumber,
  optionalInt,
  optionalPositiveInt,
  optionalNonNegativeNumber,
  optionalRateNumber,
  booleanString,
  strictEmail,
};
