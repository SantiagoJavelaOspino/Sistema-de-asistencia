# ADR-004: Arquitectura de 7 Capas y Línea Base de Seguridad

**Fecha:** 2026-11-21
**Estado:** Aceptado
**Relacionados:** [`../architecture/n-layer-architecture.md`](../architecture/n-layer-architecture.md), [`../validation/audit-report.md`](../validation/audit-report.md), [`../security/route-rbac-matrix.md`](../security/route-rbac-matrix.md)

## Contexto

La auditoría inicial evidenció acoplamiento severo en `backend/src/controllers.js` y `frontend/app.js`, ausencia de guardias RBAC por ruta y recurso en operaciones críticas, exposición de `resetToken` en HTTP, secreto JWT con fallback inseguro, divergencia del algoritmo QR frente a BR-03/ADR-002 y residuos biométricos contrarios a ADR-003.

## Decisión

1. **Arquitectura de 7 capas (`N = 7`):** reorganizar progresivamente el sistema en presentación, aplicación, dominio, puertos, persistencia, infraestructura/composición y experiencia, conforme a `docs/architecture/n-layer-architecture.md`.
2. **Dirección de dependencias:** las capas externas invocan hacia las internas. La capa de dominio no importa Express, SQL, `process.env`, JWT, `Buffer`, `fetch` ni sistema de archivos.
3. **Seguridad por defecto:**
   - En producción, el arranque falla si `JWT_SECRET` falta o mide menos de 32 bytes.
   - `resetToken` no se devuelve en respuestas HTTP ni se registra en logs.
   - La autorización combina `authenticate`, control de rol en rutas y política de propiedad/asignación en aplicación.
   - Los endpoints públicos sensibles aplican rate limiting y CORS usa una lista de orígenes configurable.
4. **Alineación con reglas académicas:** QR con ventana de `15000 ms` y una franja de tolerancia; retiro de endpoints biométricos; validación estricta de evidencias y modos de asistencia.
5. **Identidad visual SENA:** se incorpora el logosímbolo oficial sin modificación, con fuente y hash registrados en `docs/branding/sena-logo-source.md`.

## Consecuencias

- La estructura técnica y sus patrones se explican por capas; no se adopta un modelo arquitectónico externo.
- Las pruebas de límites arquitectónicos se aplican a los módulos ya migrados y la extracción restante de `controllers.js` se mantiene como trabajo explícito.
- La infraestructura se configura en `bootstrap`; las capas internas no conocen detalles de despliegue, motor de base de datos o red.
