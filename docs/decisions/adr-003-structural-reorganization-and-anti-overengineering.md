# ADR-003: Simplificación de validaciones y organización por capas

- **Fecha:** 2026-08-22
- **Estado:** Aceptado
- **Autores:** Equipo de Desarrollo SENA

---

## 1. Contexto y Diagnóstico del Problema

Durante las sesiones reales de prueba en el aula y la evaluación de ingeniería inversa ([`docs/academic/INGENIERIA_INVERSA.md`](file:///c:/Users/merid/Downloads/ejemplo/docs/academic/INGENIERIA_INVERSA.md)), se identificaron varios casos de **sobreingeniería y fricción operativa** que ralentizaban la toma de asistencia y causaban bloqueos injustificados a estudiantes honestos:

1. **Reconocimiento Facial Hiperestricto en Navegador (`face-api.js`):** La descarga y ejecución de redes neuronales pesadas en celulares de gama de entrada saturaba la memoria y fallaba ante condiciones de iluminación del aula, impidiendo que el alumno completara el check-in.
2. **Validación de Subred IP Rígida:** Se asumía que todos los aprendices se conectarían a la red Wi-Fi institucional del aula. En la práctica, muchos aprendices utilizan sus datos móviles personales (4G/5G), recibiendo rechazos inmediatos por discrepancia de IP pública.
3. **Rotación Excesivamente Rápida del Token QR (15 segundos):** La latencia de red en combinación con el tiempo de enfoque de las cámaras generaba solicitudes con tokens expirados antes de llegar al servidor.
4. **Estructura Desordenada del Repositorio:** Existían carpetas dispersas sin una clara separación de responsabilidades por capa.

---

## 2. Decisiones Arquitectónicas Adoptadas

### A. Reorganización Canónica en 4 Áreas Principales
Se consolida el monorepo en exactamente 4 carpetas con fronteras de responsabilidad estrictas:
* `frontend/`: SPA y vistas móviles en Vanilla JS y Tailwind CDN.
* `backend/`: API REST Node.js/Express, autenticación y persistencia conmutable.
* `database/`: Modelos y scripts canónicos SQL (`schema.sql`, `seeds.sql`).
* `docs/`: Documentación técnica, ADRs, UX/UI, seguridad, validación y entregables académicos.

### B. Retiro de biometría facial
* Se elimina la biometría facial y cualquier endpoint asociado.
* El registro usa QR temporal y código manual de contingencia, sin tratamiento biométrico.

### C. Validaciones de acceso configurables
* Las restricciones técnicas no sustituyen la autorización por rol, recurso y contexto académico.
* Cualquier verificación auxiliar debe ser explícita, auditable y no excluir injustificadamente a aprendices.

### D. Rotación QR conforme a BR-03
* Los tokens HMAC-SHA256 se generan en ventanas de **15 segundos**.
* Sólo se admite una franja de tolerancia para una transición de red legítima.

### E. Arquitectura de siete capas
* El código se organiza en experiencia, presentación HTTP, aplicación, dominio, puertos, persistencia e infraestructura/composición.
* La decisión no prescribe una estrategia de despliegue; prescribe la dirección de dependencias y los patrones por capa.

---

## 3. Consecuencias y Beneficios

* **Velocidad de Registro:** El tiempo promedio de marcación de asistencia se reduce a un proceso fluido de **máximo 1 minuto por aprendiz**.
* **Cero Exclusión Tecnológica:** Ningún estudiante queda fuera de la lista por fallas de cámara, batería o datos móviles gracias a las contingencias de código manual de 6 caracteres y anulación manual (**Override**) del instructor.
* **Mantenibilidad y Trabajo en Equipo:** Los 3 desarrolladores cuentan con áreas aisladas (`frontend/`, `backend/`, `database/`, `docs/`) para trabajar de forma asíncrona mediante ramas independientes sin riesgo de conflictos de fusión.
