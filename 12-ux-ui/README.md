# 12 — UX/UI, Identidad Institucional y Accesibilidad

- **Identidad SENA:** Logotipo oficial incorporado sin alteración en `frontend/assets/brand/sena-logo-official.png` con trazabilidad en [`../docs/branding/sena-logo-source.md`](../docs/branding/sena-logo-source.md).
- **Login Institucional Unificado:** Implementado según [`../docs/ui-ux/login-redesign-proposal.md`](../docs/ui-ux/login-redesign-proposal.md):
  - Acceso único para Aprendiz, Instructor y Coordinador sin selector de rol.
  - Acción rápida en aula (Escanear QR / Código de 6 caracteres) priorizada en la parte superior.
  - Cero credenciales demo ni valores precargados en HTML.
  - Accesibilidad: etiquetas persistentes, `autocomplete="username"` / `current-password`, foco al error, `aria-live="polite"`, contraste AA y teclado completo.
- **Resistencia cliente:** Sanitización XSS (`escapeHtml`, `isSafeDataOrHttpUrl`) y cola offline deduplicada e idempotente (`frontend/offline-queue.js`).
