# Auditoría técnica — Sistema de asistencia SENA

**Fecha:** 2026-11-21  
**Alcance:** rama main; arquitectura, seguridad, UX y QA. Sin cambios de producción.

## Veredicto

**Estado general: BLOQUEADO para producción; con observaciones para demo controlada.**

La línea base funcional está verde, pero la autorización sólo autentica varias
operaciones críticas. Un JWT de aprendiz puede crear/cerrar salas, hacer un override
y aprobar una excusa. La recuperación de contraseña entrega el secreto de reset.

| Módulo | Completitud | Estado | Base |
|---|---:|---|---|
| Identity/Auth | 45% | Rojo | JWT/bcrypt existen; reset y secreto por defecto bloquean producción. |
| Sessions/Attendance | 55% | Rojo | Flujo y cálculo existen; RBAC, QR y validación divergen del SDD. |
| Excuses | 60% | Rojo | Plazo, unicidad y restauración pasan; cualquiera puede resolver. |
| Governance | 65% | Amarillo | Cuatro ojos y auditoría están probados; el borde HTTP es débil. |
| Reporting/Evidences | 55% | Rojo | Exportación existe; evidencia no valida el contenido real. |
| Frontend/UX | 55% | Amarillo | Navegable, pero login duplicado, credenciales visibles y XSS potencial. |
| Quality/DevOps | 30% | Rojo | Seis suites locales; sin cobertura, carga, E2E ni CI de PR. |
| SDD | 50% | Amarillo | 00–06 existen; 07–13 faltan y los legados divergen. |

## Evidencia de ejecución

| Comando | Resultado |
|---|---|
| npm test | PASS. Salud, QR, puntualidad, invariantes, E2E discovery e instructor assignments. |
| node backend/tests/audit-verification.test.js | 11/19 PASS; 8 controles fallaron de forma reproducible. Sale 1 mientras existan hallazgos. |

La primera ejecución aislada de npm test no pudo abrir su puerto temporal
(EACCES); la misma suite fuera del sandbox pasó. No es un fallo del repositorio.

### Auditoría reproducible

Los casos se conservan en backend/tests/audit-verification.test.js. Fallaron:

1. Aprendiz creó sala: HTTP 201, esperado 403.
2. Aprendiz cerró sala ajena: HTTP 200, esperado 403.
3. Aprendiz hizo manual-override: HTTP 200, esperado 403.
4. Aprendiz aprobó excusa ajena: HTTP 200, esperado 403.
5. forgot-password devolvió resetToken al navegador.
6. validationMode NONE creó sala: HTTP 201, esperado 400.
7. Evidencia Base64 corrupta se descargó: HTTP 200, esperado 400.
8. La cola offline almacenó dos marcaciones idénticas.

Pasaron: instructor no asignado bloqueado, coordinación bloqueada, descarga ajena
bloqueada por controlador, JWT inválido/expirado, mínimo de contraseña, token de un
uso, inyección básica, BR-04, BR-07, BR-09 y reintento/vaciado offline.

## Hallazgos

| Sev. | Archivo y evidencia | Riesgo | Solución |
|---|---|---|---|
| CRÍTICO | server.js:133-149,160-171 sólo usa authenticate; controllers.js:195,328,694,1186 no exige rol. | Escalación vertical: aprendiz altera sesiones y asistencia. | requireRole(INSTRUCTOR,COORDINADOR) en rutas; assertSessionAccess para creador/asignación en el servicio. |
| CRÍTICO | auth.js:203-207 retorna resetToken; app.js:871-884 lo rellena. | Toma de cuenta con documento/correo conocido. | Nunca devolver token; enviar enlace por correo o registrar sólo en desarrollo explícito. Invalidar tokens previos y limitar tasa. |
| CRÍTICO | auth.js:6 y controllers.js:2602 permiten super-secret-key-for-dev-only. | JWT arbitrario si falta variable de entorno. | Fallar arranque fuera de test/desarrollo; exigir secreto >=32 bytes y rotarlo. |
| ALTO | server.js:186 omite requireRole(COORDINADOR). | La protección depende del controlador y puede perderse en un cambio futuro. | Añadir guardia de ruta y mantener autorización por recurso. |
| ALTO | controllers.js:215-223 normaliza modo inválido. | BR-05 no tiene contrato estricto. | Rechazar enum fuera de IP_AND_QR, QR_ONLY, IP_ONLY y comprobar flags. |
| ALTO | controllers.js:33-35,505-511,1258-1264 usa 60 s y acepta diez ventanas previas. | Incumple BR-03/ADR-002: 15 s + un slot; reutilización amplia. | Constantes QR_WINDOW_MS=15000 y QR_LEEWAY_SLOTS=1; reloj fijo en pruebas. |
| ALTO | controllers.js:2160-2181,2260-2272 confía en extensión/MIME y Buffer.from. | MIME falsificable y Base64 corrupto llega a descarga. | Base64 canónico, tamaño antes/después, magic bytes PDF/XLSX y almacenamiento privado. |
| ALTO | server.js:68 permite CORS *; no hay rate limit en login/reset/check-in. | Fuerza bruta y abuso desde orígenes no autorizados. | Lista de orígenes por entorno y rate limit por IP+identificador. |
| ALTO | app.js:2749-2757,2820-2867,3417-3425,3818-3825 usa innerHTML con datos persistidos. | XSS almacenado por texto, atributos o data URLs. | APIs DOM/textContent, URLs permitidas, CSP sin unsafe-inline. |
| MEDIO | server.js:169-171, controllers.js:2388-2440, db.js:239-241 conservan biometría. | Incumple ADR-003. | Retirar rutas/columnas tras migración de retención y probar ausencia funcional. |
| MEDIO | db.js:44-47 reemplaza cada ?, migraciones “non-fatal”. | SQL con ? literal y esquema Postgres parcialmente migrado. | Generador de placeholders/dialectos y migraciones versionadas transaccionales. |
| MEDIO | No hay PostgreSQL ni pruebas de transacción/concurrencia. | NFR-07 y cuatro ojos no están demostrados. | PostgreSQL efímero en CI y transacciones de casos de uso. |
| MEDIO | docs/DISCOVERY.md:175,180,187,195,217,254 tiene marcadores Git. | Documento contradictorio. | Resolver conflicto, elegir métrica canónica y usar git diff --check. |
| BAJO | frontend/index.html:277,292,323 muestra credenciales de desarrollo. | Riesgo y apariencia de prototipo. | Quitar values y la tarjeta; documentar demo local fuera de HTML. |
| BAJO | docs aún referencia back/ y app/; agenters.py, horario.pdf, plan_temp.md no tienen dueño. | Onboarding desalineado. | Inventariar, archivar/eliminar en PR dedicado y actualizar rutas. |

