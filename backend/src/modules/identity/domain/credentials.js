/**
 * Capa 4 (Dominio) - Reglas puras de identidad y credenciales (BR-10).
 * Cero dependencias externas.
 */

export const MIN_PASSWORD_LENGTH = 6;
export const VALID_ROLES = Object.freeze(['APRENDIZ', 'INSTRUCTOR', 'COORDINADOR']);

export function validatePasswordStrength(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      code: 'VALIDATION_ERROR',
      message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    };
  }
  return { valid: true };
}

export function sanitizeIdentifier(raw) {
  if (raw === null || raw === undefined) return '';
  return String(raw).trim();
}
