/**
 * Capa 1 (Experiencia) - Controlador de Login Institucional Unificado SENA.
 * Reemplaza los portales duplicados (Aprendiz / Funcionarios) por un único acceso accesible.
 */

import { resolveRoleDestination } from '../shared/sanitize.js';

export async function submitUnifiedLogin({ apiUrl, identifier, password, fetchImpl = fetch }) {
  const cleanIdentifier = String(identifier || '').trim();
  const cleanPassword = String(password || '');

  if (!cleanIdentifier || !cleanPassword) {
    return {
      ok: false,
      status: 400,
      errorMessage: 'Ingresa tu documento o correo y tu contraseña.'
    };
  }

  const res = await fetchImpl(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: cleanIdentifier, documento: cleanIdentifier, password: cleanPassword })
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      errorMessage: payload?.error?.message || 'Credenciales inválidas. Verifica tus datos e intenta de nuevo.'
    };
  }

  const person = payload?.data?.person || {};
  const destination = resolveRoleDestination(person.roles);
  if (!destination) {
    return {
      ok: false,
      status: 403,
      errorMessage: 'Tu cuenta no tiene un rol activo habilitado. Contacta a Coordinación Académica.'
    };
  }

  return {
    ok: true,
    status: res.status,
    token: payload.data.token,
    person,
    destination
  };
}
