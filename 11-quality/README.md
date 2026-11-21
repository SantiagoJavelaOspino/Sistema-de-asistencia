# 11 — Estrategia de Calidad y Pruebas

- **Comando estándar:** `npm test` (`backend/tests/run-all.js`) ejecuta 10 suites integradas:
  1. `health.test.js` (`/health`, `/ready`)
  2. `token-rotation.test.js` (QR HMAC 15s + leeway)
  3. `punctuality-hours.test.js` (BR-02)
  4. `domain-rules.test.js` (Capa 4 pura: BR-02, BR-03, BR-05, BR-07, evidencias magic bytes, guardrail JWT_SECRET)
  5. `architecture-layers.test.js` (fronteras de 7 capas y conversor SQL quote-safe)
  6. `frontend-experience.test.js` (login unificado, XSS, branding SENA, cola offline)
  7. `invariants-governance.test.js` (BR-01 a BR-12)
  8. `e2e-discovery.test.js` (flujos completos de registro, recuperación segura sin token HTTP, 4 ojos, Habeas Data)
  9. `instructor-assignments.test.js` (asignación instructor-ficha, aislamiento de excusas, evidencias)
  10. `audit-verification.test.js` (19 controles de seguridad, RBAC negativo, dominio y cola offline)
- **Rendimiento:** `node backend/tests/concurrency-benchmark.test.js` valida NFR-01 (`p95 < 300 ms` con 60 solicitudes concurrentes).
