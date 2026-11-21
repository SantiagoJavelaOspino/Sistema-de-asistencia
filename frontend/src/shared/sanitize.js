/**
 * Capa 1 (Experiencia / Shared) - Utilidades seguras de escape HTML y validación de URLs contra XSS.
 */

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch]);
}

export function isSafeDataOrHttpUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (/^data:(application\/pdf|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-excel|image\/png|image\/jpeg);base64,[A-Za-z0-9+/=\s]+$/i.test(trimmed)) {
    return true;
  }
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    return true;
  }
  return false;
}

export function resolveRoleDestination(roles = []) {
  const list = Array.isArray(roles) ? roles : [];
  if (list.includes('COORDINADOR')) return 'COORDINADOR';
  if (list.includes('INSTRUCTOR')) return 'INSTRUCTOR';
  if (list.includes('APRENDIZ')) return 'APRENDIZ';
  return null;
}
