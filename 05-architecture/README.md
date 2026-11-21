# 05 — Arquitectura

La arquitectura vigente del Sistema de Asistencia SENA es de **N capas, con N = 7**. Su fuente normativa está en [`docs/architecture/n-layer-architecture.md`](../docs/architecture/n-layer-architecture.md).

| Documento | Propósito |
| --- | --- |
| [`n-layer-architecture.md`](./n-layer-architecture.md) | Referencia breve a la decisión de siete capas. |
| [`layered-architecture.md`](./layered-architecture.md) | Dirección de dependencias y controles por capa. |
| [`module-structure.md`](./module-structure.md) | Organización de módulos en la migración gradual. |
| [`boundary-enforcement.md`](./boundary-enforcement.md) | Reglas que evitan acoplamiento entre capas. |
| [`decisions/README.md`](./decisions/README.md) | Índice de decisiones. |

Los documentos de esta sección complementan `docs/`; si hay discrepancia, prevalece la documentación vigente bajo `docs/architecture/` y `docs/decisions/`.
