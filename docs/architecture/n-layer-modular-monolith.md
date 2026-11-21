# Arquitectura objetivo: monolito modular por N capas

## Decisión

El Sistema de Asistencia SENA será un **monolito modular de 7 capas (N = 7)**. Se despliega como una sola aplicación Node.js con una única base de datos relacional. No se crearán microservicios, colas distribuidas ni bases de datos por servicio.

La organización por módulos limita el acoplamiento funcional; las capas delimitan la dirección de las dependencias. Un módulo no puede saltar capas ni importar detalles de infraestructura desde dominio o aplicación.

## Las siete capas

| Capa | Responsabilidad | Puede depender de |
| --- | --- | --- |
| 1. Experiencia | SPA, componentes, accesibilidad, estado de interfaz y cola offline | contratos HTTP públicos |
| 2. Entrega HTTP | Rutas Express, controladores finos, validación de formato, serialización y códigos HTTP | aplicación |
| 3. Aplicación | Casos de uso, transacciones, autorización por recurso, orquestación de reglas y eventos de auditoría | dominio y puertos |
| 4. Dominio | Entidades, value objects y reglas puras de asistencia, excusas, QR y gobierno académico | nada externo |
| 5. Puertos | Interfaces de repositorios y servicios externos requeridos por aplicación | dominio |
| 6. Persistencia | Implementaciones SQL, mapeadores, migraciones y transacciones SQLite/PostgreSQL | puertos |
| 7. Infraestructura | Configuración, conexión de BD, JWT, hash, archivos, correo, reloj, logger y arranque | capas internas mediante composición |

Los aspectos transversales (configuración, observabilidad, auditoría, métricas, manejo de errores y seguridad de cabeceras) se componen en la capa 7 y se consumen mediante interfaces. No introducen una dependencia inversa.

## Dirección permitida

```text
Experiencia -> Entrega HTTP -> Aplicación -> Dominio
                              |             ^
                              v             |
                           Puertos <- Persistencia / Infraestructura
```

La infraestructura se conecta en el composition root (`server`/bootstrap) e inyecta implementaciones hacia aplicación. El dominio nunca importa Express, SQL, `process.env`, JWT, `Buffer`, `fetch` ni archivos.

## Organización objetivo

```text
backend/src/
  modules/
    attendance/{presentation,application,domain,ports,persistence}/
    academic/{presentation,application,domain,ports,persistence}/
    excuses/{presentation,application,domain,ports,persistence}/
    identity/{presentation,application,domain,ports,persistence}/
  shared/
    domain/
    application/
    ports/
    infrastructure/
  bootstrap/
    server.js
    routes.js
frontend/
  src/{experience,api,offline,shared}/
```

La migración será incremental: cada comportamiento existente se cubre primero con pruebas y se mueve verticalmente por módulo. No se hará una reescritura masiva ni se duplicará lógica antigua y nueva sin fecha de retirada.

## Reglas de diseño obligatorias

- Cada endpoint entra por capa 2, llama un único caso de uso de capa 3 y no contiene reglas de negocio ni SQL.
- Toda decisión de acceso combina rol, propietario/recurso y contexto académico antes de mutar o revelar datos.
- Las reglas de asistencia se codifican en dominio y se prueban sin servidor ni base de datos.
- Las operaciones mutables críticas son transaccionales y dejan un evento de auditoría inmutable.
- SQLite sigue siendo desarrollo/local; PostgreSQL tiene migraciones y pruebas de compatibilidad antes de declararse soportado.
- Cada módulo expone contratos explícitos; otros módulos sólo los usan a través de aplicación/puertos, no leyendo sus tablas directamente.

## Criterio de aceptación arquitectónico

Antes del cierre, una revisión automática y manual debe demostrar que no hay SQL en rutas/controladores, no hay importaciones de infraestructura desde dominio, y que las rutas protegidas aplican autenticación más política de rol y recurso.
