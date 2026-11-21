/**
 * Capa 2 (Entrega HTTP) - Rutas del módulo Identity (autenticación, registro, contraseña, Habeas Data).
 * Cero SQL y cero reglas de negocio directas.
 */
import { Router } from 'express';

export function createIdentityRouter({ handlers, middleware }) {
  const router = Router();
  const { authenticate, requireApprentice, authRateLimiter, resetRateLimiter } = middleware;

  router.post('/api/auth/login', authRateLimiter, handlers.login);
  router.post('/public/student/login', authRateLimiter, handlers.studentLogin);
  router.post('/public/student/register', authRateLimiter, handlers.registerStudent);
  router.post('/public/auth/forgot-password', resetRateLimiter, handlers.forgotPassword);
  router.post('/public/auth/reset-password', resetRateLimiter, handlers.resetPassword);
  router.post('/api/auth/verify-password', authenticate, handlers.verifyPassword);
  router.post('/api/auth/change-password', authenticate, handlers.changePassword);

  router.delete('/api/student/delete-account', authenticate, requireApprentice, handlers.deleteStudentAccount);
  router.post('/api/student/accept-terms', authenticate, requireApprentice, handlers.acceptStudentTerms);

  return router;
}
