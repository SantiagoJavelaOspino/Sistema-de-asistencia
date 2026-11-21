/**
 * Capa 6 (Persistencia) - Implementación SQLite/PostgreSQL del repositorio de sesiones.
 */
import { get, query } from '../../../db.js';

export const sqlSessionRepository = {
  async findById(sessionId) {
    return get('SELECT * FROM attendance_sessions WHERE id = ?', [sessionId]);
  },

  async findActiveSessions() {
    return query("SELECT * FROM attendance_sessions WHERE LOWER(status) IN ('active', 'open')");
  }
};
