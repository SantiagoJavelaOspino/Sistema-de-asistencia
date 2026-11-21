process.env.TZ = 'America/Bogota';
import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { login, studentLogin, authenticate, requireRole, changePassword, verifyPassword, forgotPassword, resetPassword } from './auth.js';
import { getAppConfig } from './shared/infrastructure/config.js';
import { createRateLimiter, securityHeadersMiddleware } from './shared/infrastructure/rateLimit.js';
import { logger } from './shared/infrastructure/logger.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  getInstitutions,
  getUnits,
  getPeople,
  createRoom,
  createSessionDraft,
  activateSession,
  closeSession,
  reopenRoom,
  getSession,
  getSessionQrToken,
  getSessionsHistory,
  getPresent,
  getAbsent,
  getRejections,
  checkin,
  manualOverride,
  manualLateCheckin,
  getSessionReport,
  getStudentHistory,
  submitExcuse,
  getInstructorExcuses,
  resolveExcuse,
  selfRegisterCheckin,
  submitLateRequest,
  getInstructorLateRequests,
  resolveLateRequest,
  checkDocument,
  getCoordInstructors,
  createInstructor,
  updateInstructor,
  getCoordFichas,
  createFicha,
  updateFicha,
  studentLateCheckin,
  submitSessionEvidence,
  getCoordEvidences,
  deleteStudentAccount,
  acceptStudentTerms,
  requestFichaDeletion,
  approveFichaDeletion,
  rejectFichaDeletion,
  getPendingDeletionRequests,
  getPublicFichas,
  registerStudent,
  getStudentActiveSession,
  getAuditLogs,
  assignInstructorUnits,
  getInstructorUnits,
  downloadSessionEvidence
} from './controllers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = getAppConfig();

const app = express();
const PORT = config.port;

