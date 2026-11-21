/**
 * Capa 3 (Aplicación) - Servicio de plazo de excusas (BR-07).
 * Depende únicamente de Dominio y Puertos (sin SQL ni Express).
 */
import { isWithinBusinessDaysPure } from '../domain/businessDays.js';

export function createExcuseDeadlineService({ excuseRepository, clock = () => new Date() }) {
  return {
    async isWithinStatutoryDeadline(sessionDateIso, referenceDate = clock()) {
      const holidaySet = await excuseRepository.listActiveHolidays();
      return isWithinBusinessDaysPure(sessionDateIso, referenceDate, holidaySet);
    }
  };
}
