/**
 * Pruebas unitarias de Capa 1 (Experiencia): Login unificado, sanitización XSS,
 * accesibilidad/branding SENA en HTML y cola offline con deduplicación/conflictos.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml, isSafeDataOrHttpUrl, resolveRoleDestination } from '../../frontend/src/shared/sanitize.js';
import { submitUnifiedLogin } from '../../frontend/src/experience/login.js';
import { OfflineAttendanceQueue, buildIdempotencyKey } from '../../frontend/offline-queue.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, '../../frontend');

export async function runFrontendExperienceTests() {
  console.log('\n[TEST SUITE] Experiencia, Login Unificado, XSS y Cola Offline');

  // 1. Sanitización XSS
  assert.equal(
    escapeHtml('<script>alert("xss")</script>'),
    '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
  );
  assert.equal(isSafeDataOrHttpUrl('javascript:alert(1)'), false);
  assert.equal(isSafeDataOrHttpUrl('data:text/html;base64,PHNjcmlwdD4='), false);
  assert.equal(isSafeDataOrHttpUrl('data:application/pdf;base64,JVBERi0xLjQ='), true);
  console.log('  ✓ Sanitización XSS y validación de URLs verificada');

  // 2. Enrutamiento de roles y Login unificado
  assert.equal(resolveRoleDestination(['COORDINADOR']), 'COORDINADOR');
  assert.equal(resolveRoleDestination(['INSTRUCTOR']), 'INSTRUCTOR');
  assert.equal(resolveRoleDestination(['APRENDIZ']), 'APRENDIZ');
  assert.equal(resolveRoleDestination([]), null);

  const mockFetchOk = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      data: { token: 'jwt_test', person: { id: 'p1', roles: ['INSTRUCTOR'] } }
    })
  });
  const loginOk = await submitUnifiedLogin({ apiUrl: 'http://localhost:4000', identifier: '100', password: 'secret', fetchImpl: mockFetchOk });
  assert.equal(loginOk.ok, true);
  assert.equal(loginOk.destination, 'INSTRUCTOR');

  const mockFetch401 = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: { message: 'Credenciales inválidas.' } })
  });
  const loginFail = await submitUnifiedLogin({ apiUrl: 'http://localhost:4000', identifier: '100', password: 'wrong', fetchImpl: mockFetch401 });
  assert.equal(loginFail.ok, false);
  assert.equal(loginFail.status, 401);
  console.log('  ✓ Login unificado para los 3 roles y manejo de 401 validado');

  // 3. Verificación de HTML institucional SENA (logo oficial, cero credenciales demo, accesibilidad)
  const indexHtml = fs.readFileSync(path.join(frontendDir, 'index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(frontendDir, 'app.js'), 'utf8');
  assert.ok(indexHtml.includes('/assets/brand/sena-logo-official.png'), 'Debe incluir el logotipo oficial SENA');
  assert.ok(indexHtml.includes('alt="SENA"'), 'El logotipo debe tener alt="SENA"');
  assert.ok(fs.existsSync(path.join(frontendDir, 'assets/brand/sena-logo-official.png')), 'Archivo oficial del logotipo SENA debe existir');
  assert.equal(indexHtml.includes('1079606375'), false, 'HTML no debe contener credenciales de demostración');
  assert.equal(indexHtml.includes('Instructor dev'), false, 'HTML no debe mostrar tarjeta de credenciales demo');
  assert.ok(indexHtml.includes('autocomplete="username"'), 'Debe incluir autocomplete="username"');
  assert.ok(indexHtml.includes('autocomplete="current-password"'), 'Debe incluir autocomplete="current-password"');
  assert.ok(indexHtml.includes('aria-live="polite"'), 'Debe incluir región aria-live="polite"');
  assert.equal(appJs.includes('result.data?.resetToken'), false, 'app.js no debe leer ni rellenar resetToken desde HTTP');
  console.log('  ✓ HTML SENA verificado: logo oficial, cero credenciales demo, accesibilidad y sin resetToken');

  // 4. Cola Offline: deduplicación, idempotencia 409 y visibilidad de conflicto 400
  const saved = {
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
    fetch: Object.getOwnPropertyDescriptor(globalThis, 'fetch')
  };
  const store = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k)
    }
  });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, writable: true, value: { onLine: true } });

  try {
    const q = new OfflineAttendanceQueue({ storageKey: 'unit_test_offline_q', apiBaseUrl: 'http://127.0.0.1:4000' });
    assert.equal(buildIdempotencyKey({ token: 'abc123', documento: '12345' }), 'ABC123::12345');
    q.enqueue({ token: 'abc123', documento: '12345' });
    q.enqueue({ token: 'ABC123', documento: '12345' });
    assert.equal(q.pendingCount, 1, 'Debe deduplicar marcaciones idénticas');

    // 409 se trata como idempotente (sincronizado y limpiado)
    globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({}) });
    const res409 = await q.syncAll();
    assert.equal(res409.synced, 1);
    assert.equal(q.pendingCount, 0);

    // 400 se marca como conflicto visible
    let conflictItem = null;
    q.onConflict((item) => { conflictItem = item; });
    q.enqueue({ token: 'EXP999', documento: '12345' });
    globalThis.fetch = async () => ({ ok: false, status: 400, json: async () => ({ error: { message: 'Sala expirada' } }) });
    const res400 = await q.syncAll();
    assert.equal(res400.conflicts, 1);
    assert.equal(q.conflicts.length, 1);
    assert.equal(conflictItem?.lastError, 'Sala expirada');
    q.dismissConflict(conflictItem.id);
    assert.equal(q.conflicts.length, 0);
    console.log('  ✓ Cola offline: deduplicación, idempotencia 409 y resolución visible de conflictos validados');
  } finally {
    for (const [key, desc] of Object.entries(saved)) {
      if (desc) Object.defineProperty(globalThis, key, desc);
      else delete globalThis[key];
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith('frontend-experience.test.js')) {
  runFrontendExperienceTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
