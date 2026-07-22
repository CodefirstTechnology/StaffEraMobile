/** Strip non-digits from a phone/mobile input value. */
export function digitsOnlyPhone(value: string): string {
  return value.replace(/\D/g, '');
}

/** True when value contains at least `min` digits (default 10). */
export function isValidPhone(value: string, min = 10): boolean {
  const digits = digitsOnlyPhone(value);
  return digits.length >= min && digits.length <= 15;
}

export type PhoneValidationKind = 'required' | 'invalid' | null;

/** Returns validation kind for inline field errors. */
export function getPhoneValidationKind(
  value: string,
  options: { required?: boolean; exactLength?: number } = {},
): PhoneValidationKind {
  const digits = digitsOnlyPhone(value);
  if (!digits) return options.required ? 'required' : null;
  if (options.exactLength != null) {
    return digits.length !== options.exactLength ? 'invalid' : null;
  }
  if (digits.length < 10 || digits.length > 15) return 'invalid';
  return null;
}
