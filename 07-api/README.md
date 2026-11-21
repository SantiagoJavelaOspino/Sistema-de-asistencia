# 07 — API Pública y Contratos HTTP

- **Matriz autorizada de rutas, roles y recursos:** [`../docs/security/route-rbac-matrix.md`](../docs/security/route-rbac-matrix.md)
- **Routers modulares (Capa 2):**
  - `backend/src/modules/identity/presentation/routes.js`
  - `backend/src/modules/attendance/presentation/routes.js`
  - `backend/src/modules/excuses/presentation/routes.js`
  - `backend/src/modules/academic/presentation/routes.js`
- **Convenciones:**
  - Respuestas exitosas envueltas en `{ data: ... }`; errores en `{ error: { code, message } }`.
  - Denegación por defecto: toda ruta protegida requiere `authenticate` + `requireRole(...)` + verificación de propiedad/asignación en Capa 3.
  - Endpoints públicos sensibles protegidos por rate limiting (`429 RATE_LIMIT_EXCEEDED`).
  - Rutas biométricas retiradas definitivamente según ADR-003.
