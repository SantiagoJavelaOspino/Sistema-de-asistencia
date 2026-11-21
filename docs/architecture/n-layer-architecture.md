# Arquitectura de N capas

## Decisión arquitectónica

El Sistema de Asistencia SENA se construye con una **arquitectura de 7 capas (N = 7)**. Es una decisión de diseño interno: cada responsabilidad se ubica en una capa y las dependencias sólo avanzan hacia las capas internas. La arquitectura no se define por un marco de gobernanza ni por una estrategia de partición en servicios.

La aplicación conserva una API, una interfaz web y una base de datos relacional por razones operativas actuales. Esa topología no sustituye ni nombra la arquitectura: la referencia técnica del proyecto es exclusivamente la separación por capas descrita aquí.

## Capas y responsabilidades

| Capa | Responsabilidad | Dependencias permitidas |
| --- | --- | --- |
| 1. Experiencia | SPA, componentes, accesibilidad, estado de interfaz y cola offline | contratos HTTP públicos |
| 2. Presentación HTTP | Rutas Express, controladores delgados, validación de formato, serialización y códigos HTTP | aplicación |
| 3. Aplicación | Casos de uso, transacciones, autorización por recurso, coordinación y eventos de auditoría | dominio y puertos |
| 4. Dominio | Entidades, value objects y reglas puras de asistencia, excusas, QR y gestión académica | ninguna dependencia externa |
| 5. Puertos | Interfaces de repositorios y servicios requeridos por aplicación | dominio |
| 6. Persistencia | Implementaciones SQL, mapeadores, migraciones y transacciones SQLite/PostgreSQL | puertos |
| 7. Infraestructura y composición | Configuración, conexión, JWT, hash, archivos, correo, reloj, logger y ensamblaje | implementa puertos y compone la aplicación |

Los aspectos transversales —configuración, observabilidad, auditoría, métricas, manejo de errores y cabeceras de seguridad— se resuelven en la capa 7 o mediante puertos explícitos. Nunca introducen dependencias desde dominio hacia infraestructura.

## Regla de dependencia

```text
Experiencia -> Presentación HTTP -> Aplicación -> Dominio
                                    |             ^
                                    v             |
                                 Puertos <- Persistencia e Infraestructura
```

La infraestructura se conecta en el composition root (`bootstrap`) e inyecta implementaciones a la aplicación. El dominio no importa Express, SQL, `process.env`, JWT, `Buffer`, `fetch`, archivos ni detalles de red.

## Organización de referencia

```text
backend/src/
  modules/
    identity/{presentation,application,domain,ports,persistence}/
    academic/{presentation,application,domain,ports,persistence}/
    attendance/{presentation,application,domain,ports,persistence}/
    excuses/{presentation,application,domain,ports,persistence}/
  shared/{domain,application,ports,infrastructure}/
  bootstrap/
frontend/
  src/{experience,api,offline,shared}/
```

La migración es incremental: primero se caracteriza el comportamiento con pruebas, después se mueve verticalmente por módulo y capa. No se deben dejar dos implementaciones activas de la misma regla sin una fecha de retiro documentada.

## Patrones aplicados

- **Controller / route handler delgado:** traduce HTTP y delega un caso de uso.
- **Caso de uso:** coordina una única operación de aplicación y sus límites transaccionales.
- **Entidad, value object y regla de dominio:** encapsula invariantes sin dependencias técnicas.
- **Repository y Adapter:** el puerto expresa la necesidad; persistencia e infraestructura la implementan.
- **Dependency Injection / composition root:** `bootstrap` une implementaciones con casos de uso.
- **Policy:** combina rol, propiedad del recurso y contexto académico antes de mutar o revelar información.

## Estado actual y criterio de aceptación

Los módulos `identity`, `academic`, `attendance` y `excuses` ya cuentan con artefactos de capas; la extracción de la lógica restante de `backend/src/controllers.js` sigue pendiente. Las pruebas `architecture-layers.test.js` verifican pureza del dominio y ausencia de SQL en presentación/aplicación de los módulos migrados; no constituyen evidencia de una migración total hasta que `controllers.js` deje de concentrar esa lógica.

Una entrega arquitectónica se acepta cuando demuestra que no hay SQL en rutas, controladores ni casos de uso; que dominio no depende de infraestructura; y que cada ruta protegida aplica autenticación más política de rol y recurso.
