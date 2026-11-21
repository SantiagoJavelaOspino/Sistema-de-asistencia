# Patrones de implementación por capas

## Backend

### Capa 2: ruta y controlador delgado

Una ruta identifica el caso de uso, aplica autenticación y rol cuando corresponda, valida el formato de entrada y traduce el resultado a HTTP. No contiene SQL ni reglas de asistencia.

### Capa 3: caso de uso y política

Un caso de uso coordina una operación: abre sala, registra asistencia, resuelve una excusa o descarga una evidencia. Las políticas verifican rol, titularidad del recurso y contexto académico antes de mutar o revelar datos.

### Capa 4: dominio

Las funciones de dominio expresan reglas puras, por ejemplo puntualidad, vencimiento de excusas, modo de validación, rotación QR y validación de evidencia. No importan Express, SQL, `process.env` ni APIs de archivos.

### Capas 5 y 6: puerto, repositorio y adaptador

El puerto describe la operación de datos requerida por aplicación; el repositorio SQL la implementa con parámetros. Las diferencias SQLite/PostgreSQL se aíslan en infraestructura/persistencia, nunca en el caso de uso.

### Capa 7: composición e infraestructura

`bootstrap` construye la aplicación con configuración validada, repositorios, logger, reloj y servicios técnicos. Las dependencias se inyectan hacia las capas internas.

## Frontend

- **Experiencia:** pantallas, foco, mensajes, accesibilidad y estado visible.
- **Cliente API:** peticiones, encabezado de autenticación y manejo uniforme de errores.
- **Cola offline:** claves de idempotencia, deduplicación, reintento controlado y conflictos visibles.
- **Renderizado seguro:** datos no confiables se asignan con APIs del DOM o se escapan antes de cualquier HTML.

## Antipatrones prohibidos

- SQL en rutas, controladores o casos de uso.
- Reglas de negocio duplicadas entre frontend y backend.
- Importar infraestructura dentro de dominio.
- Comprobar sólo el rol y omitir la autorización sobre el recurso.
- Añadir comportamiento nuevo a `backend/src/controllers.js` o `frontend/app.js` sin una excepción documentada.
