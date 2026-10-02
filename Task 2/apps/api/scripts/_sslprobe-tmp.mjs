// Sends a Postgres SSLRequest and reports whether the server actually replies.
// Used to tell "TCP connects but data is black-holed" apart from "server refuses".
// Usage: node scripts/_sslprobe-tmp.mjs <host> <family|default>
import net from 'node:net';

const [, , host, fam = 'default'] = process.argv;
const opts = { host, port: 5432, timeout: 12000 };
if (fam !== 'default') opts.family = Number(fam);

const t0 = Date.now();
await new Promise((resolve) => {
  const s = net.connect(opts);
  let done = false;
  const end = (msg) => {
    if (done) return;
    done = true;
    console.log(`${fam.padEnd(8)} local=${s.localAddress || '-'}  ->  ${msg}  (${Date.now() - t0}ms)`);
    s.destroy();
    resolve();
  };
  s.on('connect', () => s.write(Buffer.from([0, 0, 0, 8, 4, 210, 22, 47])));
  s.on('data', (b) => end(`reply 0x${b[0].toString(16)}`));
  s.on('timeout', () => end('TIMEOUT (no data)'));
  s.on('error', (e) => end(`ERROR ${e.code}`));
  s.on('close', () => end('closed with no reply'));
});