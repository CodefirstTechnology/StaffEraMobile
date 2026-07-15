/** Reject minus sign while typing numeric rate/experience fields. */
export function sanitizeNonNegativeInput(value) {
  const raw = String(value ?? '')
  if (!raw.includes('-')) return raw
  return raw.replace(/-/g, '')
}

/** Validate optional non-negative number. Returns error message or empty string. */
export function validateNonNegativeNumber(value, fieldLabel) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return ''
  const num = Number(trimmed)
  if (!Number.isFinite(num)) return `${fieldLabel} must be a valid number`
  if (num < 0) return `${fieldLabel} cannot be negative`
  if (fieldLabel.toLowerCase().includes('rate') || fieldLabel.toLowerCase().includes('experience')) {
    const parts = trimmed.split('.')
    if (parts.length > 1 && parts[1].length > 2) {
      return `${fieldLabel} cannot have more than 2 decimal places`
    }
  }
  return ''
}

/** Validate required non-negative number. Returns error message or empty string. */
export function validateRequiredNonNegativeNumber(value, fieldLabel) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return `${fieldLabel} is required`
  return validateNonNegativeNumber(value, fieldLabel)
}

export const SKILLS_RATE_FIELDS = [
  { key: 'experience', label: 'Years of experience' },
  { key: 'hourlyRate', label: 'Hourly rate' },
  { key: 'monthlyRate', label: 'Monthly rate' },
]

export function emptySkillsRateErrors() {
  return { experience: '', hourlyRate: '', monthlyRate: '' }
}

export function validateSkillsRateFields(form, { required = true } = {}) {
  const errors = emptySkillsRateErrors()
  for (const { key, label } of SKILLS_RATE_FIELDS) {
    errors[key] = required
      ? validateRequiredNonNegativeNumber(form[key], label)
      : validateNonNegativeNumber(form[key], label)
  }
  return errors
}
