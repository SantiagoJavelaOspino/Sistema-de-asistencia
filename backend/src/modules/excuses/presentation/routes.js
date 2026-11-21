/**
 * Capa 2 (Entrega HTTP) - Rutas del módulo Excuses (radicación y resolución de excusas).
 * Cero SQL y cero reglas de negocio directas.
 */
import { Router } from 'express';

export function createExcusesRouter({ handlers, middleware }) {
  const router = Router();
  const { authenticate, requireApprentice, requireStaff } = middleware;

  router.post('/api/student/excuses', authenticate, requireApprentice, handlers.submitExcuse);
  router.post('/api/excuses/submit', authenticate, requireApprentice, handlers.submitExcuse);
  router.get('/api/instructor/excuses', authenticate, requireStaff, handlers.getInstructorExcuses);
  router.post('/api/instructor/excuses/:id/resolve', authenticate, requireStaff, handlers.resolveExcuse);

  return router;
}
