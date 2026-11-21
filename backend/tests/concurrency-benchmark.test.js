/**
 * Benchmark de Concurrencia (NFR-01): >= 50 solicitudes concurrentes y medición de p95 (< 300 ms).
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import { performance } from 'node:perf_hooks';
import app from '../src/server.js';

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(idx, sortedValues.length - 1))];
}

async function runConcurrencyBenchmark() {
  const CONCURRENCY = 60;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const latencies = [];
    const tasks = Array.from({ length: CONCURRENCY }, async (_, idx) => {
      const target = idx % 2 === 0 ? `${baseUrl}/public/fichas` : `${baseUrl}/health`;
      const t0 = performance.now();
      const res = await fetch(target);
      await res.text();
      const elapsed = performance.now() - t0;
      assert.equal(res.status, 200, `Solicitud #${idx} falló con HTTP ${res.status}`);
      latencies.push(elapsed);
    });

    await Promise.all(tasks);
    latencies.sort((a, b) => a - b);

    const p50 = percentile(latencies, 50);
    const p95 = percentile(latencies, 95);
    const p99 = percentile(latencies, 99);
    const max = latencies[latencies.length - 1];

    console.log('\n[BENCHMARK] Concurrencia NFR-01');
    console.log(`  Solicitudes concurrentes: ${CONCURRENCY}`);
    console.log(`  p50: ${p50.toFixed(2)} ms | p95: ${p95.toFixed(2)} ms | p99: ${p99.toFixed(2)} ms | max: ${max.toFixed(2)} ms`);
    assert.ok(p95 < 300, `p95 (${p95.toFixed(2)} ms) superó el umbral NFR-01 de 300 ms`);
    console.log('  ✓ NFR-01 cumplido: p95 < 300 ms bajo >= 50 solicitudes concurrentes\n');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

runConcurrencyBenchmark()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('BENCHMARK FAILED:', err);
    process.exit(1);
  });
