/**
 * Capa 6 (Persistencia) - Implementación SQLite/PostgreSQL del repositorio de identidad.
 */
import { get } from '../../../db.js';

export const sqlPersonRepository = {
  async findById(id) {
    return get('SELECT * FROM people WHERE id = ?', [id]);
  },

  async findActiveByIdentifier(rawIdentifier) {
    const clean = String(rawIdentifier || '').trim();
    if (!clean) return null;
    if (clean.includes('@')) {
      return get('SELECT * FROM people WHERE LOWER(email) = LOWER(?) AND active = 1', [clean]);
    }
    const cleanDoc = clean.replace(/\D/g, '');
    return get(
      'SELECT * FROM people WHERE (documento = ? OR LOWER(email) = LOWER(?)) AND active = 1',
      [cleanDoc, clean]
    );
  },

  async isInstructorAssignedToUnit(instructorId, unitId) {
    const row = await get(
      'SELECT id FROM instructor_assignments WHERE instructor_id = ? AND unit_id = ?',
      [instructorId, unitId]
    );
    return Boolean(row);
  }
};
