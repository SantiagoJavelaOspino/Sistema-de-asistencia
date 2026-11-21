# 10 — DevOps, CI/CD y Despliegue

- **CI (Push/PR):** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) ejecuta:
  1. Verificación de ausencia de marcadores de conflicto Git.
  2. Suite completa (`npm test`), incluyendo fronteras de 7 capas, reglas puras de dominio, experiencia/XSS/offline y auditoría de seguridad.
  3. Benchmark de concurrencia NFR-01 (`>= 50` solicitudes concurrentes, `p95 < 300 ms`).
  4. Job dedicado de portabilidad PostgreSQL 16 (`DATABASE_URL`).
  5. Auditoría de dependencias (`npm audit`).
- **Despliegue:** Aplicación monolítica única en Vercel (`vercel.json` -> `backend/src/server.js` -> `bootstrap/server.js`).
- **Secretos obligatorios en producción:** `NODE_ENV=production`, `JWT_SECRET` (>= 32 bytes; el arranque falla si falta o es débil), `DATABASE_URL` (PostgreSQL), `CORS_ORIGINS`.
