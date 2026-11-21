# Sistema de Asistencia SENA

Aplicación web para registrar, validar y consultar la asistencia de aprendices SENA mediante QR temporal, reglas de puntualidad, gestión de excusas y controles de rol.

## Arquitectura

La arquitectura oficial del proyecto es **N capas, con N = 7**. Las responsabilidades y dependencias están definidas en [la arquitectura de 7 capas](docs/architecture/n-layer-architecture.md).

## Documentación técnica

| Tema | Documento principal |
| --- | --- |
| Arquitectura y patrones | [`docs/architecture/n-layer-architecture.md`](docs/architecture/n-layer-architecture.md) |
| Decisiones técnicas | [`docs/decisions/`](docs/decisions/) |
| Contratos HTTP | [`docs/api/api-contract.md`](docs/api/api-contract.md) |
| Seguridad y permisos | [`docs/security/`](docs/security/) |
| Datos y operación | [`docs/operations/`](docs/operations/) |
| UX, identidad SENA y accesibilidad | [`docs/ui-ux/`](docs/ui-ux/) y [`docs/branding/`](docs/branding/) |
| Calidad y evidencias | [`docs/validation/`](docs/validation/) |

Los directorios numerados de la raíz se conservan como material de apoyo del repositorio original. La documentación normativa y vigente para el proyecto está en `docs/` y debe mantenerse alineada con la arquitectura de 7 capas.

## Verificación local

```text
npm test
node backend/tests/audit-verification.test.js
```

Consultar `docs/validation/re-audit-report.md` para el alcance, la evidencia y las restricciones aún pendientes de verificación en CI y navegador real.
