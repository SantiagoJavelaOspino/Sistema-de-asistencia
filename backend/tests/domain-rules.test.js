/**
 * Pruebas unitarias puras de Capa 4 (Dominio) y guardrails de Capa 7 (Config).
 * No requieren servidor HTTP ni base de datos.
 */
import assert from 'node:assert/strict';
import { resolveValidationMode, DomainValidationError } from '../src/modules/attendance/domain/validationMode.js';
import { calculateAttendanceBlocks } from '../src/modules/attendance/domain/punctuality.js';
import { QR_WINDOW_MS, QR_LEEWAY_SLOTS, computeQrSlotIndex, getAllowedQrOffsetsMs, matchToken } from '../src/modules/attendance/domain/qrRotation.js';
import { parseDataUrlOrBase64, validateEvidencePayload } from '../src/modules/attendance/domain/evidenceValidation.js';
import { isWithinBusinessDaysPure } from '../src/modules/excuses/domain/businessDays.js';
import { computeHmacQrToken, decodeBase64ToBytes } from '../src/shared/infrastructure/hmac.js';
import { resolveJwtSecret } from '../src/shared/infrastructure/config.js';

export async function runDomainUnitTests() {
  console.log('\n[TEST SUITE] Reglas Puras de Dominio (Capa 4) y Guardrails');

  // BR-05: validationMode estricto
  assert.throws(
    () => resolveValidationMode({ validationMode: 'NONE', ipCheckEnabled: true, qrEnabled: true }),
    (err) => err instanceof DomainValidationError && err.code === 'INVALID_VALIDATION_MODE'
  );
  assert.throws(
    () => resolveValidationMode({ validationMode: 'UNKNOWN_MODE' }),
    (err) => err instanceof DomainValidationError && err.code === 'INVALID_VALIDATION_MODE'
  );
  assert.throws(
    () => resolveValidationMode({ ipCheckEnabled: false, qrEnabled: false }),
    (err) => err instanceof DomainValidationError && err.code === 'INVALID_VALIDATION_MODE'
  );
  assert.deepEqual(resolveValidationMode({ validationMode: 'QR_ONLY' }), {
    validationMode: 'QR_ONLY',
    ipCheckEnabled: false,
    qrEnabled: true
  });
  console.log('  ✓ BR-05: enum validationMode estricto validado');

  // BR-03 / ADR-002: QR 15s + 1 leeway con reloj fijo
  assert.equal(QR_WINDOW_MS, 15_000);
  assert.equal(QR_LEEWAY_SLOTS, 1);
  assert.deepEqual(getAllowedQrOffsetsMs(), [0, -15_000]);
  const fixedNow = 1_700_000_000_000;
  const currentSlot = computeQrSlotIndex(fixedNow, 0);
  const prevSlot = computeQrSlotIndex(fixedNow, -15_000);
  const expiredSlot = computeQrSlotIndex(fixedNow, -30_000);
  assert.equal(currentSlot - prevSlot, 1);
  assert.equal(currentSlot - expiredSlot, 2);

  const tokCurrent = computeHmacQrToken('ses_fixed', { nowMs: fixedNow, timeOffsetMs: 0 });
  const tokPrev = computeHmacQrToken('ses_fixed', { nowMs: fixedNow, timeOffsetMs: -15_000 });
  const tokOld = computeHmacQrToken('ses_fixed', { nowMs: fixedNow, timeOffsetMs: -30_000 });
  const allowedTokens = getAllowedQrOffsetsMs().map((off) => computeHmacQrToken('ses_fixed', { nowMs: fixedNow, timeOffsetMs: off }));
  assert.equal(allowedTokens.some((t) => matchToken(tokCurrent, t)), true);
  assert.equal(allowedTokens.some((t) => matchToken(tokPrev, t)), true);
  assert.equal(allowedTokens.some((t) => matchToken(tokOld, t)), false, 'Token de 2 franjas atrás debe ser rechazado');
  console.log('  ✓ BR-03 / ADR-002: QR 15s + 1 franja de tolerancia con reloj fijo validado');

  // BR-02: Puntualidad pura
  assert.equal(calculateAttendanceBlocks(15).horas_validadas_asistencia, 6);
  assert.equal(calculateAttendanceBlocks(15.01).horas_validadas_asistencia, 5);
  assert.equal(calculateAttendanceBlocks(301).horas_validadas_asistencia, 0);
  console.log('  ✓ BR-02: fórmula pura H(delay) validada');

  // Evidencias: Base64 canónico, MIME y magic bytes
  assert.throws(() => parseDataUrlOrBase64('%%%not-base64%%%'), (err) => err.code === 'INVALID_BASE64');
  const fakePdf = Buffer.from('NOT_A_PDF_HEADER').toString('base64');
  assert.throws(
    () => validateEvidencePayload({ fileName: 'fake.pdf', rawFileData: fakePdf, decodedBytes: decodeBase64ToBytes(fakePdf) }),
    (err) => err.code === 'INVALID_FILE_SIGNATURE'
  );
  const validPdf = Buffer.from('%PDF-1.4 valid content').toString('base64');
  const okPdf = validateEvidencePayload({ fileName: 'ok.pdf', rawFileData: validPdf, decodedBytes: decodeBase64ToBytes(validPdf) });
  assert.equal(okPdf.mimeType, 'application/pdf');
  assert.throws(
    () => validateEvidencePayload({ fileName: 'ok.pdf', rawFileData: validPdf, decodedBytes: decodeBase64ToBytes(validPdf), declaredMimeOverride: 'image/png' }),
    (err) => err.code === 'MIME_MISMATCH'
  );
  console.log('  ✓ Evidencias: Base64 canónico, MIME y magic bytes validados');

  // BR-07: 3 días hábiles con festivo y frontera 23:59:59
  const holidays = new Set(['2026-03-23']);
  assert.equal(isWithinBusinessDaysPure('2026-03-20T10:00:00-05:00', new Date('2026-03-26T23:59:59-05:00'), holidays), true);
  assert.equal(isWithinBusinessDaysPure('2026-03-20T10:00:00-05:00', new Date('2026-03-27T00:00:00-05:00'), holidays), false);
  console.log('  ✓ BR-07: cálculo puro de 3 días hábiles con festivos colombianos validado');

  // Config guardrail: producción exige JWT_SECRET >= 32 bytes
  assert.throws(() => resolveJwtSecret({ NODE_ENV: 'production' }), /FATAL_SECURITY_CONFIG/);
  assert.throws(() => resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'short-secret' }), /FATAL_SECURITY_CONFIG/);
  assert.equal(
    resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'a_very_strong_production_secret_key_32bytes_plus!' }),
    'a_very_strong_production_secret_key_32bytes_plus!'
  );
  console.log('  ✓ Guardrail JWT_SECRET en producción validado');
}

if (process.argv[1] && process.argv[1].endsWith('domain-rules.test.js')) {
  runDomainUnitTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
