/**
 * Capa 7 (Infraestructura) - Rate Limiter en memoria y cabeceras de seguridad HTTP.
 */

export function createRateLimiter({ windowMs = 60_000, max = 30, keyPrefix = 'global' } = {}) {
  const hits = new Map();

  return (req, res, next) => {
    const effectiveMax = Number(process.env.RATE_LIMIT_MAX || max);
    if (effectiveMax <= 0) return next();

    const now = Date.now();
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || 'unknown';
    const identifier = (req.body?.identifier || req.body?.documento || req.body?.email || '').toString().trim().toLowerCase();
    const key = `${keyPrefix}:${ip}:${identifier}`;

    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > effectiveMax) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Demasiados intentos en poco tiempo. Por favor intenta nuevamente en unos segundos.'
        }
      });
    }

    // Limpieza ocasional para evitar crecimiento ilimitado de memoria
    if (hits.size > 5000) {
      for (const [k, v] of hits.entries()) {
        if (v.resetAt <= now) hits.delete(k);
      }
    }

    return next();
  };
}

export function securityHeadersMiddleware(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );
  next();
}
