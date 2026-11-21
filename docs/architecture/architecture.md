# Arquitectura técnica vigente

La arquitectura oficial se define en [`n-layer-architecture.md`](./n-layer-architecture.md). Este documento describe su aplicación actual y no reemplaza la regla de siete capas.

## Flujo de ejecución

```text
Navegador web
  -> Capa 1: experiencia (HTML, JavaScript, cola offline)
  -> Capa 2: rutas y controladores HTTP Express
  -> Capa 3: casos de uso y políticas de autorización
  -> Capa 4: reglas de negocio puras
  -> Capa 5: puertos
  -> Capa 6: repositorios SQL y migraciones
  -> Capa 7: configuración, JWT, conexión y bootstrap
  -> SQLite en desarrollo / PostgreSQL cuando se valide en CI
```

## Límites actuales

- `backend/src/bootstrap/server.js` corresponde a la composición de capa 7; registra middleware, estáticos y rutas.
- Los módulos `identity`, `academic`, `attendance` y `excuses` contienen artefactos de presentación, aplicación, dominio, puertos y persistencia según su avance de migración.
- `backend/src/controllers.js` conserva lógica heredada. Su extracción progresiva es un pendiente técnico y no debe copiarse en nuevos endpoints.
- El frontend está en transición hacia `frontend/src/experience` y `frontend/src/shared`; `frontend/app.js` sigue siendo código heredado que debe reducirse gradualmente.

## Comunicación entre capas

1. La interfaz invoca contratos HTTP publicados por presentación.
2. Presentación valida forma y delega a aplicación; no contiene SQL ni reglas académicas.
3. Aplicación coordina un caso de uso, políticas y transacción; accede a datos mediante puertos.
4. Dominio mantiene las reglas BR sin HTTP, SQL, archivos ni variables de entorno.
5. Persistencia implementa los puertos y maneja SQL parametrizado.
6. Infraestructura provee dependencias técnicas y las ensambla en `bootstrap`.

## Reglas de protección

- Toda ruta protegida requiere autenticación, rol autorizado y comprobación de recurso.
- Las mutaciones críticas deben ser transaccionales y generar trazabilidad.
- Las consultas SQL sólo residen en capa 6.
- El dominio se prueba sin servidor ni base de datos.
- El código nuevo debe entrar por la capa apropiada, no ampliar el controlador heredado.
