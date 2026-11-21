/**
 * Capa 5 (Puertos) - Contrato de repositorio académico (fichas, solicitudes de eliminación).
 */
export function createAcademicRepositoryPort(impl) {
  return {
    findUnitById: (unitId) => impl.findUnitById(unitId),
    findDeletionRequestById: (requestId) => impl.findDeletionRequestById(requestId)
  };
}
