/**
 * Capa 5 (Puertos) - Puerto de notificación para recuperación de contraseña.
 * Garantiza que el token en texto plano nunca se devuelva en respuestas HTTP ni en logs de producción.
 */

let activeNotifier = async () => {
  // Implementación por defecto silenciosa (no filtra secretos en HTTP ni stdout).
};

export function setPasswordResetNotifier(notifierFn) {
  if (typeof notifierFn !== 'function') {
    throw new TypeError('PasswordResetNotifier debe ser una función.');
  }
  activeNotifier = notifierFn;
}

export async function notifyPasswordReset({ personId, email, expiresAt, rawToken }) {
  return activeNotifier({ personId, email, expiresAt, rawToken });
}
