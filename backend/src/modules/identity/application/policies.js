/**
 * Capa 3 (Aplicación) - Políticas centralizadas de autorización (RBAC + Recurso).
 * Principio: denegación por defecto (default-deny).
 */

export function normalizeRoles(user) {
  if (!user) return [];
  if (Array.isArray(user.roles)) return user.roles;
  if (typeof user.roles === 'string') {
    try {
      const parsed = JSON.parse(user.roles);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function hasAnyRole(user, allowedRoles = []) {
  const roles = normalizeRoles(user);
  return allowedRoles.some((r) => roles.includes(r));
}

export function isCoordinator(user) {
  return hasAnyRole(user, ['COORDINADOR']);
}

export function isInstructor(user) {
  return hasAnyRole(user, ['INSTRUCTOR']);
}

export function isApprentice(user) {
  return hasAnyRole(user, ['APRENDIZ']);
}

export class AuthorizationError extends Error {
  constructor(code, message, status = 403) {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Valida acceso a una ficha/unidad académica por rol y asignación.
 */
export async function assertUnitAccess(user, unitId, { isAssignedToUnit }) {
  if (!user) {
    throw new AuthorizationError('UNAUTHORIZED', 'Usuario no autenticado.', 401);
  }
  if (isCoordinator(user)) return true;
  if (!isInstructor(user)) {
    throw new AuthorizationError('FORBIDDEN', 'No tienes permisos para gestionar esta ficha.', 403);
  }
  const assigned = await isAssignedToUnit(user.id, unitId);
  if (!assigned) {
    throw new AuthorizationError(
      'INSTRUCTOR_NOT_ASSIGNED',
      'No tienes permiso para gestionar esta ficha porque no te ha sido asignada por Coordinación Académica.',
      403
    );
  }
  return true;
}

/**
 * Valida acceso a una sesión de asistencia (creador, instructor asignado a la ficha, o coordinador).
 */
export async function assertSessionAccess(user, session, { isAssignedToUnit }) {
  if (!user) {
    throw new AuthorizationError('UNAUTHORIZED', 'Usuario no autenticado.', 401);
  }
  if (!session) {
    throw new AuthorizationError('NOT_FOUND', 'Sesión no encontrada.', 404);
  }
  if (isCoordinator(user)) return true;
  if (!isInstructor(user)) {
    throw new AuthorizationError('FORBIDDEN', 'No tienes permisos sobre esta sesión de asistencia.', 403);
  }
  if (session.created_by && session.created_by === user.id) {
    return true;
  }
  const assigned = await isAssignedToUnit(user.id, session.unit_id);
  if (!assigned) {
    throw new AuthorizationError(
      'FORBIDDEN',
      'No tienes permisos sobre esta sesión de asistencia (ficha no asignada).',
      403
    );
  }
  return true;
}
