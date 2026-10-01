import { execSync } from 'child_process';

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:54329/modeza_test_utf8';
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url } });
}
