/**
 * Capa 4 (Dominio) - Regla BR-02: Fórmula determinística de puntualidad H(delay).
 * Cero dependencias externas.
 */

export function calculateAttendanceBlocks(delayMinutes) {
  const scheduledHours = 6;
  let attendedHours = 6;
  let absenceHours = 0;
  let recordType = 'REGULAR';

  if (delayMinutes <= 15) {
    attendedHours = 6;
    absenceHours = 0;
    recordType = 'REGULAR';
  } else if (delayMinutes <= 60) {
    attendedHours = 5;
    absenceHours = 1;
    recordType = 'RETARDO_BLOQUE_1';
  } else if (delayMinutes <= 120) {
    attendedHours = 4;
    absenceHours = 2;
    recordType = 'RETARDO_BLOQUE_2';
  } else if (delayMinutes <= 180) {
    attendedHours = 3;
    absenceHours = 3;
    recordType = 'RETARDO_BLOQUE_3';
  } else if (delayMinutes <= 240) {
    attendedHours = 2;
    absenceHours = 4;
    recordType = 'RETARDO_BLOQUE_4';
  } else if (delayMinutes <= 300) {
    attendedHours = 1;
    absenceHours = 5;
    recordType = 'RETARDO_BLOQUE_5';
  } else {
    attendedHours = 0;
    absenceHours = 6;
    recordType = 'RETARDO_BLOQUE_6';
  }

  return {
    horas_programadas_sesion: scheduledHours,
    horas_validadas_asistencia: attendedHours,
    horas_inasistencia_acumulada: absenceHours,
    tipo_registro: recordType
  };
}
