/** Strip non-digits from a phone/mobile input value. */
export function digitsOnlyPhone(value) {
  return String(value ?? '').replace(/\D/g, '')
}

/** Validate required mobile number. Returns error message or empty string. */
export function validatePhoneRequired(phone) {
  const digits = digitsOnlyPhone(phone)
  if (!digits) return 'Mobile number is required'
  if (digits.length < 10) return 'Mobile number must be at least 10 digits'
  if (digits.length > 15) return 'Mobile number is too long'
  return ''
}

/** Validate optional mobile number. Returns error message or empty string. */
export function validatePhoneOptional(phone) {
  const digits = digitsOnlyPhone(phone)
  if (!digits) return ''
  if (digits.length < 10) return 'Mobile number must be at least 10 digits'
  if (digits.length > 15) return 'Mobile number is too long'
  return ''
}
