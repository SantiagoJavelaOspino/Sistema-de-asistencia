/**
 * Capa 4 (Dominio) - Regla BR-07: Plazo legal de 3 días hábiles en America/Bogota (UTC-5).
 * Cero dependencias externas (reloj y conjunto de festivos inyectables).
 */

export function toBogotaYmd(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const bogotaMs = d.getTime() - 5 * 60 * 60 * 1000;
  const b = new Date(bogotaMs);
  const year = b.getUTCFullYear();
  const month = String(b.getUTCMonth() + 1).padStart(2, '0');
  const day = String(b.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isWithinBusinessDaysPure(sessionDateIso, nowDate = new Date(), holidaySet = new Set(), maxBusinessDays = 3) {
  const startYmd = toBogotaYmd(sessionDateIso);
  const [y, m, d] = startYmd.split('-').map(Number);
  let cursor = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

  let businessDaysAdded = 0;
  while (businessDaysAdded < maxBusinessDays) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const dow = cursor.getUTCDay();
    const ymd = cursor.toISOString().slice(0, 10);
    if (dow !== 0 && dow !== 6 && !holidaySet.has(ymd)) {
      businessDaysAdded += 1;
    }
  }

  const deadlineYmd = cursor.toISOString().slice(0, 10);
  const deadlineEndOfDay = new Date(`${deadlineYmd}T23:59:59.999-05:00`);
  const now = nowDate instanceof Date ? nowDate : new Date(nowDate);
  return now.getTime() <= deadlineEndOfDay.getTime();
}
