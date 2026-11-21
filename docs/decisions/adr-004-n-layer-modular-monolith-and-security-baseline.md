# ADR-004: Adopción del Monolito Modular de 7 Capas y Guardrails de Seguridad

**Fecha:** 2026-11-21  
**Estado:** Aceptado  
**Relacionados:** [`../architecture/n-layer-modular-monolith.md`](../architecture/n-layer-modular-monolith.md), [`../validation/audit-report.md`](../validation/audit-report.md), [`../security/route-rbac-matrix.md`](../security/route-rbac-matrix.md)

## Contexto

La auditoría inicial (`docs/validation/audit-report.md`) evidenció acoplamiento severo en `backend/src/controllers.js` (~2,337 líneas) y `frontend/app.js` (~3,451 líneas), ausencia de guardias RBAC por ruta y por recurso en operaciones críticas, exposición de `resetToken` en HTTP, secreto JWT con fallback inseguro, divergencia del algoritmo QR frente a BR-03/ADR-002 (60s/10 ventanas vs 15s/1 leeway) y residuos biométricos contrarios a ADR-003.

## Decisión

1. **Arquitectura de 7 Capas (`N = 7`):** Reorganizar incrementalmente el sistema en `backend/src/modules/{identity,academic,attendance,excuses}/{presentation,application,domain,ports,persistence}`, `backend/src/shared/{domain,application,ports,infrastructure}`, `backend/src/bootstrap/` y `frontend/src/{experience,api,offline,shared}`.
2. **Dirección de dependencias estricta:** Las capas externas invocan hacia adentro; Capa 4 (Dominio) no importa Express, SQL, `process.env`, JWT, `Buffer`, `fetch` ni sistema de archivos.
3. **Seguridad por defecto:**
   - Fallo inmediato al arrancar en `NODE_ENV=production` si `JWT_SECRET` falta o mide menos de 32 bytes.
   - Eliminación definitiva del retorno de `resetToken` en respuestas HTTP y logs productivos.
   - Aplicación combinada de `authenticate`, `requireRole(...)` en router y validación de propiedad/asignación en aplicación.
   - Rate limiting en endpoints públicos sensibles y CORS restringido por lista de orígenes configurables.
4. **Alineación estricta con BR-03 (ADR-002) y ADR-003:**
   - QR rotativo estricto: ventana de `15000 ms` y `1` franja de tolerancia (`QR_LEEWAY_SLOTS = 1`) con reloj inyectable.
   - Retiro definitivo de endpoints biométricos (`/pending-biometrics`, `/resolve-biometric`).
5. **Identidad visual oficial SENA:** Incorporación del logotipo oficial del Manual de Identidad Visual SENA 2024 sin alteración ni redibujado, con trazabilidad en `docs/branding/sena-logo-source.md`.

## Consecuencias

- Se conserva un único proceso desplegable (`backend/src/server.js` re-exporta `bootstrap/server.js`) y una única base de datos (SQLite local / PostgreSQL producción), sin microservicios.
- Las pruebas automatizadas de límites arquitectónicos validarán que no reaparezca SQL en presentación/aplicación ni dependencias de infraestructura en dominio.
