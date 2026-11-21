# Contribuir al Sistema de Asistencia SENA

## Antes de desarrollar

1. Lea [`docs/architecture/n-layer-architecture.md`](docs/architecture/n-layer-architecture.md).
2. Identifique la capa y el módulo dueños del cambio.
3. Escriba o ajuste una prueba que reproduzca el comportamiento esperado.
4. Si cambia un contrato, una regla académica o una decisión técnica, actualice el documento correspondiente bajo `docs/`.

## Reglas de contribución

- No saltar capas: las rutas delegan; los casos de uso coordinan; el dominio no conoce HTTP, SQL o configuración; los repositorios concentran SQL.
- No añadir lógica nueva a `backend/src/controllers.js` o `frontend/app.js` sin una excepción documentada y un plan de extracción.
- Toda ruta sensible verifica autenticación, rol y acceso al recurso.
- Mantener SQL parametrizado y migraciones compatibles con el motor validado.
- No incluir secretos, tokens, datos personales o evidencias en código, pruebas o logs.

## Verificación mínima

```text
npm test
node backend/tests/audit-verification.test.js
```

Para cambios de capas, ejecute además `node backend/tests/architecture-layers.test.js`. Una contribución no se declara terminada sin registrar los comandos y resultados en la evidencia de la entrega.
