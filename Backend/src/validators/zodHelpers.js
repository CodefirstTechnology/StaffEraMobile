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

module.exports = {
  emptyToUndefined,
  phoneDigitsOnly,
  requiredPhone,
  optionalPhone,
  optionalNumber,
  optionalInt,
  optionalPositiveInt
};