## Reglas, NFR y portabilidad

| Regla | Estado | Acción |
|---|---|---|
| BR-01 | Parcial: check-in/autoregistro automatricula (controllers.js:549-557,1299-1306). | No matricular desde asistencia; exigir matrícula activa. |
| BR-02 | Probada en suite heredada. | Mantener función pura y cubrir todos los límites. |
| BR-03 | Incumplida por 60 s + diez minutos. | Corregir constantes o aprobar ADR sustituto. |
| BR-04 | Índice y prueba presentes. | Traducir constraint a HTTP 409 estable. |
| BR-05 | Rechaza QR+IP apagados, acepta NONE declarado. | Validación estricta del enum. |
| BR-06 | Check-in verifica expiración. | Probar activate/close/reopen con propietario autorizado. |
| BR-07 | Frontera pasó. | Añadir festivos colombianos y reloj inyectable. |
| BR-08/12 | Cuatro ojos pasa. | Transacción y rol explícito de coordinador. |
| BR-09 | Restaura 6/0. | Autorizar instructor asignado y auditar resolución. |
| NFR-01/07 | Sin benchmark 50 concurrentes ni Postgres CI. | Autocannon y PostgreSQL efímero. |

## Quick wins: orden de ejecución

1. En backend/src/server.js, añadir roles explícitos: instructor/coordinador para
sesiones, override, excusas, tardanzas y evidencia; coordinador para todo /api/coord,
incluida descarga. En controllers.js, añadir assertSessionAccess. **Aceptación:** los
casos RBAC de auditoría responden 403 y no hay 500 con JWT inválido.
2. En backend/src/auth.js, eliminar retorno de reset token y fallback JWT productivo;
en server.js añadir rate limit y CORS configurado. **Aceptación:** resetToken no está
en HTTP y arranque productivo falla sin JWT_SECRET robusto.
3. Extraer validateValidationMode y decodeEvidence en backend/src/modules/shared.
**Aceptación:** NONE, Base64 corrupto y MIME/extension discrepante devuelven 400.
4. Resolver los conflictos de docs/DISCOVERY.md y referencias antiguas; clasificar
agenters.py, horario.pdf y docs/planning/plan_temp.md. **Aceptación:** rg de
marcadores no devuelve resultados y cada artefacto tiene dueño.
5. Ajustar QR a 15 s + un leeway o aprobar ADR que reemplace BR-03. **Aceptación:**
prueba con reloj fijo acepta sólo la ventana actual/anterior.

## Siguiente sprint

### Modularización

Crear backend/src/modules/{sessions,attendance,excuses,governance,reporting}/ con
routes.js, service.js, repository.js y policy.js; db.js queda como adaptador. Migrar
primero funciones puras y sesiones, luego asistencia/excusas y gobierno/reportes;
server.js importa routers. Crear frontend/modules con los mismos dominios y dejar
app.js como bootstrap/estado mínimo. **Aceptación:** ningún módulo importa SQL de
otro y controllers.js/app.js dejan de concentrar lógica de dominio.

### Pruebas y NFR

Reescribir integration.test.js como función exportada que levanta
http.createServer(app) en puerto efímero y agregarla a run-all.js. Añadir c8 con 80%
global y 90% sessions/attendance, Node tests para offline-queue.js y Playwright para
login/check-in/excusa. Ejecutar autocannon a 50 conexiones y PostgreSQL efímero.
**Aceptación:** cobertura publicada; p95 <300 ms; migraciones idempotentes en ambos
motores; E2E Chromium verde.

### CI/CD

Conservar .github/workflows/release.yml para tags y añadir ci.yml para push/PR:
checkout, Node 20, npm ci, npm test, auditoría de dependencias, cobertura, PostgreSQL
y Playwright. **Aceptación:** no se fusiona un PR sin esos checks.

## SDD pendiente

| Sección | Documentos mínimos | Actualizar cuando |
|---|---|---|
| 07-api | README, rest-conventions, endpoint-catalog | Cambie ruta, payload, error o autorización. |
| 08-uml | contexto y secuencias login/check-in/excusa/estados | Cambie flujo. |
| 09-modules | module-catalog y contratos por módulo | Se extraiga módulo, tabla o dueño. |
| 10-devops | CI, secretos, despliegue Vercel, rollback | Cambie pipeline/infra. |
| 11-quality | estrategia, cobertura, rendimiento, matriz NFR | Cambie suite/umbral. |
| 12-ux-ui | design system, accesibilidad, flujo login | Cambie pantalla/interacción. |
| 13-operations | incidentes, backup/restore, retención, runbook | Cambie operación/datos. |

La propuesta UX específica está en docs/ui-ux/login-redesign-proposal.md.

