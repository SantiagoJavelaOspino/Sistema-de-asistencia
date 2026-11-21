/**
 * Capa 5 (Puertos) - Contrato de repositorio de personas y asignaciones.
 */
export function createPersonRepositoryPort(impl) {
  return {
    findById: (id) => impl.findById(id),
    findActiveByIdentifier: (identifier) => impl.findActiveByIdentifier(identifier),
    isInstructorAssignedToUnit: (instructorId, unitId) => impl.isInstructorAssignedToUnit(instructorId, unitId)
  };
}
