# Prompt de implementación para Anti-gravity

## Uso

Copiar desde **Inicio del prompt** hasta **Fin del prompt** en Anti-gravity. Este encargo implementa los hallazgos de auditoría y exige una auditoría de cierre. La arquitectura obligatoria es un monolito modular por N capas; en este proyecto N = 7.

## Inicio del prompt

Eres el responsable técnico de implementar el plan de mejora del repositorio `Sistema-de-asistencia`. Trabaja con disciplina de seguridad, UX, accesibilidad y QA. El producto es institucional del SENA.

### Resultado que debes entregar

1. Un monolito modular de **7 capas**, según `docs/architecture/n-layer-modular-monolith.md`. No propongas ni crees microservicios, mensajería distribuida, bases de datos por servicio ni una reescritura total.
2. Las correcciones del informe `docs/validation/audit-report.md`, empezando por los riesgos críticos y altos.
3. Una pantalla de acceso SENA accesible, usable y coherente con `docs/ui-ux/login-redesign-proposal.md`.
4. Pruebas automatizadas, CI y evidencias de validación suficientes para repetir la auditoría de cierre.
5. Un informe final que clasifique cada hallazgo como corregido, mitigado, pendiente o no aplicable, con evidencia verificable.

### Fuentes de verdad que debes leer antes de modificar código

- `docs/validation/audit-report.md`
- `docs/architecture/n-layer-modular-monolith.md`
- `docs/ui-ux/login-redesign-proposal.md`
- `docs/architecture/`, `docs/decisions/`, `docs/security/` y `docs/api/`
- `backend/tests/audit-verification.test.js` y la suite existente
- Código vigente de `backend/src/` y `frontend/`

Cuando las fuentes discrepen, conserva la regla académica o de negocio que tenga evidencia; registra la discrepancia y crea una decisión o una pregunta bloqueante. No inventes reglas.

### Identidad visual del SENA: requisito de aceptación

- Descarga e incorpora **el logotipo oficial sin alterarlo**, desde el Manual de Identidad Visual SENA 2024: `https://historico.sena.edu.co/es-co/Documents/MANUAL_IDENTIDAD_VISUAL_SENA_2024.pdf`.
- No generes, redibujes, deformes, recortes ni cambies colores, tipografía, proporción o zona de protección del símbolo. Conserva en el repositorio la fuente oficial, versión, URL y fecha de consulta en `docs/branding/sena-logo-source.md`.
- Usa únicamente una variante autorizada para el fondo donde se muestre; conserva el archivo original vectorial si el manual lo provee y usa una versión raster derivada sólo cuando sea técnicamente necesaria.
- El logo debe estar visible en la experiencia de inicio de sesión y en las vistas institucionales principales, con texto alternativo `SENA` y sin convertirlo en texto de baja accesibilidad.
- No uses recursos generados por IA para representar el logo.

### Modelo de trabajo multiagente

Trabaja con hasta cuatro agentes concurrentes, incluyendo un integrador. Usa paralelismo solamente cuando las rutas, carpetas y contratos no se solapen. Cada agente usa su propia rama o worktree y no edita archivos propiedad de otro agente.

| Rol | Responsabilidad | Propiedad inicial |
| --- | --- | --- |
| Integrador/arquitecto | Baseline, contratos, estructura de 7 capas, integración, decisiones y auditoría de cierre | bootstrap, rutas, ADR, CI e informes |
| Seguridad e identidad | JWT, recuperación de contraseña, RBAC y autorización por recurso | `identity`, middleware/policies y pruebas de seguridad |
| Asistencia y evidencias | Salas, QR, puntualidad, validación de evidencia y auditoría | `attendance` y `academic` relacionados |
| Experiencia y calidad | Login SENA, XSS, accesibilidad, cola offline, E2E y documentación UX | `frontend`, E2E y documentación UX |

No paralelices todavía si dos cambios tocan `server.js`, el mismo contrato o una misma migración. El integrador congela el contrato, asigna propietario y realiza la integración en el orden indicado. Ningún agente modifica el código de otro para “desbloquearse”; comunica la necesidad al integrador.

### Puertas de control

1. Crea una línea base: estado Git, versión de Node, `npm test` y ejecución separada de `backend/tests/audit-verification.test.js`. Registra fallos actuales sin ocultarlos.
2. Antes de cada corrección, añade o ajusta una prueba que falle por el defecto real. Luego implementa el mínimo cambio para que pase.
3. Mantén cada commit pequeño, con pruebas y documentación de la regla asociada. No mezcles refactor, nueva función y cambios de formato masivos.
4. Antes de integrar una rama, ejecuta pruebas unitarias, integración afectada, análisis estático y revisión de seguridad sobre el diff.
5. Si un cambio exige una nueva regla de negocio, pausa ese cambio y solicita definición; no uses credenciales demo, secretos por defecto ni bypasses para avanzar.

### Iteraciones y orden obligatorio

#### Iteración 0 — Baseline y guardrails

