export function sanitizeNonNegativeInput(value) {
  return value;
}

/** Validate optional non-negative number. Returns error message or empty string. */
export function validateNonNegativeNumber(value, fieldLabel, config) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return `${fieldLabel} must be a valid number`;
  if (num < 0) return `${fieldLabel} cannot be negative`;
  if (
    fieldLabel.toLowerCase().includes("rate") ||
    fieldLabel.toLowerCase().includes("experience")
  ) {
    const parts = trimmed.split(".");
    if (parts.length > 1 && parts[1].length > 2) {
      return `${fieldLabel} cannot have more than 2 decimal places`;
    }
  }
  if (fieldLabel.toLowerCase().includes("experience") && num > 50) {
    return "Years of experience must be under 50 years";
  }
  if (fieldLabel.toLowerCase().includes("hourly rate")) {
    const min = config?.minHourlyRate ?? 50;
    const max = config?.maxHourlyRate ?? 1000;
    if (num < min || num > max) {
      return `Hourly rate must be between ₹${min} and ₹${max}`;
    }
  }
  if (fieldLabel.toLowerCase().includes("monthly rate")) {
    const min = config?.minMonthlyRate ?? 3000;
    const max = config?.maxMonthlyRate ?? 50000;
    if (num < min || num > max) {
      return `Monthly rate must be between ₹${min.toLocaleString("en-IN")} and ₹${max.toLocaleString("en-IN")}`;
    }
  }
  return "";
}

/** Validate required non-negative number. Returns error message or empty string. */
export function validateRequiredNonNegativeNumber(value, fieldLabel, config) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return `${fieldLabel} is required`;
  return validateNonNegativeNumber(value, fieldLabel, config);
}

export const SKILLS_RATE_FIELDS = [
  { key: "experience", label: "Years of experience" },
  { key: "hourlyRate", label: "Hourly rate" },
  { key: "monthlyRate", label: "Monthly rate" },
];

export function emptySkillsRateErrors() {
  return { experience: "", hourlyRate: "", monthlyRate: "" };
}

export function validateSkillsRateFields(form, { required = true, config } = {}) {
  const errors = emptySkillsRateErrors();
  for (const { key, label } of SKILLS_RATE_FIELDS) {
    errors[key] = required
      ? validateRequiredNonNegativeNumber(form[key], label, config)
      : validateNonNegativeNumber(form[key], label, config);
  }
  return errors;
}
