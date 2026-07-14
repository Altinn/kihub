/**
 * Local-dev helper to trigger the scheduled scan endpoint (contracts/discovery-routes.md).
 * In production the recurring invocation is an external scheduler (Azure Container Apps job,
 * default daily) — this script is only for running one scan by hand against a local dev server.
 * Run: pnpm --filter web discovery:scan  (dev server must be running)
 */
export {};

const key = process.env.DISCOVERY_SCAN_KEY;
const url = process.env.DISCOVERY_SCAN_URL ?? 'http://localhost:3000/api/discovery/scan';

if (!key) {
  console.error('DISCOVERY_SCAN_KEY is not set (see .env).');
  process.exit(2);
}

const res = await fetch(url, { method: 'POST', headers: { 'x-discovery-scan-key': key } });
console.log(`POST ${url} → ${res.status}`);
console.log(await res.text());
process.exit(res.ok ? 0 : 1);
