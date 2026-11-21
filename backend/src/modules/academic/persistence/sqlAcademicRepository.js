/**
 * Capa 6 (Persistencia) - Implementación SQLite/PostgreSQL de gobierno académico.
 */
import { get } from '../../../db.js';

export const sqlAcademicRepository = {
  async findUnitById(unitId) {
    return get('SELECT * FROM academic_units WHERE id = ?', [unitId]);
  },

  async findDeletionRequestById(requestId) {
    return get('SELECT * FROM deletion_requests WHERE id = ?', [requestId]);
  }
};
