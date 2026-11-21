/**
 * Capa 6 (Persistencia) - Implementación SQLite/PostgreSQL del repositorio de excusas y festivos.
 */
import { get, query } from '../../../db.js';

export const sqlExcuseRepository = {
  async findById(id) {
    return get('SELECT * FROM excuses WHERE id = ?', [id]);
  },

  async listActiveHolidays() {
    const rows = await query('SELECT date FROM holidays WHERE active = 1');
    return new Set(rows.map((r) => r.date));
  }
};
