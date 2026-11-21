/**
 * Capa 7 (Bootstrap / Composition Root) - Arranque del monolito modular de 7 capas.
 */
process.env.TZ = 'America/Bogota';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDb } from '../db.js';
import { getAppConfig } from '../shared/infrastructure/config.js';
import { securityHeadersMiddleware } from '../shared/infrastructure/rateLimit.js';
import { logger } from '../shared/infrastructure/logger.js';
import { registerRoutes } from './routes.js';

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

const frontendCandidates = [
  path.resolve(__dirname, '../../../frontend'),
  path.resolve(process.cwd(), 'frontend'),
  path.resolve(__dirname, '../../frontend')
];
const frontendPath = frontendCandidates.find((p) => fs.existsSync(p)) || frontendCandidates[0];
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

// Mount modular routers
registerRoutes(app);

// Centralized error handler (never leaks secrets or stack traces to client)
app.use((err, req, res, next) => {
  logger.error('http.unhandled_error', { path: req.path, method: req.method, error: err?.message });
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Ocurrió un error inesperado en el servidor.' } });
});

try {
  await initDb();
  console.log('Database initialized successfully');
} catch (err) {
  logger.error('db.init_warning', { error: err?.message });
}

if (process.env.VERCEL !== '1' && !config.isTest) {
  app.listen(PORT, () => {
    logger.info('server.started', { port: PORT, env: config.nodeEnv });
    console.log(`Backend server running at http://localhost:${PORT}`);
  });
}

export default app;
