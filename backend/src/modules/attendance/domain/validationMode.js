/**
 * Capa 4 (Dominio) - Regla BR-05: Validación estricta del modo de validación de sala.
 * Cero dependencias externas.
 */

export const VALID_VALIDATION_MODES = Object.freeze(['IP_AND_QR', 'QR_ONLY', 'IP_ONLY']);

export class DomainValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DomainValidationError';
    this.code = code;
    this.status = 400;
  }
}

export function resolveValidationMode({ validationMode, ipCheckEnabled = true, qrEnabled = true } = {}) {
  const isIpActive = ipCheckEnabled !== false && ipCheckEnabled !== 0 && ipCheckEnabled !== '0';
  const isQrActive = qrEnabled !== false && qrEnabled !== 0 && qrEnabled !== '0';

  if (validationMode !== undefined && validationMode !== null && validationMode !== '') {
    const normalized = String(validationMode).trim().toUpperCase();
    if (!VALID_VALIDATION_MODES.includes(normalized)) {
      throw new DomainValidationError(
        'INVALID_VALIDATION_MODE',
        `Regla de negocio BR-05: validationMode inválido ('${validationMode}'). Valores permitidos: ${VALID_VALIDATION_MODES.join(', ')}.`
      );
    }
    return {
      validationMode: normalized,
      ipCheckEnabled: normalized === 'IP_AND_QR' || normalized === 'IP_ONLY',
      qrEnabled: normalized === 'IP_AND_QR' || normalized === 'QR_ONLY'
    };
  }

  if (!isIpActive && !isQrActive) {
    throw new DomainValidationError(
      'INVALID_VALIDATION_MODE',
      'Regla de negocio BR-05: Al menos un método de validación (QR o IP) debe estar activo para crear la sala.'
    );
  }

  if (isIpActive && isQrActive) {
    return { validationMode: 'IP_AND_QR', ipCheckEnabled: true, qrEnabled: true };
  }
  if (isQrActive) {
    return { validationMode: 'QR_ONLY', ipCheckEnabled: false, qrEnabled: true };
  }
  return { validationMode: 'IP_ONLY', ipCheckEnabled: true, qrEnabled: false };
}
