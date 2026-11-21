/**
 * Capa 7 (Infraestructura) - Adaptador criptográfico HMAC-SHA256, SHA-256 y decodificación Base64.
 */

import crypto from 'crypto';
import { computeQrSlotIndex } from '../../modules/attendance/domain/qrRotation.js';

export function computeHmacQrToken(sessionId, { nowMs = Date.now(), timeOffsetMs = 0, salt = 'qr-rotation-salt' } = {}) {
  const blockIndex = computeQrSlotIndex(nowMs, timeOffsetMs);
  return crypto
    .createHmac('sha256', salt)
    .update(`${sessionId}_${blockIndex}`)
    .digest('hex')
    .substring(0, 12);
}

export function decodeBase64ToBytes(canonicalBase64) {
  const buf = Buffer.from(canonicalBase64, 'base64');
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

export function computeSha256Hex(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
