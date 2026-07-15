/** Strip non-digits from a phone/mobile input value. */
export function digitsOnlyPhone(value) {
  return String(value ?? '').replace(/\D/g, '')
}

/** Validate required mobile number. Returns error message or empty string. */
export function validatePhoneRequired(phone, countryCode = '+91') {
  const digits = digitsOnlyPhone(phone)
  if (!digits) return 'Mobile number is required'
  if (countryCode === '+91') {
    if (digits.length !== 10) return 'India mobile number must be exactly 10 digits'
  } else {
    if (digits.length < 10) return 'Mobile number must be at least 10 digits'
    if (digits.length > 15) return 'Mobile number is too long'
  }
  return ''
}

/** Validate optional mobile number. Returns error message or empty string. */
export function validatePhoneOptional(phone, countryCode = '+91') {
  const digits = digitsOnlyPhone(phone)
  if (!digits) return ''
  if (countryCode === '+91') {
    if (digits.length !== 10) return 'India mobile number must be exactly 10 digits'
  } else {
    if (digits.length < 10) return 'Mobile number must be at least 10 digits'
    if (digits.length > 15) return 'Mobile number is too long'
  }
  return ''
}
