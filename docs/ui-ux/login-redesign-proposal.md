# Propuesta UX — Login institucional simplificado

**Estado:** propuesta para implementar tras corregir la recuperación de contraseña.  
**Usuarios:** aprendiz, instructor y coordinador SENA.

## Diagnóstico

La entrada actual divide “Portal del Aprendiz” y “Funcionarios”, luego repite dos
formularios equivalentes. La persona debe adivinar su rol aunque el backend ya lo
conoce. En funcionarios se precargan/muestran credenciales; recuperación muestra un
token técnico; QR, registro y login compiten visualmente.

| Fricción | Efecto |
|---|---|
| Dos portales y formularios | Duda de rol y mantenimiento duplicado. |
| Credenciales prellenadas | Riesgo de seguridad y sensación de prototipo. |
| Reset con token visible | Expone implementación y habilita takeover actual. |
| QR, registro y login mezclados | En aula no destaca la acción más rápida. |

## Diseño recomendado

Un único login para toda cuenta institucional; el servidor devuelve roles y el cliente
dirige al panel. El check-in queda separado y principal para quien ya está frente al QR.
No se pide selector de rol.

    SENA · Control de asistencia
    ¿Estás en el aula?
    [ Escanear QR ] [ Usar código ]
    ─────── o ingresa a tu cuenta ───────
    Documento o correo
    [________________________________]
    Contraseña                 ¿Olvidaste?
    [________________________________]
    [ Ingresar ]
    ¿No tienes cuenta? Regístrate en ficha

## Flujo

1. QR/código conserva pending_qr_token y abre el mismo login si falta sesión.
2. La persona escribe documento/correo y contraseña una vez.
3. POST /api/auth/login devuelve JWT y roles; showDashboard dirige a aprendiz,
instructor o coordinación. Rol no habilitado recibe mensaje neutro.
4. Si existe código pendiente, dashboard hace el check-in y confirma resultado.
5. Recuperación sólo dice que se enviaron instrucciones; jamás presenta un token.

## Implementación

1. **API:** en backend/src/auth.js, login acepta todos los roles activos y reset no
devuelve secreto; server.js añade rate limit. Documentar contrato en 07-api.
2. **HTML:** en frontend/index.html sustituir portalScreen, loginScreen y
studentLoginScreen por una portada con acción QR y un form unifiedLoginForm. Quitar
values de demo y tarjeta de credenciales; registro queda como enlace secundario.
3. **Cliente:** extraer frontend/modules/auth/login.js con
submitUnifiedLogin({ identifier, password, pendingQrToken }); reutilizar
showDashboard y retirar listeners duplicados de frontend/app.js.
4. **Accesibilidad:** etiquetas persistentes, autocomplete username/current-password,
foco al error, aria-live polite, contraste AA y teclado completo.
5. **Estados:** deshabilitar durante envío; conservar identificador, nunca contraseña;
error de credenciales neutral y regreso visible a escaneo.
6. **Pruebas:** Playwright cubre tres roles, QR pendiente, 401, reset sin secreto y
teclado; unit tests cubren enrutamiento de roles.

## Criterios de aceptación

- No hay selector de rol ni campos duplicados.
- Aprendiz con QR pendiente completa registro desde el mismo formulario.
- Instructor y coordinador llegan a su panel por el mismo endpoint.
- HTML no contiene credenciales ni valores secretos de ejemplo.
- Recuperación no retorna token HTTP ni lo presenta en la UI.
- Lighthouse/axe no encuentra errores críticos de etiqueta, foco o contraste.

