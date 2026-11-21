/**
 * Capa 3 (Aplicación) - Caso de uso de verificación de regla de 4 ojos (BR-08).
 * Depende únicamente de Dominio y Puertos (sin SQL ni Express).
 */
import { assertFourEyesApproval } from '../domain/fourEyes.js';

export function createFichaControlService({ academicRepository }) {
  return {
    async verifyDeletionApproval({ requestId, approverId }) {
      const request = await academicRepository.findDeletionRequestById(requestId);
      if (!request) {
        const err = new Error('Solicitud de eliminación no encontrada.');
        err.code = 'NOT_FOUND';
        err.status = 404;
        throw err;
      }
      assertFourEyesApproval({ requestedBy: request.requested_by, approvedBy: approverId });
      return request;
    }
  };
}
