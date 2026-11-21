/**
 * Capa 4 (Dominio) - Regla BR-08: Principio de Cuatro Ojos (Two-Person Rule).
 * Cero dependencias externas.
 */

export function assertFourEyesApproval({ requestedBy, approvedBy }) {
  if (!requestedBy || !approvedBy) {
    const err = new Error('Se requieren identificadores válidos de solicitante y aprobador.');
    err.code = 'VALIDATION_ERROR';
    err.status = 400;
    throw err;
  }
  if (String(requestedBy) === String(approvedBy)) {
    const err = new Error('Regla BR-08 (Cuatro Ojos): El coordinador que solicita la eliminación no puede autoaprobarla.');
    err.code = 'FOUR_EYES_VIOLATION';
    err.status = 403;
    throw err;
  }
  return true;
}
