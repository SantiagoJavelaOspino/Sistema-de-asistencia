# Informe de Auditoría de Cierre (Re-Audit Report)

**Fecha:** 2026-11-21  
**Repositorio:** `Sistema-de-asistencia` (rama `main`)  
**Arquitectura objetivo:** Monolito modular de 7 capas (`N = 7`, según `docs/architecture/n-layer-modular-monolith.md`)  
**Entorno de verificación:** Node.js `v26.13.1`, npm `11.20.0`, SQLite local (`backend/database.sqlite`)

---

## 1. Decisión de Liberación

* **Demo institucional / presentación de avances:** **APROBADO** (todos los controles críticos y altos de seguridad, RBAC, recuperación de contraseña, dominio QR/BR-05/evidencias, login unificado SENA con logo oficial y cola offline están en verde).
* **Producción:** **CONDICIONADO** a:
  1. Ejecutar el job `test-postgresql-portability` en GitHub Actions (`.github/workflows/ci.yml`) contra PostgreSQL 16 real.
  2. Configurar en el entorno productivo `NODE_ENV=production`, `JWT_SECRET` (>= 32 bytes), `DATABASE_URL` y `CORS_ORIGINS`.
  3. Ejecutar verificación E2E en navegador Chromium (Playwright) + auditoría Lighthouse/axe y completar la extracción incremental del SQL restante en `backend/src/controllers.js`.

---

## 2. Comandos Ejecutados y Evidencia Verificable

| Comando | Resultado | Evidencia |
| --- | --- | --- |
| `npm test` | **PASS (exit 0)** | 10 suites integradas en `backend/tests/run-all.js` (incluyendo `domain-rules`, `architecture-layers`, `frontend-experience` y `audit-verification`). |
| `node backend/tests/audit-verification.test.js` | **PASS (exit 0)** | **19/19 controles verificados; 0 hallazgos reproducibles** (línea base inicial: 11/19 PASS, 8 fallos). |
| `node backend/tests/domain-rules.test.js` | **PASS (exit 0)** | Reglas puras Capa 4: BR-02, BR-03 (15s + 1 leeway con reloj fijo), BR-05, BR-07, evidencias magic bytes y guardrail `JWT_SECRET`. |
| `node backend/tests/architecture-layers.test.js` | **PASS (exit 0)** | 7 archivos de dominio puro con 0 dependencias externas; 7 archivos en presentation/application sin SQL; conversor SQLite->PG quote-safe verificado. |
| `node backend/tests/frontend-experience.test.js` | **PASS (exit 0)** | Login unificado 3 roles, sanitización XSS, logo oficial SENA sin credenciales demo ni `resetToken`, cola offline deduplicada/idempotente con conflictos visibles. |
| `node backend/tests/concurrency-benchmark.test.js` | **PASS (exit 0)** | **60 solicitudes concurrentes:** `p50 = 74.38 ms`, **`p95 = 99.70 ms`**, `p99 = 101.87 ms` (< 300 ms NFR-01). |
| `Select-String` marcadores Git en `docs/` | **PASS (0 hallazgos)** | Conflictos en `docs/DISCOVERY.md` resueltos. |
| `npm --prefix backend audit` | **CON OBSERVACIONES** | Vulnerabilidades transitivas en cadena de instalación de `sqlite3@5.1.7` (`tar`/`node-gyp`). Ver riesgos residuales. |
| PostgreSQL 16 CI (`ci.yml`) | **PENDIENTE DE EJECUCIÓN EN CI** | Workflow `.github/workflows/ci.yml` creado con servicio `postgres:16-alpine`; requiere ejecución en GitHub Actions tras `git push`. |
| Playwright E2E Chromium + axe/Lighthouse | **PENDIENTE** | No hay runner Playwright instalado localmente; cubierto a nivel unitario/estático en `frontend-experience.test.js`. |

---

## 3. Clasificación de Hallazgos (Antes vs. Después)

