const { spawnSync } = require('child_process');

console.log('--- RUNNING DB PUSH ---');
const pushResult = spawnSync('npx', ['prisma', 'db', 'push', '--accept-data-loss'], { stdio: 'inherit' });
if (pushResult.error || pushResult.status !== 0) {
  console.log('--- DB PUSH FAILED (Continuing anyway) ---');
}

console.log('--- RUNNING DB SEED ---');
const seedResult = spawnSync('npx', ['prisma', 'db', 'seed'], { stdio: 'inherit' });
if (seedResult.error || seedResult.status !== 0) {
  console.log('--- DB SEED FAILED (Continuing anyway) ---');
}

console.log('--- STARTING SERVER ---');
const server = spawnSync('node', ['dist/main.js'], { stdio: 'inherit' });
process.exit(server.status !== null ? server.status : 1);
