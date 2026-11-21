# Prácticas de trabajo del repositorio

Este documento define la colaboración del equipo para el Sistema de Asistencia Académica SENA. No define la arquitectura: esa responsabilidad está en [`../architecture/n-layer-architecture.md`](../architecture/n-layer-architecture.md).

## Ramas

```text
main
├── feat/frontend-ux
├── feat/backend-security
└── feat/data-quality-and-tests
```

- `main` recibe sólo cambios revisados y con pruebas en verde.
- `feat/<área>-<descripción>` contiene trabajo funcional o de refactorización.
- `fix/<área>-<descripción>` contiene una corrección acotada.
- `docs/<área>-<descripción>` actualiza documentación.

## Convenciones de cambios

Usar mensajes con el formato `<tipo>(<área>): <descripción breve>`. Tipos habituales: `feat`, `fix`, `docs`, `refactor`, `test` y `chore`.

## Integración

Antes de fusionar una rama:

1. Sincronizar con `main`.
2. Ejecutar `npm test` y las pruebas específicas afectadas.
3. Confirmar que la documentación refleja las capas y los contratos modificados.
4. Solicitar revisión cruzada cuando cambien autenticación, reglas académicas, persistencia o contratos HTTP.

## Distribución de trabajo sugerida

| Área | Propiedad |
| --- | --- |
| Frontend y UX | `frontend/`, `docs/ui-ux/` |
| Backend y seguridad | `backend/`, `docs/api/`, `docs/security/` |
| Datos, calidad y pruebas | `database/`, `backend/tests/`, `docs/validation/` |

La asignación de trabajo no altera los límites de las siete capas ni autoriza dependencias contrarias a la arquitectura.
