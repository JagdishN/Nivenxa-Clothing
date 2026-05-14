export function isValidEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())
}

export function isValidPhone(val: string): boolean {
  return /^[\+]?[\d\s\-\(\)]{8,}$/.test(val.trim())
}

export function isValidIdentifier(val: string): boolean {
  return isValidEmail(val) || isValidPhone(val)
}

export function isValidPassword(val: string): boolean {
  return val.length >= 8
}

export function isNonEmpty(val: string): boolean {
  return val.trim().length > 0
}

export function isValidOtp(val: string): boolean {
  return /^\d{4,6}$/.test(val.trim())
}
