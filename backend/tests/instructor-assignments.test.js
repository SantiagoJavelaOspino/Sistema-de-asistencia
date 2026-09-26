/**
 * SENA ATTENDANCE SYSTEM - Instructor Assignments, Excuses Isolation & Evidence Delivery Test Suite
 */
import assert from 'assert';
import crypto from 'crypto';
import { run, get, query } from '../src/db.js';
import {
  createRoom,
  getSessionReport,
  getInstructorExcuses,
  getCoordInstructors,
  getInstructorUnits,
  assignInstructorUnits,
  submitSessionEvidence,
  downloadSessionEvidence,
  getCoordEvidences
} from '../src/controllers.js';

export async function runInstructorAssignmentTests() {
  console.log('\n[TEST SUITE] Asignación Instructor-Ficha, Aislamiento de Excusas y Gestión de Evidencias');

  const institutionId = 'inst_sena_ctpi';
  const testInstructorId = 'test_inst_sec_1';
  const assignedUnitId = 'unit_ficha_test_assigned';
  const unassignedUnitId = 'unit_ficha_test_unassigned';
  const studentAssigned = 'test_student_ass_1';
  const studentUnassigned = 'test_student_unass_2';

  // 0. Setup test entities in DB
  await run(`DELETE FROM excuses WHERE id IN ('exc_test_ass', 'exc_test_unass')`);
  await run(`DELETE FROM attendance_records WHERE unit_id IN (?, ?)`, [assignedUnitId, unassignedUnitId]);
  await run(`DELETE FROM attendance_sessions WHERE unit_id IN (?, ?)`, [assignedUnitId, unassignedUnitId]);
  await run(`DELETE FROM enrollments WHERE unit_id IN (?, ?)`, [assignedUnitId, unassignedUnitId]);
  await run(`DELETE FROM instructor_assignments WHERE institution_id = ?`, [institutionId]);
  await run(`DELETE FROM people WHERE id IN (?, ?, ?)`, [testInstructorId, studentAssigned, studentUnassigned]);
  await run(`DELETE FROM academic_units WHERE id IN (?, ?)`, [assignedUnitId, unassignedUnitId]);

  await run(`
    INSERT INTO people (id, institution_id, documento, nombre, active, password, roles)
    VALUES (?, ?, 'DOC_TEST_SEC_999', 'Instructor Prueba Seguridad', 1, 'dummy_hash', '["INSTRUCTOR"]'),
           (?, ?, 'DOC_ASS_111', 'Aprendiz Ficha Asignada', 1, 'dummy_hash', '["STUDENT"]'),
           (?, ?, 'DOC_UNASS_222', 'Aprendiz Ficha No Asignada', 1, 'dummy_hash', '["STUDENT"]')
  `, [testInstructorId, institutionId, studentAssigned, institutionId, studentUnassigned, institutionId]);

  await run(`
    INSERT INTO academic_units (id, institution_id, code, name, active)
    VALUES (?, ?, 'FICHA-TEST-ASS', 'Ficha Asignada Test', 1),
           (?, ?, 'FICHA-TEST-UNASS', 'Ficha No Asignada Test', 1)
  `, [assignedUnitId, institutionId, unassignedUnitId, institutionId]);

  await run(`
    INSERT INTO enrollments (id, institution_id, unit_id, person_id, active)
    VALUES ('enr_test_1', ?, ?, ?, 1),
           ('enr_test_2', ?, ?, ?, 1)
  `, [institutionId, assignedUnitId, studentAssigned, institutionId, unassignedUnitId, studentUnassigned]);

  // Helper mocks
  function mockReq(user, body = {}, params = {}, queryParams = {}) {
    return {
      user,
      body,
      params,
      query: queryParams,
      headers: { host: 'localhost:3000' },
      socket: { remoteAddress: '127.0.0.1' },
      ip: '127.0.0.1'
    };
  }

  function mockRes() {
    const res = {
      statusCode: 200,
      headers: {},
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
      setHeader(k, v) {
        this.headers[k] = v;
      },
      send(data) {
        this.body = data;
        return this;
      }
    };
    return res;
  }

  const instructorUser = {
    id: testInstructorId,
    institutionId,
    roles: ['INSTRUCTOR']
  };

  const coordinatorUser = {
    id: 'per_coord_1',
    institutionId,
    roles: ['COORDINADOR', 'COORDINATOR']
  };

  // 1. Verify access denied when instructor is NOT assigned to ficha
  console.log('  1. Verificando que instructor no asignado NO puede abrir clase (HTTP 403)...');
  const reqCreateUnassigned = mockReq(instructorUser, {
    institutionId,
    unitId: unassignedUnitId,
    qrTtlMinutes: 15
  });
  const resCreateUnassigned = mockRes();
  await createRoom(reqCreateUnassigned, resCreateUnassigned);
  assert.strictEqual(resCreateUnassigned.statusCode, 403, 'Debe retornar 403 cuando no está asignado');
  assert.strictEqual(resCreateUnassigned.body?.error?.code, 'INSTRUCTOR_NOT_ASSIGNED', 'Error code debe ser INSTRUCTOR_NOT_ASSIGNED');
  console.log('    ✓ Bloqueo 403 INSTRUCTOR_NOT_ASSIGNED verificado exitosamente');

  // 2. Coordinator assigns ficha to instructor
  console.log('  2. Coordinador asigna ficha al instructor...');
  const reqAssign = mockReq(coordinatorUser, { unitIds: [assignedUnitId] }, { id: testInstructorId });
  const resAssign = mockRes();
  await assignInstructorUnits(reqAssign, resAssign);
  assert.strictEqual(resAssign.statusCode, 200);
  assert.strictEqual(resAssign.body?.ok, true);

  // Check assignments in DB
  const assignments = await query(`SELECT unit_id FROM instructor_assignments WHERE instructor_id = ?`, [testInstructorId]);
  assert.strictEqual(assignments.length, 1);
  assert.strictEqual(assignments[0].unit_id, assignedUnitId);
  console.log('    ✓ Asignación persistida correctamente');

  // 3. Instructor lists assigned units (GET /api/instructor/my-units)
  console.log('  3. Instructor consulta sus fichas asignadas...');
  const reqMyUnits = mockReq(instructorUser);
  const resMyUnits = mockRes();
  await getInstructorUnits(reqMyUnits, resMyUnits);
  assert.strictEqual(resMyUnits.statusCode, 200);
  assert.strictEqual(resMyUnits.body?.data?.length, 1);
  assert.strictEqual(resMyUnits.body.data[0].id, assignedUnitId);
  console.log('    ✓ Endpoint /api/instructor/my-units retorna únicamente fichas asignadas');

  // 4. Instructor creates room for assigned ficha -> SUCCEEDS
  console.log('  4. Instructor crea sala en ficha asignada...');
  const reqCreateAssigned = mockReq(instructorUser, {
    institutionId,
    unitId: assignedUnitId,
    qrTtlMinutes: 15
  });
  const resCreateAssigned = mockRes();
  await createRoom(reqCreateAssigned, resCreateAssigned);
  assert.strictEqual(resCreateAssigned.statusCode, 201, 'Debe permitir crear sala en ficha asignada');
  assert.strictEqual(resCreateAssigned.body?.ok, true);
  const sessionId = resCreateAssigned.body.data.id;
  assert.ok(sessionId, 'Debe generar session ID');
  console.log('    ✓ Sala creada exitosamente por instructor asignado');

  // 5. Data Isolation: Excuses
  console.log('  5. Verificando aislamiento de excusas entre fichas...');
  // Create an excuse for student in assigned ficha and another for other session
  await run(`
    INSERT INTO excuses (id, session_id, person_id, text, status, created_at)
    VALUES ('exc_test_ass', ?, ?, 'Excusa Ficha Asignada', 'pending', datetime('now')),
           ('exc_test_unass', 'sess_other_unassigned', ?, 'Excusa Ficha Ajena', 'pending', datetime('now'))
  `, [sessionId, studentAssigned, studentUnassigned]);

  // Request excuses as instructor for the assigned unit
  const reqExcuses = mockReq(instructorUser, {}, {}, { unitId: assignedUnitId });
  const resExcuses = mockRes();
  await getInstructorExcuses(reqExcuses, resExcuses);
  assert.strictEqual(resExcuses.statusCode, 200);
  const returnedExcuses = resExcuses.body?.data || [];
  assert.strictEqual(returnedExcuses.length, 1, 'Solo debe retornar la excusa de la ficha asignada');
  assert.strictEqual(returnedExcuses[0].id, 'exc_test_ass', 'No debe haber fuga de excusas de otras fichas');
  console.log('    ✓ Aislamiento de excusas comprobado (cero fugas de otras fichas)');

  // 6. Entry-Only Attendance Evaluation in Report
  console.log('  6. Verificando reporte de asistencia basado estrictamente en hora de entrada y excusas...');
  await run(`
    INSERT INTO attendance_records (id, institution_id, session_id, unit_id, person_id, documento, status, hora_ingreso_real, horas_programadas_sesion, horas_validadas_asistencia, horas_inasistencia_acumulada, tipo_registro, created_at)
    VALUES ('att_test_1', ?, ?, ?, ?, 'DOC_ASS_111', 'VALID', '08:05:00', 6, 6, 0, 'TEMPRANO', datetime('now'))
  `, [institutionId, sessionId, assignedUnitId, studentAssigned]);

  // 6a. Con excusa pendiente
  const reqReport1 = mockReq(instructorUser, {}, { sessionId });
  const resReport1 = mockRes();
  await getSessionReport(reqReport1, resReport1);
  assert.strictEqual(resReport1.statusCode, 200);
  let studentRow = resReport1.body.find(r => r.person_id === studentAssigned || r.documento === 'DOC_ASS_111');
  assert.ok(studentRow, 'Fila del aprendiz debe existir');
  assert.strictEqual(studentRow.estado_llegada, 'Excusa Pendiente', 'Con excusa pendiente el estado debe ser Excusa Pendiente');

  // 6b. Con excusa aprobada
  await run(`UPDATE excuses SET status = 'approved' WHERE id = 'exc_test_ass'`);
  const resReport2 = mockRes();
  await getSessionReport(reqReport1, resReport2);
  studentRow = resReport2.body.find(r => r.person_id === studentAssigned || r.documento === 'DOC_ASS_111');
  assert.strictEqual(studentRow.estado_llegada, 'Excusado', 'Con excusa aprobada el estado debe ser Excusado');

  // 6c. Sin excusa (marcado regular TEMPRANO)
  await run(`DELETE FROM excuses WHERE id = 'exc_test_ass'`);
  const resReport3 = mockRes();
  await getSessionReport(reqReport1, resReport3);
  studentRow = resReport3.body.find(r => r.person_id === studentAssigned || r.documento === 'DOC_ASS_111');
  assert.strictEqual(studentRow.estado_llegada, 'Temprano', 'Sin excusa el estado debe ser Temprano');
  assert.ok(studentRow.hora_ingreso, 'Hora de ingreso debe estar presente');
  console.log('    ✓ Reporte unificado evalúa puntualidad de entrada y estados de excusa correctamente');

  // 7. Evidence Upload & Verification
  console.log('  7. Verificando radicación de evidencia oficial (Base64)...');
  const dummyPdfContent = '%PDF-1.4 test official evidence content';
  const base64Data = `data:application/pdf;base64,${Buffer.from(dummyPdfContent).toString('base64')}`;

  const reqEvidence = mockReq(instructorUser, {
    fileName: 'Evidencia_Oficial_Jornada.pdf',
    fileData: base64Data,
    fileSize: Buffer.byteLength(dummyPdfContent),
    mimeType: 'application/pdf'
  }, { id: sessionId });
  const resEvidence = mockRes();
  await submitSessionEvidence(reqEvidence, resEvidence);
  assert.strictEqual(resEvidence.statusCode, 200);
  assert.strictEqual(resEvidence.body?.ok, true);

  // Check session in DB
  const updatedSession = await get(`SELECT evidence_submitted, evidence_file_name, evidence_mime_type, evidence_hash FROM attendance_sessions WHERE id = ?`, [sessionId]);
  assert.strictEqual(updatedSession.evidence_submitted, 1);
  assert.strictEqual(updatedSession.evidence_file_name, 'Evidencia_Oficial_Jornada.pdf');
  assert.strictEqual(updatedSession.evidence_mime_type, 'application/pdf');
  assert.ok(updatedSession.evidence_hash, 'Hash SHA-256 debe calcularse y almacenarse');
  console.log('    ✓ Evidencia radicada y almacenada con hash íntegro SHA-256');

  // 8. Coordinator History & Download
  console.log('  8. Verificando visibilidad y descarga de evidencia por el Coordinador...');
  const reqCoordEvidences = mockReq(coordinatorUser);
  const resCoordEvidences = mockRes();
  await getCoordEvidences(reqCoordEvidences, resCoordEvidences);
  assert.strictEqual(resCoordEvidences.statusCode, 200);
  const coordSession = (resCoordEvidences.body?.data || []).find(s => s.id === sessionId);
  assert.ok(coordSession, 'Sesión debe aparecer en el histórico de evidencias del coordinador');
  assert.strictEqual(coordSession.instructor_name, 'Instructor Prueba Seguridad', 'Instructor name no debe ser "Sin asignar"');
  assert.strictEqual(coordSession.evidence_submitted, 1);

  // Download evidence file stream
  const reqDownload = mockReq(coordinatorUser, {}, { sessionId });
  const resDownload = mockRes();
  await downloadSessionEvidence(reqDownload, resDownload);
  assert.strictEqual(resDownload.statusCode, 200);
  assert.strictEqual(resDownload.headers['Content-Type'], 'application/pdf');
  assert.ok(resDownload.headers['Content-Disposition'].includes('Evidencia_Oficial_Jornada.pdf'));
  assert.strictEqual(resDownload.body.toString(), dummyPdfContent);
  console.log('    ✓ Descarga binaria de evidencia entregada por el instructor validada');

  // Cleanup test data
  await run(`DELETE FROM excuses WHERE id IN ('exc_test_ass', 'exc_test_unass')`);
  await run(`DELETE FROM attendance_records WHERE session_id = ?`, [sessionId]);
  await run(`DELETE FROM attendance_sessions WHERE id = ?`, [sessionId]);
  await run(`DELETE FROM enrollments WHERE unit_id IN (?, ?)`, [assignedUnitId, unassignedUnitId]);
  await run(`DELETE FROM instructor_assignments WHERE institution_id = ?`, [institutionId]);
  await run(`DELETE FROM academic_units WHERE id IN (?, ?)`, [assignedUnitId, unassignedUnitId]);
  await run(`DELETE FROM people WHERE id IN (?, ?, ?)`, [testInstructorId, studentAssigned, studentUnassigned]);

  console.log('  ✓ Limpieza de datos de prueba completada');
}
