/**
 * Auditoría de controles de acceso, autenticación y reglas de dominio.
 *
 * Esta suite es deliberadamente independiente de run-all.js: una aserción que
 * falla es evidencia reproducible de un control ausente, no una regresión que
 * deba ocultarse detrás de la suite heredada. Ejecución: node tests/audit-verification.test.js
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import { get, query, run } from '../src/db.js';
import { isWithinBusinessDays } from '../src/controllers.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev-only';

const tokenFor = (payload, expiresIn = '1h') => jwt.sign(payload, JWT_SECRET, { expiresIn });
const auth = (payload) => ({
  Authorization: `Bearer ${tokenFor(payload)}`,
  'Content-Type': 'application/json'
});

async function response(request) {
  const res = await request;
  let body = {};
  try { body = await res.json(); } catch { /* binary response */ }
  return { status: res.status, body };
}

export async function runAuditVerificationTests() {
  console.log('\n[TEST SUITE] Auditoría de seguridad, dominio y cola offline');
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const ids = {
    unit: `audit_unit_${stamp}`,
    unassignedUnit: `audit_unassigned_${stamp}`,
    learner: `audit_learner_${stamp}`,
    peer: `audit_peer_${stamp}`,
    instructor: `audit_instructor_${stamp}`,
    session: `audit_session_${stamp}`,
    excuse: `audit_excuse_${stamp}`
  };
  const results = [];
  const check = async (name, action) => {
    try {
      await action();
      results.push({ name, state: 'PASS' });
      console.log(`  ✓ ${name}`);
    } catch (error) {
      results.push({ name, state: 'FAIL', evidence: error.message });
      console.log(`  ✗ ${name}: ${error.message}`);
    }
  };

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const learnerPayload = { id: ids.learner, institutionId: 'inst_sena_1', documento: `90${stamp.slice(-8)}`, roles: ['APRENDIZ'] };
  const peerDocument = `91${stamp.slice(-8)}`;
  const instructorPayload = { id: ids.instructor, institutionId: 'inst_sena_1', documento: `92${stamp.slice(-8)}`, roles: ['INSTRUCTOR'] };

  try {
    const now = new Date();
    const expiry = new Date(now.getTime() + 15 * 60_000).toISOString();
    await run('INSERT INTO academic_units (id, institution_id, code, name, type, jornada, status, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)', [ids.unit, 'inst_sena_1', `AUD-${stamp}`, 'Ficha de auditoría', 'ficha', 'DIURNA', 'ACTIVE']);
    await run('INSERT INTO academic_units (id, institution_id, code, name, type, jornada, status, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)', [ids.unassignedUnit, 'inst_sena_1', `UNA-${stamp}`, 'Ficha sin asignación', 'ficha', 'DIURNA', 'ACTIVE']);
    await run('INSERT INTO people (id, institution_id, documento, email, nombre, active, password, roles, terms_accepted) VALUES (?, ?, ?, ?, ?, 1, ?, ?, 1)', [ids.learner, 'inst_sena_1', learnerPayload.documento, `learner_${stamp}@audit.local`, 'Aprendiz Auditoría', 'AuditPass123!', JSON.stringify(['APRENDIZ'])]);
    await run('INSERT INTO people (id, institution_id, documento, email, nombre, active, password, roles, terms_accepted) VALUES (?, ?, ?, ?, ?, 1, ?, ?, 1)', [ids.peer, 'inst_sena_1', peerDocument, `peer_${stamp}@audit.local`, 'Par Auditoría', 'PeerPass123!', JSON.stringify(['APRENDIZ'])]);
    await run('INSERT INTO people (id, institution_id, documento, email, nombre, active, password, roles, terms_accepted) VALUES (?, ?, ?, ?, ?, 1, ?, ?, 1)', [ids.instructor, 'inst_sena_1', instructorPayload.documento, `instructor_${stamp}@audit.local`, 'Instructor Auditoría', 'InstructorPass123!', JSON.stringify(['INSTRUCTOR'])]);
    for (const personId of [ids.learner, ids.peer]) {
      await run('INSERT INTO enrollments (id, institution_id, unit_id, person_id, active) VALUES (?, ?, ?, ?, 1)', [`audit_enrollment_${personId}`, 'inst_sena_1', ids.unit, personId]);
    }
    await run('INSERT INTO instructor_assignments (id, institution_id, unit_id, instructor_id, created_at) VALUES (?, ?, ?, ?, ?)', [`audit_assignment_${stamp}`, 'inst_sena_1', ids.unit, ids.instructor, now.toISOString()]);
    await run(`INSERT INTO attendance_sessions (id, institution_id, unit_id, status, qr_token, qr_expires_at, qr_ttl_minutes, activated_at, room_created_at, room_expires_at, is_reopened, creator_ip, ip_check_enabled, validation_mode, created_by, evidence_file_name, evidence_file_data, evidence_mime_type)
      VALUES (?, ?, ?, 'active', 'AUDITQR12345', ?, 15, ?, ?, ?, 0, '127.0.0.1', 0, 'QR_ONLY', ?, 'corrupt.pdf', '%%%not-base64%%%', 'application/pdf')`, [ids.session, 'inst_sena_1', ids.unit, expiry, now.toISOString(), now.toISOString(), expiry, ids.instructor]);
    await run('INSERT INTO excuses (id, session_id, person_id, text, status, created_at) VALUES (?, ?, ?, ?, ?, ?)', [ids.excuse, ids.session, ids.peer, 'Excusa de auditoría', 'pending', now.toISOString()]);

    await check('RBAC: un aprendiz no puede crear una sala', async () => {
      const result = await response(fetch(`${baseUrl}/room/create`, {
        method: 'POST', headers: auth(learnerPayload),
        body: JSON.stringify({ institutionId: 'inst_sena_1', unitId: ids.unit, validationMode: 'QR_ONLY', ipCheckEnabled: false })
      }));
      assert.equal(result.status, 403, `se obtuvo HTTP ${result.status}`);
    });

    await check('RBAC: un aprendiz no puede cerrar una sala ajena', async () => {
      const result = await response(fetch(`${baseUrl}/api/sessions/${ids.session}/close`, { method: 'POST', headers: auth(learnerPayload) }));
      assert.equal(result.status, 403, `se obtuvo HTTP ${result.status}`);
    });

    await check('RBAC: un aprendiz no puede hacer override manual', async () => {
      const result = await response(fetch(`${baseUrl}/attendance/manual-override`, {
        method: 'POST', headers: auth(learnerPayload),
        body: JSON.stringify({ sessionId: ids.session, documento: peerDocument, horas_validadas_asistencia: 6 })
      }));
      assert.equal(result.status, 403, `se obtuvo HTTP ${result.status}`);
    });

    await check('RBAC: un aprendiz no puede resolver una excusa ajena', async () => {
      const result = await response(fetch(`${baseUrl}/api/instructor/excuses/${ids.excuse}/resolve`, {
        method: 'POST', headers: auth(learnerPayload), body: JSON.stringify({ status: 'approved' })
      }));
      assert.equal(result.status, 403, `se obtuvo HTTP ${result.status}`);
    });

    await check('RBAC: instructor no asignado no puede abrir una ficha ajena', async () => {
      const result = await response(fetch(`${baseUrl}/room/create`, {
        method: 'POST', headers: auth(instructorPayload),
        body: JSON.stringify({ institutionId: 'inst_sena_1', unitId: ids.unassignedUnit, validationMode: 'QR_ONLY', ipCheckEnabled: false })
      }));
      assert.equal(result.status, 403, `se obtuvo HTTP ${result.status}`);
    });

    await check('RBAC: instructor no puede usar endpoints de coordinación', async () => {
      const result = await response(fetch(`${baseUrl}/api/coord/audit-logs`, { headers: auth(instructorPayload) }));
      assert.equal(result.status, 403, `se obtuvo HTTP ${result.status}`);
    });

    await check('RBAC: aprendiz no puede descargar evidencia ajena', async () => {
      const result = await response(fetch(`${baseUrl}/api/coord/evidences/${ids.session}/download`, { headers: auth(learnerPayload) }));
      assert.equal(result.status, 403, `se obtuvo HTTP ${result.status}`);
    });

    await check('Auth: token inválido y expirado son rechazados', async () => {
      const malformed = await response(fetch(`${baseUrl}/api/sessions`, { headers: { Authorization: 'Bearer not-a-jwt' } }));
      const expired = await response(fetch(`${baseUrl}/api/sessions`, { headers: { Authorization: `Bearer ${tokenFor(learnerPayload, '-1s')}` } }));
      assert.equal(malformed.status, 401, `token inválido devolvió ${malformed.status}`);
      assert.equal(expired.status, 401, `token expirado devolvió ${expired.status}`);
    });

    await check('Auth: reset rechaza contraseña menor de seis caracteres', async () => {
      const result = await response(fetch(`${baseUrl}/public/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'irrelevante', newPassword: '12345' })
      }));
      assert.equal(result.status, 400, `se obtuvo HTTP ${result.status}`);
    });

    let resetToken;
    await check('Auth: forgot-password nunca devuelve el token secreto al navegador', async () => {
      const testUser = await get('SELECT id FROM people WHERE email = ?', [`learner_${stamp}@audit.local`]);
      assert.equal(testUser?.id, ids.learner, 'el usuario de recuperación de prueba no fue creado');
      const result = await response(fetch(`${baseUrl}/public/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: `learner_${stamp}@audit.local` })
      }));
      resetToken = result.body.data?.resetToken;
      assert.equal(result.status, 200, `se obtuvo HTTP ${result.status}`);
      assert.equal(resetToken, undefined, 'la respuesta expone resetToken');
    });

    await check('Auth: un token de reset no puede reutilizarse', async () => {
      assert.ok(resetToken, 'no hay token de prueba para comprobar uso único');
      const first = await response(fetch(`${baseUrl}/public/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: resetToken, newPassword: 'ChangedAudit123!' })
      }));
      const second = await response(fetch(`${baseUrl}/public/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: resetToken, newPassword: 'AnotherAudit123!' })
      }));
      assert.equal(first.status, 200, `primer uso devolvió ${first.status}`);
      assert.equal(second.status, 400, `reuso devolvió ${second.status}`);
    });

    await check('Auth: payload de login tipo inyección no provoca 500 ni acceso', async () => {
      const result = await response(fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documento: "' OR 1=1 --", password: 'x' })
      }));
      assert.ok([400, 401].includes(result.status), `se obtuvo HTTP ${result.status}`);
    });

    await check('BR-07: una excusa un segundo después del tercer día hábil es rechazada', async () => {
      const allowed = await isWithinBusinessDays('2035-01-05T10:00:00-05:00', new Date('2035-01-11T00:00:00-05:00'));
      assert.equal(allowed, false, 'el límite no es estricto después de 23:59:59');
    });

    await check('BR-04/BR-07: no permite duplicar una excusa de la misma sesión', async () => {
      const body = JSON.stringify({ sessionId: ids.session, text: 'Primera excusa válida' });
      const first = await response(fetch(`${baseUrl}/api/student/excuses`, { method: 'POST', headers: auth(learnerPayload), body }));
      const second = await response(fetch(`${baseUrl}/api/student/excuses`, { method: 'POST', headers: auth(learnerPayload), body }));
      assert.equal(first.status, 201, `primer envío devolvió ${first.status}`);
      assert.equal(second.status, 400, `duplicado devolvió ${second.status}`);
    });

    await check('BR-09: aprobar una excusa restaura exactamente seis horas', async () => {
      const record = await get('SELECT * FROM attendance_records WHERE session_id = ? AND person_id = ?', [ids.session, ids.peer]);
      assert.equal(record?.horas_validadas_asistencia, 6, `horas restauradas: ${record?.horas_validadas_asistencia}`);
      assert.equal(record?.horas_inasistencia_acumulada, 0, `horas de falta: ${record?.horas_inasistencia_acumulada}`);
      assert.equal(record?.tipo_registro, 'EXCUSA_APROBADA', `tipo: ${record?.tipo_registro}`);
    });

    await check('BR-05: validation_mode inválido es rechazado', async () => {
      const result = await response(fetch(`${baseUrl}/room/create`, {
        method: 'POST', headers: auth(instructorPayload),
        body: JSON.stringify({ institutionId: 'inst_sena_1', unitId: ids.unit, validationMode: 'NONE', ipCheckEnabled: true, qrEnabled: true })
      }));
      assert.equal(result.status, 400, `se obtuvo HTTP ${result.status}`);
    });

    await check('Evidencias: Base64 corrupto es rechazado al descargar', async () => {
      const coordinator = { id: 'per_coord_1', institutionId: 'inst_sena_1', roles: ['COORDINADOR'] };
      const result = await response(fetch(`${baseUrl}/api/coord/evidences/${ids.session}/download`, { headers: auth(coordinator) }));
      assert.equal(result.status, 400, `se obtuvo HTTP ${result.status}`);
    });

    const installOfflineBrowserMocks = () => {
      const saved = {
        window: Object.getOwnPropertyDescriptor(globalThis, 'window'),
        navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
        localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
        fetch: Object.getOwnPropertyDescriptor(globalThis, 'fetch'),
        setInterval: Object.getOwnPropertyDescriptor(globalThis, 'setInterval')
      };
      const store = new Map();
      Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: { location: { origin: baseUrl }, addEventListener() {} } });
      Object.defineProperty(globalThis, 'navigator', { configurable: true, writable: true, value: { onLine: true } });
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) } });
      Object.defineProperty(globalThis, 'setInterval', { configurable: true, writable: true, value: () => 0 });
      return {
        restore() {
          for (const [key, descriptor] of Object.entries(saved)) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else delete globalThis[key];
          }
        }
      };
    };

    await check('Offline queue: deduplica el mismo check-in antes de sincronizar', async () => {
      const browser = installOfflineBrowserMocks();
      try {
        const module = await import(`../../frontend/offline-queue.js?audit=${stamp}`);
        const queue = new module.OfflineAttendanceQueue({ storageKey: `audit_queue_${stamp}`, apiBaseUrl: baseUrl });
        queue.enqueue({ token: 'ABC123', documento: learnerPayload.documento });
        queue.enqueue({ token: 'ABC123', documento: learnerPayload.documento });
        assert.equal(queue.pendingCount, 1, `la cola conservó ${queue.pendingCount} duplicados`);
      } finally {
        browser.restore();
      }
    });

    await check('Offline queue: reintenta y vacía un check-in al recuperar conexión', async () => {
      const browser = installOfflineBrowserMocks();
      try {
        const module = await import(`../../frontend/offline-queue.js?audit-retry=${stamp}`);
        const queue = new module.OfflineAttendanceQueue({ storageKey: `audit_retry_${stamp}`, apiBaseUrl: baseUrl });
        queue.enqueue({ token: 'ABC123', documento: learnerPayload.documento });
        globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({ error: { message: 'retry' } }) });
        await queue.syncAll();
        assert.equal(queue.getQueue()[0].retries, 1, 'no incrementó el contador de reintentos');
        globalThis.fetch = async () => ({ ok: true, status: 201, json: async () => ({}) });
        await queue.syncAll();
        assert.equal(queue.pendingCount, 0, 'no vació la cola tras sincronizar');
      } finally {
        browser.restore();
      }
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await run('DELETE FROM attendance_records WHERE session_id IN (SELECT id FROM attendance_sessions WHERE created_by IN (?, ?))', [ids.learner, ids.instructor]);
    await run('DELETE FROM attendance_records WHERE session_id LIKE ?', [`audit_%${stamp}%`]);
    await run('DELETE FROM excuses WHERE id LIKE ?', [`audit_%${stamp}%`]);
    await run('DELETE FROM attendance_sessions WHERE created_by IN (?, ?)', [ids.learner, ids.instructor]);
    await run('DELETE FROM attendance_sessions WHERE id LIKE ?', [`audit_%${stamp}%`]);
    await run('DELETE FROM instructor_assignments WHERE id LIKE ?', [`audit_%${stamp}%`]);
    await run('DELETE FROM enrollments WHERE id LIKE ?', [`audit_%${stamp}%`]);
    await run('DELETE FROM password_resets WHERE person_id IN (?, ?, ?)', [ids.learner, ids.peer, ids.instructor]);
    await run('DELETE FROM audit_logs WHERE actor_id IN (?, ?, ?)', [ids.learner, ids.peer, ids.instructor]);
    await run('DELETE FROM people WHERE id IN (?, ?, ?)', [ids.learner, ids.peer, ids.instructor]);
    await run('DELETE FROM academic_units WHERE id IN (?, ?)', [ids.unit, ids.unassignedUnit]);
  }

  const failures = results.filter((result) => result.state === 'FAIL');
  console.log(`\n[AUDIT RESULT] ${results.length - failures.length}/${results.length} controles verificados; ${failures.length} hallazgos reproducibles.`);
  if (failures.length) {
    throw new Error(`La auditoría detectó ${failures.length} control(es) ausente(s): ${failures.map((failure) => failure.name).join('; ')}`);
  }
  return results;
}

if (process.argv[1]?.endsWith('audit-verification.test.js')) {
  runAuditVerificationTests().catch((error) => {
    console.error('\nAUDIT VERIFICATION FAILED:', error.message);
    process.exitCode = 1;
  });
}
