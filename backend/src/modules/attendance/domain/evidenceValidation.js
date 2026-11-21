/**
 * Capa 4 (Dominio) - Validación pura de evidencias (Base64 canónico, extensión, MIME, tamaño y magic bytes).
 * Cero dependencias externas (sin Buffer, fs ni path).
 */

import { DomainValidationError } from './validationMode.js';

export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = Object.freeze({
  '.pdf': ['application/pdf'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'],
  '.xls': ['application/vnd.ms-excel', 'application/octet-stream'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg']
});

const CANONICAL_BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;

export function extractExtension(fileName = '') {
  const idx = String(fileName).lastIndexOf('.');
  if (idx === -1) return '';
  return String(fileName).slice(idx).toLowerCase();
}

export function parseDataUrlOrBase64(rawFileData) {
  if (!rawFileData || typeof rawFileData !== 'string') {
    throw new DomainValidationError('INVALID_EVIDENCE', 'El contenido de la evidencia es requerido.');
  }
  let declaredMime = null;
  let base64Body = rawFileData.trim();

  if (base64Body.startsWith('data:')) {
    const commaIdx = base64Body.indexOf(',');
    if (commaIdx === -1) {
      throw new DomainValidationError('INVALID_BASE64', 'Formato Data URL inválido.');
    }
    const header = base64Body.slice(0, commaIdx);
    if (!header.includes(';base64')) {
      throw new DomainValidationError('INVALID_BASE64', 'La evidencia debe estar codificada en Base64.');
    }
    const mimeMatch = header.match(/^data:([^;]+);base64$/i);
    if (mimeMatch) declaredMime = mimeMatch[1].toLowerCase();
    base64Body = base64Body.slice(commaIdx + 1).trim();
  }

  const normalized = base64Body.replace(/\s+/g, '');
  if (!normalized || normalized.length % 4 !== 0 || !CANONICAL_BASE64_REGEX.test(normalized)) {
    throw new DomainValidationError('INVALID_BASE64', 'El archivo adjunto contiene Base64 corrupto o no canónico.');
  }

  return { declaredMime, base64: normalized };
}

export function hasValidMagicBytes(bytes, ext) {
  if (!bytes || bytes.length < 4) return false;
  switch (ext) {
    case '.pdf':
      // %PDF-
      return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    case '.xlsx':
      // ZIP header: PK\x03\x04
      return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
    case '.xls':
      // OLE2 compound document: D0 CF 11 E0
      return bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
    case '.png':
      // 89 50 4E 47
      return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    case '.jpg':
    case '.jpeg':
      // FF D8 FF
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    default:
      return false;
  }
}

export function validateEvidencePayload({ fileName, rawFileData, decodedBytes, declaredMimeOverride }) {
  const ext = extractExtension(fileName);
  const allowedMimes = ALLOWED_EXTENSIONS[ext];
  if (!allowedMimes) {
    throw new DomainValidationError(
      'INVALID_FILE_TYPE',
      'Solo se permiten evidencias en formato .pdf, .xlsx, .xls, .png o .jpg.'
    );
  }

  const { declaredMime } = parseDataUrlOrBase64(rawFileData);
  const effectiveMime = (declaredMimeOverride || declaredMime || allowedMimes[0]).toLowerCase();

  if (!allowedMimes.includes(effectiveMime)) {
    throw new DomainValidationError(
      'MIME_MISMATCH',
      `El tipo MIME (${effectiveMime}) no coincide con la extensión del archivo (${ext}).`
    );
  }

  if (!decodedBytes || decodedBytes.length === 0) {
    throw new DomainValidationError('EMPTY_FILE', 'El archivo adjunto está vacío.');
  }

  if (decodedBytes.length > MAX_EVIDENCE_BYTES) {
    throw new DomainValidationError('FILE_TOO_LARGE', 'El archivo excede el tamaño máximo permitido de 10 MB.');
  }

  if (!hasValidMagicBytes(decodedBytes, ext)) {
    throw new DomainValidationError(
      'INVALID_FILE_SIGNATURE',
      `La firma binaria del archivo no corresponde a un documento válido (${ext}).`
    );
  }

  return {
    extension: ext,
    mimeType: allowedMimes[0],
    sizeBytes: decodedBytes.length
  };
}
