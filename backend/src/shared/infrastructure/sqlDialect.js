/**
 * Capa 7 (Infraestructura) - Conversor seguro de placeholders SQLite (?) a PostgreSQL ($1, $2, ...).
 * Respeta cadenas literales con comillas simples ('...?...') y comillas escapadas ('').
 */

export function convertPlaceholdersToPg(sql) {
  if (typeof sql !== 'string') return '';
  let out = '';
  let paramIndex = 0;
  let inSingleQuote = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      out += ch;
      if (inSingleQuote && sql[i + 1] === "'") {
        // Comilla simple escapada ('')
        out += sql[i + 1];
        i++;
      } else {
        inSingleQuote = !inSingleQuote;
      }
      continue;
    }

    if (ch === '?' && !inSingleQuote) {
      paramIndex += 1;
      out += `$${paramIndex}`;
    } else {
      out += ch;
    }
  }

  return out;
}
