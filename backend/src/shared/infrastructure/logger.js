/**
 * Capa 7 (Infraestructura) - Logger estructurado con redacción de secretos y PII.
 */

const SENSITIVE_KEY_PATTERN = /(password|token|secret|authorization|cookie|evidence_file_data|photo_evidence|resetToken|hash)/i;

function redactValue(value, depth = 0) {
  if (depth > 4) return '[TRUNCATED]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (value.length > 500) return `${value.slice(0, 120)}...[REDACTED_LONG_STRING]`;
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    const safe = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        safe[k] = '[REDACTED]';
      } else {
        safe[k] = redactValue(v, depth + 1);
      }
    }
    return safe;
  }
  return value;
}

export function createLogger(service = 'sena-attendance') {
  const emit = (level, event, meta = {}) => {
    const entry = {
      ts: new Date().toISOString(),
      level,
      service,
      event,
      ...redactValue(meta)
    };
    const line = JSON.stringify(entry);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else if (process.env.LOG_SILENT !== '1') {
      console.log(line);
    }
  };

  return {
    info: (event, meta) => emit('info', event, meta),
    warn: (event, meta) => emit('warn', event, meta),
    error: (event, meta) => emit('error', event, meta)
  };
}

export const logger = createLogger();
