/**
 * Capa 5 (Puertos) - Contrato de repositorio de sesiones de asistencia.
 */
export function createSessionRepositoryPort(impl) {
  return {
    findById: (sessionId) => impl.findById(sessionId),
    findActiveSessions: () => impl.findActiveSessions()
  };
}
