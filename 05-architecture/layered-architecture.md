# 05 — Arquitectura de siete capas

```text
1. Experiencia
2. Presentación HTTP
3. Aplicación
4. Dominio
5. Puertos
6. Persistencia
7. Infraestructura y composición
```

Las dependencias avanzan hacia las capas internas. La infraestructura se enlaza en `bootstrap` e implementa puertos; no se importa desde dominio. Las rutas HTTP delegan casos de uso y los repositorios concentran el SQL.

La descripción completa, los patrones y el estado de migración están en [`docs/architecture/n-layer-architecture.md`](../docs/architecture/n-layer-architecture.md).
