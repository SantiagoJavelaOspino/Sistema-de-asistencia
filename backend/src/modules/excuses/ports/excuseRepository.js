/**
 * Capa 5 (Puertos) - Contrato de repositorio de excusas y festivos.
 */
export function createExcuseRepositoryPort(impl) {
  return {
    findById: (id) => impl.findById(id),
    listActiveHolidays: () => impl.listActiveHolidays()
  };
}