- Inventaria los endpoints, roles y reglas. Resuelve o documenta los marcadores de conflicto de documentación.
- Crea el registro de decisiones, la matriz ruta/rol/recurso y los criterios de aceptación por hallazgo.
- Instala sólo dependencias justificadas. Configura secretos por entorno: en producción debe fallar el arranque si falta `JWT_SECRET` fuerte.

**Salida:** baseline reproducible y contratos congelados para la siguiente iteración.

#### Iteración 1 — Seguridad e identidad

- Elimina el secreto JWT por defecto y no expongas tokens de recuperación en respuestas API ni registros.
- Aplica autenticación, RBAC y autorización por recurso en creación/cierre de sala, anulación manual, resolución de excusas y descarga de evidencias. El control debe ser centralizable, negado por defecto y probado con cuentas de distintos roles/recursos.
- Cierra rutas de coordinación que sólo validan autenticación.

**Salida:** las pruebas de acceso indebido incluidas en `audit-verification.test.js` pasan.

#### Iteración 2 — Reglas de asistencia y evidencias

- Formaliza en dominio las reglas BR-07, BR-09, QR, matrícula de aprendiz y duplicados de excusa.
- Ajusta el QR a la regla aprobada: vigencia de 15 segundos y una única franja de tolerancia, salvo decisión documentada que reemplace explícitamente la regla.
- Valida modo de asistencia con enum estricto; rechaza valores desconocidos.
- Valida evidencia por tamaño, Base64 canónico, tipo permitido y firma/magic bytes. Restringe descarga a quien tenga autorización del recurso.
- Retira endpoints, banderas y campos biométricos conforme ADR-003, o documenta una excepción formal aprobada.

**Salida:** reglas puras unitarias, integración transaccional y casos límite cubiertos.

#### Iteración 3 — Persistencia y gobierno académico

- Separa puertos de repositorio y adaptadores. No dejes SQL dentro de controladores ni casos de uso.
- Implementa migraciones, restricciones únicas e integridad referencial que impidan estados imposibles.
- Corrige la compatibilidad PostgreSQL y pruébala en CI; no declares soporte hasta que pase la misma suite crítica que SQLite.
- Explicita el origen y la actualización de `programKey`/malla académica. Toda corrección de asistencia debe conservar una traza auditable.

**Salida:** monolito modular en 7 capas con pruebas SQLite/PostgreSQL relevantes.

#### Iteración 4 — UX, accesibilidad y resistencia de cliente

- Implementa el login institucional con el logo oficial SENA, sin credenciales de demostración visibles ni valores precargados.
- Sustituye interpolación insegura en `innerHTML` por renderizado seguro; no introduzcas nuevos sinks sin escape.
- Implementa deduplicación e idempotencia en cola offline, feedback de sincronización, reintentos controlados y resolución visible de conflicto.
- Valida teclado, foco, etiquetas, contraste, mensajes de error y vista móvil con pruebas E2E.

**Salida:** experiencia accesible y resistente, con evidencia visual y E2E.

#### Iteración 5 — Calidad operacional

- Integra al comando estándar las pruebas de regresión relevantes; no dejes una suite crítica aislada sin ejecución en CI.
- Añade cobertura verificable con umbrales iniciales y aumento gradual. Incluye E2E, integración, análisis de secretos y revisión de dependencias.
- Añade logs estructurados, manejo de errores sin filtrar secretos y documentación operativa consistente con la implementación.

**Salida:** pipeline repetible que bloquea regresiones críticas.

#### Iteración 6 — Auditoría de cierre

Ejecuta y documenta, como mínimo:

```text
npm test
node backend/tests/audit-verification.test.js
pruebas de PostgreSQL en CI
E2E de login, asistencia y cola offline
análisis de secretos, dependencias y XSS
prueba de concurrencia de al menos 50 solicitudes y percentil p95
revisión manual de las siete capas y de documentación
```

Actualiza `docs/validation/audit-report.md` sin borrar la evidencia inicial. Crea `docs/validation/re-audit-report.md` con: alcance, commit auditado, comandos, resultados, hallazgos residuales, severidad antes/después, evidencias y decisión de liberación.

### Restricciones técnicas no negociables

- Una sola aplicación desplegable y una base de datos; no microservicios.
- Dependencias únicamente hacia el interior de las siete capas; infraestructura se inyecta en bootstrap.
- No secretos, tokens de reset, PII o evidencias en logs ni respuestas innecesarias.
- No datos demo ni usuarios por defecto en producción.
- No afirmar una corrección sin enlazar prueba, comando y resultado.
- Conserva compatibilidad de API cuando sea posible; si hay cambio rompedor, versiona/documenta la transición y añade pruebas de migración.

### Formato de informe por iteración

Para cada iteración informa: objetivo, archivos modificados, pruebas añadidas, comandos ejecutados y resultado, riesgos residuales, decisiones tomadas y siguiente puerta de control. Si no logras comprobar algo, decláralo como pendiente, no como terminado.

## Fin del prompt
