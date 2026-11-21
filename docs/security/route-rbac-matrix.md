# Matriz de Autorización: Ruta / Rol / Recurso

**Fecha:** 2026-11-21  
**Política base:** Denegación por defecto (*default-deny*). Toda ruta protegida exige JWT válido (`authenticate`), validación de rol (`requireRole`) y autorización por recurso en la capa de aplicación (`assertSessionAccess`, `assertUnitAccess`, `assertExcuseAccess`).

## Rutas Públicas (con Rate Limiting en endpoints sensibles)

| Método | Ruta | Rol | Política / Restricción |
|---|---|---|---|
| `GET` | `/health`, `/ready` | Público | Sonda de disponibilidad / lectura básica de estado |
| `GET` | `/public/fichas` | Público | Sólo fichas con `status = 'ACTIVE'` y `active = 1` |
| `POST` | `/api/auth/login` | Público | Login unificado para cualquier rol activo (`APRENDIZ`, `INSTRUCTOR`, `COORDINADOR`). Rate limit activo. |
| `POST` | `/public/student/login` | Público | Compatibilidad legada para `APRENDIZ`. Rate limit activo. |
| `POST` | `/public/student/register` | Público | Registro de aprendiz con validación anti-suplantación (BR-04). Rate limit activo. |
| `POST` | `/public/auth/forgot-password` | Público | Respuesta neutra; **jamás** devuelve `resetToken` en HTTP ni logs de producción. Invalida tokens previos. Rate limit activo. |
| `POST` | `/public/auth/reset-password` | Público | Consumo atómico de un solo uso; contraseña >= 6 caracteres (BR-10). Rate limit activo. |
| `POST` | `/attendance/checkin`, `/public/attendance/:token/register` | Público / JWT opcional | Valida QR rotativo (15s + 1 leeway) o CSR 6 chars, matrícula activa (BR-01), no duplicidad (BR-04 -> 409) y sala abierta (BR-06). |
| `POST` | `/public/attendance/:token/self-register` | Público | Auto-registro de aprendiz en aula con verificación anti-suplantación. |
| `POST` | `/public/attendance/:token/check-document` | Público | Consulta estado de documento en sesión activa. |
| `POST` | `/public/attendance/:token/late-request`, `/public/attendance/:token/late-checkin` | Público / JWT opcional | Solicitud de ingreso tardío en sesión expirada/cerrada. |

## Rutas Autenticadas Generales

| Método | Ruta | Roles permitidos | Autorización por recurso |
|---|---|---|---|
| `POST` | `/api/auth/verify-password` | `APRENDIZ`, `INSTRUCTOR`, `COORDINADOR` | Sólo `req.user.id` |
| `POST` | `/api/auth/change-password` | `APRENDIZ`, `INSTRUCTOR`, `COORDINADOR` | Sólo `req.user.id` |

## Rutas de Aprendiz

| Método | Ruta | Roles permitidos | Autorización por recurso |
|---|---|---|---|
| `GET` | `/api/student/history` | `APRENDIZ` | Sólo registros de `req.user.id` |
| `GET` | `/api/student/active-session` | `APRENDIZ` | Sólo fichas donde `req.user.id` tiene matrícula activa |
| `POST` | `/api/student/excuses`, `/api/excuses/submit` | `APRENDIZ` | Sólo `req.user.id`; plazo BR-07 y unicidad por sesión |
| `POST` | `/api/student/accept-terms` | `APRENDIZ` | Sólo `req.user.id` |
| `DELETE` | `/api/student/delete-account` | `APRENDIZ` | Anonimización Habeas Data (BR-11) de `req.user.id` |

## Rutas de Instructor y Coordinador (Control de Aula y Reportes)

| Método | Ruta | Roles permitidos | Autorización por recurso |
|---|---|---|---|
| `GET` | `/api/institutions`, `/api/institutions/:institutionId/units`, `/api/units/:unitId/people` | `INSTRUCTOR`, `COORDINADOR` | Misma institución; instructor restringido a fichas asignadas |
| `GET` | `/api/instructor/my-units` | `INSTRUCTOR`, `COORDINADOR` | Fichas asignadas al instructor |
| `POST` | `/room/create`, `/api/sessions` | `INSTRUCTOR`, `COORDINADOR` | `INSTRUCTOR` debe estar asignado a `unitId` (`403 INSTRUCTOR_NOT_ASSIGNED`) |
| `POST` | `/room/reopen`, `/api/sessions/:sessionId/activate`, `/api/sessions/:sessionId/close` | `INSTRUCTOR`, `COORDINADOR` | `assertSessionAccess`: creador o instructor asignado a la ficha de la sesión, o `COORDINADOR` |
| `GET` | `/api/sessions`, `/api/sessions/:sessionId`, `/api/sessions/:sessionId/qr-token`, `/present`, `/absent`, `/rejections`, `/reports/session/:sessionId` | `INSTRUCTOR`, `COORDINADOR` | `assertSessionAccess` (o listado filtrado a sesiones de sus fichas asignadas) |
| `POST` | `/attendance/manual-override`, `/attendance/manual-checkin` | `INSTRUCTOR`, `COORDINADOR` | `assertSessionAccess` + registro obligatorio en `audit_logs` |
| `GET` | `/api/instructor/excuses`, `/api/instructor/late-requests` | `INSTRUCTOR`, `COORDINADOR` | Aislado estrictamente a fichas asignadas del instructor |
| `POST` | `/api/instructor/excuses/:id/resolve`, `/api/instructor/late-requests/:id/resolve` | `INSTRUCTOR`, `COORDINADOR` | `assertSessionAccess` sobre la sesión asociada + auditoría |
| `POST` | `/api/sessions/:sessionId/evidence` | `INSTRUCTOR`, `COORDINADOR` | `assertSessionAccess` + validación estricta Base64 / tamaño / MIME / magic bytes |

## Rutas Exclusivas de Coordinación

| Método | Ruta | Roles permitidos | Autorización por recurso |
|---|---|---|---|
| `GET/POST/PUT` | `/api/coord/instructors*` | `COORDINADOR` | Misma institución + `audit_logs` |
| `GET/POST/PUT` | `/api/coord/fichas*` | `COORDINADOR` | Misma institución + `audit_logs` |
| `GET/POST` | `/api/coord/deletion-requests*` | `COORDINADOR` | Regla de 4 Ojos (BR-08: `requester != approver`) |
| `GET` | `/api/coord/evidences` | `COORDINADOR` | Misma institución |
| `GET` | `/api/coord/evidences/:sessionId/download` | `COORDINADOR` | Guardia `requireRole('COORDINADOR')` en router + validación de integridad Base64/magic bytes |
| `GET` | `/api/coord/audit-logs` | `COORDINADOR` | Sólo lectura inmutable |

## Rutas Retiradas (ADR-003)

| Método | Ruta | Motivo |
|---|---|---|
| `GET` | `/api/sessions/:sessionId/pending-biometrics` | Retirada definitivamente por ADR-003 (sin biometría facial en cliente) |
| `POST` | `/api/attendance/resolve-biometric/:recordId` | Retirada definitivamente por ADR-003 |
