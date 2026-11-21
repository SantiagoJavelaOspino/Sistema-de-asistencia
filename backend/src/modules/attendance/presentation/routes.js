/**
 * Capa 2 (Entrega HTTP) - Rutas del módulo Attendance (salas, QR, check-in, reportes, evidencias).
 * Cero SQL y cero reglas de negocio directas.
 */
import { Router } from 'express';

export function createAttendanceRouter({ handlers, middleware }) {
  const router = Router();
  const { authenticate, requireStaff, requireApprentice, requireCoordinator, checkinRateLimiter } = middleware;

  // Check-in público
  router.post('/attendance/checkin', checkinRateLimiter, handlers.checkin);
  router.post('/public/attendance/:token/register', checkinRateLimiter, handlers.checkin);
  router.post('/public/attendance/:token/self-register', checkinRateLimiter, handlers.selfRegisterCheckin);
  router.post('/public/attendance/:token/late-request', checkinRateLimiter, handlers.submitLateRequest);
  router.post('/public/attendance/:token/check-document', checkinRateLimiter, handlers.checkDocument);
  router.post('/public/attendance/:token/late-checkin', checkinRateLimiter, handlers.studentLateCheckin);

  router.get('/attendance/:token', (req, res) => {
    return res.redirect(`/?token=${encodeURIComponent(req.params.token)}`);
  });

  // Sesiones y control de aula (Instructor / Coordinador)
  router.post('/api/sessions', authenticate, requireStaff, handlers.createSessionDraft);
  router.post('/api/sessions/:sessionId/activate', authenticate, requireStaff, handlers.activateSession);
  router.post('/api/sessions/:sessionId/close', authenticate, requireStaff, handlers.closeSession);
  router.get('/api/sessions/:sessionId', authenticate, requireStaff, handlers.getSession);
  router.get('/api/sessions/:sessionId/qr-token', authenticate, requireStaff, handlers.getSessionQrToken);
  router.get('/api/sessions', authenticate, requireStaff, handlers.getSessionsHistory);

  router.get('/api/sessions/:sessionId/present', authenticate, requireStaff, handlers.getPresent);
  router.get('/api/sessions/:sessionId/absent', authenticate, requireStaff, handlers.getAbsent);
  router.get('/api/sessions/:sessionId/rejections', authenticate, requireStaff, handlers.getRejections);

  router.post('/room/create', authenticate, requireStaff, handlers.createRoom);
  router.post('/room/reopen', authenticate, requireStaff, handlers.reopenRoom);
  router.post('/attendance/manual-override', authenticate, requireStaff, handlers.manualOverride);
  router.post('/attendance/manual-checkin', authenticate, requireStaff, handlers.manualLateCheckin);
  router.get('/reports/session/:sessionId', authenticate, requireStaff, handlers.getSessionReport);

  // Portal aprendiz
  router.get('/api/student/history', authenticate, requireApprentice, handlers.getStudentHistory);
  router.get('/api/student/active-session', authenticate, requireApprentice, handlers.getStudentActiveSession);

  // Evidencias y solicitudes tardías
  router.get('/api/instructor/late-requests', authenticate, requireStaff, handlers.getInstructorLateRequests);
  router.post('/api/instructor/late-requests/:id/resolve', authenticate, requireStaff, handlers.resolveLateRequest);
  router.post('/api/sessions/:sessionId/evidence', authenticate, requireStaff, handlers.submitSessionEvidence);
  router.get('/api/coord/evidences', authenticate, requireCoordinator, handlers.getCoordEvidences);
  router.get('/api/coord/evidences/:sessionId/download', authenticate, requireCoordinator, handlers.downloadSessionEvidence);

  return router;
}