| ID | Hallazgo inicial | Severidad Antes | Estado Final | Severidad Después | Evidencia / Archivo |
| --- | --- | --- | --- | --- | --- |
| H-01 | Rutas de sesiones/override/excusas sin RBAC ni validación de recurso (aprendiz alteraba salas/excusas) | **CRÍTICO** | **Corregido** | Cerrado | `backend/src/modules/identity/application/policies.js`, `backend/src/modules/*/presentation/routes.js`, `audit-verification.test.js` (4/4 RBAC aprendiz -> 403). |
| H-02 | `forgot-password` devolvía `resetToken` en HTTP y `app.js` lo rellenaba | **CRÍTICO** | **Corregido** | Cerrado | `backend/src/auth.js`, `backend/src/modules/identity/ports/passwordResetNotifier.js`, `frontend/app.js`, `audit-verification.test.js` + `e2e-discovery.test.js`. |
| H-03 | Secreto JWT con fallback inseguro en producción | **CRÍTICO** | **Corregido** | Cerrado | `backend/src/shared/infrastructure/config.js` (`resolveJwtSecret` falla arranque si `NODE_ENV=production` y secreto < 32 bytes), probado en `domain-rules.test.js`. |
| H-04 | `/api/coord/evidences/:sessionId/download` sin `requireRole('COORDINADOR')` en router | **ALTO** | **Corregido** | Cerrado | `backend/src/modules/attendance/presentation/routes.js` + `docs/security/route-rbac-matrix.md`. |
| H-05 | `validationMode: 'NONE'` aceptado (incumplía BR-05) | **ALTO** | **Corregido** | Cerrado | `backend/src/modules/attendance/domain/validationMode.js`, probado en `domain-rules.test.js` y `audit-verification.test.js`. |
| H-06 | QR rotaba cada 60s con 10 ventanas previas (incumplía BR-03 / ADR-002) | **ALTO** | **Corregido** | Cerrado | `backend/src/modules/attendance/domain/qrRotation.js` (`QR_WINDOW_MS = 15000`, `QR_LEEWAY_SLOTS = 1`), probado con reloj fijo en `domain-rules.test.js`. |
| H-07 | Evidencias Base64 corruptas o MIME falsificado aceptados | **ALTO** | **Corregido** | Cerrado | `backend/src/modules/attendance/domain/evidenceValidation.js` (Base64 canónico + MIME + tamaño + magic bytes PDF/XLSX/XLS/PNG/JPEG), probado en `audit-verification.test.js`. |
| H-08 | CORS abierto (`*`) y ausencia de rate limiting y cabeceras de seguridad | **ALTO** | **Corregido** | Cerrado | `backend/src/bootstrap/server.js`, `backend/src/shared/infrastructure/rateLimit.js` (CORS por lista blanca, rate limit en auth/reset/check-in, CSP/X-Frame-Options/nosniff). |
| H-09 | `innerHTML` con datos persistidos sin escape (XSS almacenado) | **ALTO** | **Mitigado** | Bajo | `escapeHtml()` y `isSafeDataOrHttpUrl()` aplicados en los 4 sinks de `frontend/app.js` + CSP; pendiente migración progresiva de plantillas legadas a nodos DOM puros. |
| H-10 | Rutas y handlers biométricos residuales contrarios a ADR-003 | **MEDIO** | **Corregido** | Cerrado | Endpoints `/pending-biometrics` y `/resolve-biometric` retirados de `routes.js` y `controllers.js`. |
| H-11 | `toPg()` en `db.js` corrompía `?` literales y faltaba helper transaccional | **MEDIO** | **Corregido** | Cerrado | `backend/src/shared/infrastructure/sqlDialect.js` (`convertPlaceholdersToPg`) + `withTransaction` en `backend/src/db.js`, probado en `architecture-layers.test.js`. |
| H-12 | Ausencia de CI y de pruebas contra PostgreSQL | **MEDIO** | **Mitigado** | Medio | `.github/workflows/ci.yml` creado con job SQLite + job PostgreSQL 16; pendiente primera ejecución verde en GitHub Actions. |
| H-13 | Marcadores de conflicto Git en `docs/DISCOVERY.md` | **MEDIO** | **Corregido** | Cerrado | Conflictos resueltos y verificados con 0 coincidencias. |
| H-14 | Credenciales de demostración precargadas y login duplicado | **BAJO** | **Corregido** | Cerrado | Login unificado SENA en `frontend/index.html` con logo oficial (`frontend/assets/brand/sena-logo-official.png`, `alt="SENA"`), 0 credenciales demo y 0 selector de rol. |
| H-15 | Cola offline permitía duplicados y no distinguía conflictos permanentes | **ALTO** | **Corregido** | Cerrado | `frontend/offline-queue.js` (clave de idempotencia, deduplicación, 409 idempotente, conflictos 4xx visibles), probado en `audit-verification.test.js` y `frontend-experience.test.js`. |

---

## 4. Riesgos Residuales y Próximos Pasos

1. **PostgreSQL 16 en CI:** Al subir esta rama a GitHub, verificar que el job `test-postgresql-portability` en `.github/workflows/ci.yml` finalice en verde antes de declarar soporte productivo PostgreSQL.
2. **Extracción incremental de `backend/src/controllers.js`:** Las 7 capas, los 4 módulos y las reglas puras críticas ya están implementados y protegidos por `architecture-layers.test.js`; continuar moviendo el SQL restante de `controllers.js` hacia los repositorios de Capa 6 en PRs incrementales.
3. **E2E en navegador real (Playwright) y cobertura (`c8`):** Añadir ejecución de Playwright Chromium en CI y medición de cobertura de líneas (>= 80% global, >= 90% `attendance`/`sessions`).
4. **Dependencias transitivas de `sqlite3@5.1.7`:** Planificar migración del adaptador local de desarrollo a `node:sqlite` (nativo en Node 22+) o `better-sqlite3` para eliminar avisos de `tar`/`node-gyp` en `npm audit`.