const allowedOriginsSet = new Set(config.allowedOrigins);
app.use(securityHeadersMiddleware);
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOriginsSet.has(origin) || (!config.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const authRateLimiter = createRateLimiter({ windowMs: 60_000, max: 30, keyPrefix: 'auth' });
const resetRateLimiter = createRateLimiter({ windowMs: 60_000, max: 10, keyPrefix: 'reset' });
const checkinRateLimiter = createRateLimiter({ windowMs: 60_000, max: 120, keyPrefix: 'checkin' });

const frontendCandidates = [
  path.resolve(__dirname, '../../frontend'),
  path.resolve(process.cwd(), 'frontend'),
  path.resolve(__dirname, '../frontend'),
  path.resolve(__dirname, 'frontend')
];
const frontendPath = frontendCandidates.find(p => fs.existsSync(p)) || frontendCandidates[0];
app.use(express.static(frontendPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

app.get('/', (req, res, next) => {
  const indexPath = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.sendFile(indexPath);
  }
  next();
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.status(200).send('ok'));
app.get('/ready',  (req, res) => res.status(200).send('ready'));

// ── Public Auth & Registration ───────────────────────────────────────────────
app.post('/api/auth/login', authRateLimiter, login);
app.post('/public/student/login', authRateLimiter, studentLogin);
app.post('/public/student/register', authRateLimiter, registerStudent);
app.get('/public/fichas', getPublicFichas);
app.post('/public/auth/forgot-password', resetRateLimiter, forgotPassword);
app.post('/public/auth/reset-password', resetRateLimiter, resetPassword);
app.post('/api/auth/verify-password', authenticate, verifyPassword);
app.post('/api/auth/change-password', authenticate, changePassword);

// ── Public Check-in endpoints ─────────────────────────────────────────────────
app.post('/attendance/checkin',                      checkinRateLimiter, checkin);
app.post('/public/attendance/:token/register',        checkinRateLimiter, checkin);
app.post('/public/attendance/:token/self-register',   checkinRateLimiter, selfRegisterCheckin);
app.post('/public/attendance/:token/late-request',    checkinRateLimiter, submitLateRequest);
app.post('/public/attendance/:token/check-document',  checkinRateLimiter, checkDocument);
app.post('/public/attendance/:token/late-checkin',     checkinRateLimiter, studentLateCheckin);

// ── QR Student Redirection (Redirects directly to main application panel) ──
app.get('/attendance/:token', (req, res) => {
  const { token } = req.params;
  return res.redirect(`/?token=${encodeURIComponent(token)}`);
});

const requireStaff = requireRole('INSTRUCTOR', 'COORDINADOR');
const requireApprentice = requireRole('APRENDIZ');
const requireCoordinator = requireRole('COORDINADOR');

// ── Protected routes (Instructor catalog & control) ───────────────────────────
app.get('/api/institutions',                           authenticate, requireStaff, getInstitutions);
app.get('/api/institutions/:institutionId/units',      authenticate, requireStaff, getUnits);
app.get('/api/units/:unitId/people',                   authenticate, requireStaff, getPeople);

app.post('/api/sessions',                              authenticate, requireStaff, createSessionDraft);
app.post('/api/sessions/:sessionId/activate',          authenticate, requireStaff, activateSession);
app.post('/api/sessions/:sessionId/close',             authenticate, requireStaff, closeSession);
app.get('/api/sessions/:sessionId',                    authenticate, requireStaff, getSession);
app.get('/api/sessions/:sessionId/qr-token',           authenticate, requireStaff, getSessionQrToken);
app.get('/api/sessions',                               authenticate, requireStaff, getSessionsHistory);

app.get('/api/sessions/:sessionId/present',            authenticate, requireStaff, getPresent);
app.get('/api/sessions/:sessionId/absent',             authenticate, requireStaff, getAbsent);
app.get('/api/sessions/:sessionId/rejections',         authenticate, requireStaff, getRejections);

// Room & Manual Override
app.post('/room/create',                               authenticate, requireStaff, createRoom);
app.post('/room/reopen',                               authenticate, requireStaff, reopenRoom);
app.post('/attendance/manual-override',                authenticate, requireStaff, manualOverride);
app.post('/attendance/manual-checkin',                 authenticate, requireStaff, manualLateCheckin);
app.get('/reports/session/:sessionId',                 authenticate, requireStaff, getSessionReport);

// Student Portal
app.get('/api/student/history',                        authenticate, requireApprentice, getStudentHistory);
app.get('/api/student/active-session',                 authenticate, requireApprentice, getStudentActiveSession);
app.post('/api/student/excuses',                       authenticate, requireApprentice, submitExcuse);
app.post('/api/excuses/submit',                        authenticate, requireApprentice, submitExcuse);
app.delete('/api/student/delete-account',              authenticate, requireApprentice, deleteStudentAccount);
app.post('/api/student/accept-terms',                  authenticate, requireApprentice, acceptStudentTerms);

// Instructor Units & Excuses
app.get('/api/instructor/my-units',                    authenticate, requireStaff, getInstructorUnits);
app.get('/api/instructor/excuses',                     authenticate, requireStaff, getInstructorExcuses);
app.post('/api/instructor/excuses/:id/resolve',        authenticate, requireStaff, resolveExcuse);

// Instructor Late Requests & Evidence
app.get('/api/instructor/late-requests',               authenticate, requireStaff, getInstructorLateRequests);
app.post('/api/instructor/late-requests/:id/resolve',  authenticate, requireStaff, resolveLateRequest);
app.post('/api/sessions/:sessionId/evidence',          authenticate, requireStaff, submitSessionEvidence);

// ── Coordinator Endpoints ──────────────────────────────────────────────────────
app.get('/api/coord/instructors',                      authenticate, requireCoordinator, getCoordInstructors);
app.post('/api/coord/instructors',                     authenticate, requireCoordinator, createInstructor);
app.put('/api/coord/instructors/:id',                  authenticate, requireCoordinator, updateInstructor);
app.post('/api/coord/instructors/:id/units',            authenticate, requireCoordinator, assignInstructorUnits);
app.get('/api/coord/fichas',                           authenticate, requireCoordinator, getCoordFichas);
app.post('/api/coord/fichas',                          authenticate, requireCoordinator, createFicha);
app.put('/api/coord/fichas/:id',                       authenticate, requireCoordinator, updateFicha);
app.post('/api/coord/fichas/:id/request-deletion',     authenticate, requireCoordinator, requestFichaDeletion);
app.get('/api/coord/deletion-requests',                authenticate, requireCoordinator, getPendingDeletionRequests);
app.post('/api/coord/deletion-requests/:requestId/approve', authenticate, requireCoordinator, approveFichaDeletion);
app.post('/api/coord/deletion-requests/:requestId/reject',  authenticate, requireCoordinator, rejectFichaDeletion);
app.get('/api/coord/evidences',                        authenticate, requireCoordinator, getCoordEvidences);
app.get('/api/coord/evidences/:sessionId/download',    authenticate, requireCoordinator, downloadSessionEvidence);
app.get('/api/coord/audit-logs',                        authenticate, requireCoordinator, getAuditLogs);

// ── Error Handling ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('http.unhandled_error', { path: req.path, method: req.method, error: err?.message });
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Ocurrió un error inesperado en el servidor.' } });
});

// ── Start ─────────────────────────────────────────────────────────────────────
try {
  await initDb();
  console.log('Database initialized successfully');
} catch (err) {
  console.error('Database initialization warning (non-fatal for server startup):', err);
}

const isRunningTests = process.env.NODE_ENV === 'test' || process.argv.some(a => a.includes('test'));
if (process.env.VERCEL !== '1' && !isRunningTests) {
  app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
  });
}

export default app;
