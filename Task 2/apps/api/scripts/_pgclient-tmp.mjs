// Verifies a Postgres connection string with node-postgres (independent of Prisma).
// Usage: node scripts/_pgclient-tmp.mjs ["<connection string>"]
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const raw = process.argv[2] || process.env.DATABASE_URL;
console.log('target:', raw.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@'));

const client = new pg.Client({
  connectionString: raw,
  ssl: raw.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});

const t0 = Date.now();
try {
  await client.connect();
  const r = await client.query('SELECT current_database() AS db, current_user AS usr, (SELECT count(*) FROM information_schema.tables WHERE table_schema = current_schema()) AS tables');
  console.log(`CONNECT OK in ${Date.now() - t0}ms ->`, JSON.stringify(r.rows[0]));
  const p = await client.query('SELECT count(*)::int AS products FROM "Product"');
  console.log('Product rows:', p.rows[0].products);
} catch (e) {
  console.log(`FAILED in ${Date.now() - t0}ms ->`, e.code || e.name, '|', String(e.message).split('\n')[0]);
} finally {
  await client.end().catch(() => {}); // eslint-disable-line
}