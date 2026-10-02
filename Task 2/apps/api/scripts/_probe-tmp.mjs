import dns from 'node:dns/promises';
import net from 'node:net';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const host = new URL(process.env.DATABASE_URL).hostname;

const addrs = await dns.lookup(host, { all: true });
console.log('host:', host);
console.log('dns.lookup order:', JSON.stringify(addrs));

await new Promise((resolve) => {
  const s = net.connect({ host, port: 5432, timeout: 15000 });
  let done = false;
  const end = (m) => {
    if (done) return;
    done = true;
    console.log('net.connect (node default order):', m, '| local', s.localAddress);
    s.destroy();
    resolve();
  };
  s.on('connect', () => end('CONNECTED'));
  s.on('timeout', () => end('TIMEOUT'));
  s.on('error', (e) => end(`ERROR ${e.code} ${e.message}`));
  s.on('close', () => end('CLOSED no reply'));
});

const prisma = new PrismaClient();
const t0 = Date.now();
try {
  const r = await prisma.$queryRaw`SELECT 1 AS ok`;
  console.log('prisma SELECT 1 ->', JSON.stringify(r), `${Date.now() - t0}ms`);
} catch (e) {
  console.log('prisma FAILED:', e.constructor.name, e.message.split('\n')[0], `${Date.now() - t0}ms`);
}
await prisma.$disconnect();