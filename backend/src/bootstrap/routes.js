/**
 * Capa 7 (Bootstrap) - Composición centralizada de routers modulares (Capa 2).
 */
import * as authHandlers from '../auth.js';
import * as controllers from '../controllers.js';
import { createIdentityRouter } from '../modules/identity/presentation/routes.js';
import { createAttendanceRouter } from '../modules/attendance/presentation/routes.js';
import { createExcusesRouter } from '../modules/excuses/presentation/routes.js';
import { createAcademicRouter } from '../modules/academic/presentation/routes.js';
import { createRateLimiter } from '../shared/infrastructure/rateLimit.js';

export function registerRoutes(app) {
  const middleware = {
    authenticate: authHandlers.authenticate,
    requireStaff: authHandlers.requireRole('INSTRUCTOR', 'COORDINADOR'),
    requireApprentice: authHandlers.requireRole('APRENDIZ'),
    requireCoordinator: authHandlers.requireRole('COORDINADOR'),
    authRateLimiter: createRateLimiter({ windowMs: 60_000, max: 30, keyPrefix: 'auth' }),
    resetRateLimiter: createRateLimiter({ windowMs: 60_000, max: 10, keyPrefix: 'reset' }),
    checkinRateLimiter: createRateLimiter({ windowMs: 60_000, max: 120, keyPrefix: 'checkin' })
  };

  // Health & readiness probes
  app.get('/health', (req, res) => res.status(200).send('ok'));
  app.get('/ready', (req, res) => res.status(200).send('ready'));

  const handlers = { ...authHandlers, ...controllers };

  app.use(createIdentityRouter({ handlers, middleware }));
  app.use(createAttendanceRouter({ handlers, middleware }));
  app.use(createExcusesRouter({ handlers, middleware }));
  app.use(createAcademicRouter({ handlers, middleware }));
}
