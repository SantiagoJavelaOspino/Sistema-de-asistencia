/**
 * Capa 4 (Dominio) - Regla BR-03 / ADR-002: Rotación de QR cada 15s + 1 franja de tolerancia.
 * Cero dependencias externas (sin crypto, sin process.env, reloj inyectable).
 */

export const QR_WINDOW_MS = 15_000;
export const QR_LEEWAY_SLOTS = 1;

export function computeQrSlotIndex(nowMs, timeOffsetMs = 0) {
  return Math.floor((nowMs + timeOffsetMs) / QR_WINDOW_MS);
}

/**
 * Devuelve los offsets en ms permitidos: ventana actual (0) y la franja anterior (-QR_WINDOW_MS).
 */
export function getAllowedQrOffsetsMs() {
  const offsets = [0];
  for (let i = 1; i <= QR_LEEWAY_SLOTS; i++) {
    offsets.push(-i * QR_WINDOW_MS);
  }
  return offsets;
}

/**
 * Compara token QR completo (12 chars) o código manual CSR (6 chars).
 */
export function matchToken(inputToken, actualToken) {
  if (!inputToken || !actualToken) return false;
  const cleanInput = String(inputToken).trim();
  const cleanActual = String(actualToken).trim();
  if (cleanInput.length === 6) {
    return cleanActual.substring(0, 6).toUpperCase() === cleanInput.toUpperCase();
  }
  return cleanActual.toLowerCase() === cleanInput.toLowerCase();
}
