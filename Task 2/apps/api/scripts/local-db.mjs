// Starts a throwaway local PostgreSQL (no Docker needed) for development & tests.
// Data lives in apps/api/.pgdata. Usage: npm run db:local
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.pgdata');
const port = Number(process.env.LOCAL_PG_PORT || 54329);
const pg = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: 'postgres', port, persistent: true, initdbFlags: ['--encoding=UTF8', '--locale=C'] });

if (!existsSync(path.join(dir, 'PG_VERSION'))) await pg.initialise();
await pg.start();
for (const db of ['modeza_dev', 'modeza_test_utf8']) {
  try { await pg.createDatabase(db); } catch { /* already exists */ }
}
console.log(`Local Postgres ready on port ${port}`);
console.log(`DATABASE_URL=postgresql://postgres:postgres@localhost:${port}/modeza_dev`);
const stop = async () => { await pg.stop(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
setInterval(() => {}, 1 << 30);
