/**
 * SENA ATTENDANCE SYSTEM - Automated Test Runner
 * Ejecuta todas las suites de pruebas unitarias, arquitectura, experiencia, seguridad e integración.
 */
import { runHealthTests } from './health.test.js';
import { runTokenRotationTests } from './token-rotation.test.js';
import { runPunctualityTests } from './punctuality-hours.test.js';
import { runGovernanceInvariantTests } from './invariants-governance.test.js';
import { runDiscoveryFlowTests } from './e2e-discovery.test.js';
import { runInstructorAssignmentTests } from './instructor-assignments.test.js';
import { runDomainUnitTests } from './domain-rules.test.js';
import { runArchitectureLayerTests } from './architecture-layers.test.js';
import { runFrontendExperienceTests } from './frontend-experience.test.js';
import { runAuditVerificationTests } from './audit-verification.test.js';

async function main() {
  console.log('====================================================');
  console.log('  SENA ATTENDANCE SYSTEM - SUITE COMPLETA QA (N=7)');
  console.log('====================================================');

  const startTime = Date.now();

  try {
    await runHealthTests();
    await runTokenRotationTests();
    await runPunctualityTests();
    await runDomainUnitTests();
    await runArchitectureLayerTests();
    await runFrontendExperienceTests();
    await runGovernanceInvariantTests();
    await runDiscoveryFlowTests();
    await runInstructorAssignmentTests();
    await runAuditVerificationTests();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n====================================================');
    console.log('  ✓ TODAS LAS SUITES PASARON EXITOSAMENTE (' + duration + 's)');
    console.log('====================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FALLO EN LA EJECUCIÓN DE PRUEBAS:');
    console.error(error);
    process.exit(1);
  }
}

main();
