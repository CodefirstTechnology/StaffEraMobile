export const PASSWORD_MIN_LENGTH = 6;

export type PasswordStrengthLevel = 'empty' | 'tooShort' | 'weak' | 'medium' | 'strong';

export type PasswordStrength = {
  level: PasswordStrengthLevel;
  /** 0–4 criteria met (length + upper + lower + digit + special) */
  criteriaMet: number;
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
};

export function getPasswordStrength(password: string): PasswordStrength {
  const val = String(password ?? '');
  const hasMinLength = val.length >= PASSWORD_MIN_LENGTH;
  const hasUpper = /[A-Z]/.test(val);
  const hasLower = /[a-z]/.test(val);
  const hasDigit = /[0-9]/.test(val);
  const hasSpecial = /[^A-Za-z0-9]/.test(val);

  if (!val) {
    return {
      level: 'empty',
      criteriaMet: 0,
      hasMinLength,
      hasUpper,
      hasLower,
      hasDigit,
      hasSpecial,
    };
  }

  if (!hasMinLength) {
    return {
      level: 'tooShort',
      criteriaMet: 0,
      hasMinLength,
      hasUpper,
      hasLower,
      hasDigit,
      hasSpecial,
    };
  }

  const typeCriteria = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;

  if (typeCriteria <= 2) {
    return {
      level: 'weak',
      criteriaMet: 1 + typeCriteria,
      hasMinLength,
      hasUpper,
      hasLower,
      hasDigit,
      hasSpecial,
    };
  }

  if (typeCriteria === 3) {
    return {
      level: 'medium',
      criteriaMet: 1 + typeCriteria,
      hasMinLength,
      hasUpper,
      hasLower,
      hasDigit,
      hasSpecial,
    };
  }

  return {
    level: 'strong',
    criteriaMet: 5,
    hasMinLength,
    hasUpper,
    hasLower,
    hasDigit,
    hasSpecial,
  };
}
