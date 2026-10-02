// Minimal Postgres wire-protocol client: connects, negotiates TLS, sends a
// StartupMessage and prints whatever the server replies (this surfaces the real
// reason a connection is refused, e.g. a disabled/suspended Neon project).
import net from 'node:net';
import tls from 'node:tls';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const url = new URL(process.env.DATABASE_URL);
const host = url.hostname;
const user = decodeURIComponent(url.username);
const database = url.pathname.replace(/^\//, '');

const socket = net.connect({ host, port: 5432, family: 4, timeout: 20000 });
let phase = 'connect';
let buf = Buffer.alloc(0);
const started = Date.now();

const finish = (msg) => {
  console.log(`[${Date.now() - started}ms] ${msg}`);
  socket.destroy();
  process.exit(0);
};

function handleMessage(b) {
  const type = String.fromCharCode(b[0]);
  const len = b.readInt32BE(1);
  const body = b.subarray(5, len);
  if (type === 'R') {
    const authType = body.readInt32BE(0);
    const names = { 0: 'AuthenticationOk', 3: 'CleartextPassword', 5: 'MD5', 10: 'SASL/SCRAM-SHA-256', 11: 'SASLContinue', 12: 'SASLFinal' };
    finish(`auth request: ${names[authType] || authType} (${authType}) -- server accepted the startup packet`);
    return;
  }
  if (type === 'E') {
    const fields = {};
    let i = 0;
    while (i < body.length && body[i] !== 0) {
      const code = String.fromCharCode(body[i]);
      const end = body.indexOf(0, i + 1);
      fields[code] = body.subarray(i + 1, end).toString();
      i = end + 1;
    }
    finish(`SERVER ERROR ${fields.C} | ${fields.M}`);
    return;
  }
  finish(`server reply: type=${type} len=${len} ${body.subarray(0, 120).toString('utf8')}`);
}

socket.on('connect', () => {
  phase = 'ssl';
  socket.write(Buffer.from([0, 0, 0, 8, 4, 210, 22, 47])); // SSLRequest
});
socket.on('data', (chunk) => {
  if (phase === 'ssl') {
    if (chunk[0] !== 0x53) finish(`server refused TLS (reply 0x${chunk[0].toString(16)})`);
    phase = 'startup';
    const secure = tls.connect({ socket, servername: host, rejectUnauthorized: false }, () => {
      const parts = ['user', user, 'database', database, 'application_name', 'probe'];
      const payload = Buffer.from(parts.join('\u0000') + '\u0000\u0000', 'utf8');
      const head = Buffer.alloc(8);
      head.writeInt32BE(payload.length + 8, 0);
      head.writeInt32BE(196608, 4);
      secure.write(Buffer.concat([head, payload]));
    });
    secure.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      while (buf.length >= 5) {
        const len = buf.readInt32BE(1);
        if (buf.length < len) break;
        const msg = buf.subarray(0, len);
        buf = buf.subarray(len);
        handleMessage(msg);
        return;
      }
    });
    secure.on('error', (e) => finish(`TLS error: ${e.message}`));
    return;
  }
  buf = Buffer.concat([buf, chunk]);
});
socket.on('timeout', () => finish('TIMEOUT waiting for the server'));
socket.on('error', (e) => finish(`socket error: ${e.code} ${e.message}`));
socket.on('close', () => finish('socket closed by the server without a protocol reply'));