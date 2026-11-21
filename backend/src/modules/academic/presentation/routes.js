/**
 * Capa 2 (Entrega HTTP) - Rutas del módulo Academic (catálogos, fichas, instructores, 4 ojos, auditoría).
 * Cero SQL y cero reglas de negocio directas.
 */
import { Router } from 'express';

export function createAcademicRouter({ handlers, middleware }) {
  const router = Router();
  const { authenticate, requireStaff, requireCoordinator } = middleware;

  router.get('/public/fichas', handlers.getPublicFichas);

  router.get('/api/institutions', authenticate, requireStaff, handlers.getInstitutions);
  router.get('/api/institutions/:institutionId/units', authenticate, requireStaff, handlers.getUnits);
  router.get('/api/units/:unitId/people', authenticate, requireStaff, handlers.getPeople);
  router.get('/api/instructor/my-units', authenticate, requireStaff, handlers.getInstructorUnits);

  router.get('/api/coord/instructors', authenticate, requireCoordinator, handlers.getCoordInstructors);
  router.post('/api/coord/instructors', authenticate, requireCoordinator, handlers.createInstructor);
  router.put('/api/coord/instructors/:id', authenticate, requireCoordinator, handlers.updateInstructor);
  router.post('/api/coord/instructors/:id/units', authenticate, requireCoordinator, handlers.assignInstructorUnits);
  router.get('/api/coord/fichas', authenticate, requireCoordinator, handlers.getCoordFichas);
  router.post('/api/coord/fichas', authenticate, requireCoordinator, handlers.createFicha);
  router.put('/api/coord/fichas/:id', authenticate, requireCoordinator, handlers.updateFicha);
  router.post('/api/coord/fichas/:id/request-deletion', authenticate, requireCoordinator, handlers.requestFichaDeletion);
  router.get('/api/coord/deletion-requests', authenticate, requireCoordinator, handlers.getPendingDeletionRequests);
  router.post('/api/coord/deletion-requests/:requestId/approve', authenticate, requireCoordinator, handlers.approveFichaDeletion);
  router.post('/api/coord/deletion-requests/:requestId/reject', authenticate, requireCoordinator, handlers.rejectFichaDeletion);
  router.get('/api/coord/audit-logs', authenticate, requireCoordinator, handlers.getAuditLogs);

  return router;
}
