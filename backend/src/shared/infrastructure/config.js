/**
 * Capa 7 (Infraestructura) - Configuración centralizada y guardrails de entorno.
 * En producción falla el arranque si falta JWT_SECRET fuerte (>= 32 bytes).
 */

const DEV_FALLBACK_JWT_SECRET = 'super-secret-key-for-dev-only';

export function resolveJwtSecret(env = process.env) {
  const nodeEnv = (env.NODE_ENV || 'development').toLowerCase();
  const isProd = nodeEnv === 'production';
  const rawSecret = (env.JWT_SECRET || '').trim();

  if (isProd) {
    if (!rawSecret || rawSecret === DEV_FALLBACK_JWT_SECRET || Buffer.byteLength(rawSecret, 'utf8') < 32) {
      throw new Error(
        'FATAL_SECURITY_CONFIG: JWT_SECRET es obligatorio en producción, no puede usar valores por defecto y debe tener al menos 32 bytes.'
      );
    }
    return rawSecret;
  }

  return rawSecret || DEV_FALLBACK_JWT_SECRET;
}

export function resolveAllowedOrigins(env = process.env) {
  const raw = (env.CORS_ORIGINS || env.ALLOWED_ORIGINS || '').trim();
  if (!raw) {
    return [
      'http://localhost:4000',
      'http://127.0.0.1:4000',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
  }
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function getAppConfig(env = process.env) {
  const nodeEnv = (env.NODE_ENV || 'development').toLowerCase();
  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test' || process.argv.some((a) => a.includes('test')),
    port: Number(env.PORT || 4000),
    jwtSecret: resolveJwtSecret(env),
    jwtExpiresIn: env.JWT_EXPIRES_IN || '24h',
    allowedOrigins: resolveAllowedOrigins(env),
    qrSalt: env.QR_HMAC_SALT || 'qr-rotation-salt',
    databaseUrl: env.DATABASE_URL || null
  };
}
