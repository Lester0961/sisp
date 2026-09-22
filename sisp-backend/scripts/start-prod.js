/**
 * Production startup (Phase 1 — P1-03/P1-04/P1-06).
 *
 * Guarantees:
 *  - validates required environment variables (names only in errors);
 *  - applies reviewed Prisma migrations via `prisma migrate deploy`;
 *  - never recreates/reseeds accounts and never uses `prisma db push`;
 *  - starts the compiled NestJS server only after the steps above succeed.
 *
 * If `migrate deploy` fails because the live database was previously created
 * with `db push`, baseline the already-present migrations once with
 * `npx prisma migrate resolve --applied <migration-name>` before deploying
 * again. See docs/thesis-alignment/DECISION_LOG.md (DEC-011).
 */
const { spawnSync } = require('child_process');

const REQUIRED_ENV = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'ML_SERVICE_URL',
  'ML_SECRET_TOKEN',
];

function fail(message) {
  console.error(`[start-prod] ${message}`);
  process.exit(1);
}

function validateEnv() {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }
  if (process.env.NODE_ENV !== 'production') {
    fail('start:prod requires NODE_ENV=production (mock/demo fallbacks are disabled in production).');
  }
  const missing = REQUIRED_ENV.filter((key) => !process.env[key] || !process.env[key].trim());
  if (missing.length > 0) {
    fail(`Missing required environment variable(s): ${missing.join(', ')}`);
  }
  if (process.env.JWT_SECRET.trim() === process.env.JWT_REFRESH_SECRET.trim()) {
    fail('JWT_SECRET and JWT_REFRESH_SECRET must be different values.');
  }
}

function run(command, args) {
  const executable = process.platform === 'win32' ? `${command}.cmd` : command;
  const result = spawnSync(executable, args, { stdio: 'inherit' });
  if (result.error) {
    fail(`Failed to run ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} exited with code ${result.status}`);
  }
}

function main() {
  validateEnv();

  console.log('[start-prod] Applying reviewed database migrations (prisma migrate deploy)...');
  run('npx', ['prisma', 'migrate', 'deploy']);

  console.log('[start-prod] Starting SISP backend...');
  run('node', ['dist/main.js']);
}

main();
