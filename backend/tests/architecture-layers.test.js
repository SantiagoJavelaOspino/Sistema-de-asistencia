/**
 * Pruebas automatizadas de fronteras arquitectónicas (Arquitectura de 7 Capas)
 * y portabilidad SQLite -> PostgreSQL.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertPlaceholdersToPg } from '../src/shared/infrastructure/sqlDialect.js';
import { assertFourEyesApproval } from '../src/modules/academic/domain/fourEyes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '../src');

function walkJsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkJsFiles(full));
    else if (entry.name.endsWith('.js')) results.push(full);
  }
  return results;
}

export async function runArchitectureLayerTests() {
  console.log('\n[TEST SUITE] Fronteras de 7 Capas y Portabilidad SQL');

  const modulesDir = path.join(srcRoot, 'modules');
  const moduleNames = fs.readdirSync(modulesDir).filter((m) => fs.statSync(path.join(modulesDir, m)).isDirectory());
  assert.ok(moduleNames.includes('identity') && moduleNames.includes('attendance') && moduleNames.includes('academic') && moduleNames.includes('excuses'),
    'Deben existir los 4 módulos de dominio: identity, attendance, academic, excuses');

  // 1. Capa 4 (Dominio) no importa infraestructura, Express, SQL, process.env, Buffer ni fetch
  const forbiddenDomainPatterns = [
    /from\s+['"](express|pg|sqlite3|jsonwebtoken|bcryptjs|crypto|fs|path|node:fs|node:crypto)['"]/,
    /from\s+['"][^'"]*db\.js['"]/,
    /\bprocess\.env\b/,
    /\bBuffer\b/,
    /\bfetch\s*\(/
  ];

  let domainFilesChecked = 0;
  for (const mod of moduleNames) {
    const domainFiles = walkJsFiles(path.join(modulesDir, mod, 'domain'));
    for (const file of domainFiles) {
      domainFilesChecked++;
      const rawContent = fs.readFileSync(file, 'utf8');
      const content = rawContent.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      for (const pattern of forbiddenDomainPatterns) {
        assert.equal(pattern.test(content), false, `Violación de Capa 4 (Dominio) en ${path.relative(srcRoot, file)}: coincide con ${pattern}`);
      }
    }
  }
  assert.ok(domainFilesChecked >= 5, `Se esperaban >= 5 archivos de dominio puro, encontrados: ${domainFilesChecked}`);
  console.log(`  ✓ Capa 4 (Dominio): ${domainFilesChecked} archivos verificados con cero dependencias externas`);

  // 2. Capa 2 (Presentation) y Capa 3 (Application) no contienen sentencias SQL directas
  const sqlPattern = /\b(SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/i;
  let upperLayerFilesChecked = 0;
  for (const mod of moduleNames) {
    for (const layer of ['presentation', 'application']) {
      const files = walkJsFiles(path.join(modulesDir, mod, layer));
      for (const file of files) {
        upperLayerFilesChecked++;
        const content = fs.readFileSync(file, 'utf8');
        assert.equal(sqlPattern.test(content), false, `SQL detectado en ${layer} (${path.relative(srcRoot, file)})`);
      }
    }
  }
  assert.ok(upperLayerFilesChecked >= 6, `Se esperaban >= 6 archivos en presentation/application, encontrados: ${upperLayerFilesChecked}`);
  console.log(`  ✓ Capas 2 y 3 (Presentation/Application): ${upperLayerFilesChecked} archivos verificados sin SQL directo`);

  // 3. Portabilidad SQL: convertPlaceholdersToPg respeta ? dentro de literales
  const sqlWithLiteral = "SELECT * FROM excuses WHERE text != '¿Por qué?' AND person_id = ? AND status = ? AND note != 'it''s ? ok'";
  const pgSql = convertPlaceholdersToPg(sqlWithLiteral);
  assert.equal(
    pgSql,
    "SELECT * FROM excuses WHERE text != '¿Por qué?' AND person_id = $1 AND status = $2 AND note != 'it''s ? ok'"
  );
  console.log('  ✓ Portabilidad SQLite -> PostgreSQL: literales con ? preservados correctamente');

  // 4. Regla pura BR-08 (Cuatro Ojos)
  assert.throws(() => assertFourEyesApproval({ requestedBy: 'coord_1', approvedBy: 'coord_1' }), (e) => e.code === 'FOUR_EYES_VIOLATION');
  assert.equal(assertFourEyesApproval({ requestedBy: 'coord_1', approvedBy: 'coord_2' }), true);
  console.log('  ✓ BR-08 (Dominio académico): invariante de 4 ojos validada sin BD');
}

if (process.argv[1] && process.argv[1].endsWith('architecture-layers.test.js')) {
  runArchitectureLayerTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
