// Live proof of THE COMMAND LEDGER: guest joins the scratch server and
// speaks through the new registry — a dev command with a deterministic
// reply (/proc), a player command (/lock), a dev /tp, and plain speech.
import WebSocket from '/Users/aeriek/code/devcraft-stage/node_modules/ws/wrapper.mjs';
import { PROTOCOL_VERSION } from '/Users/aeriek/code/devcraft-stage/packages/shared/src/index.ts';

const ws = new WebSocket('ws://localhost:8899/ws');
const got = [];
let eid = null;
const send = (m) => ws.send(JSON.stringify(m));
ws.on('open', () => send({ t: 'hello', v: PROTOCOL_VERSION, name: 'LedgerProbe' }));
ws.on('message', (data, isBinary) => {
  if (isBinary) return;
  const msg = JSON.parse(data.toString());
  if (msg.t === 'welcome') {
    eid = msg.eid;
    send({ t: 'chat', text: '/proc' });
    setTimeout(() => send({ t: 'chat', text: '/lock' }), 300);
    setTimeout(() => send({ t: 'chat', text: '/tp 40 20' }), 600);
    setTimeout(() => send({ t: 'chat', text: 'ledger says hello' }), 900);
  } else if (msg.t === 'chat') {
    got.push(`[${msg.channel}] ${msg.text}`);
  } else if (msg.t === 'reject') {
    console.log('REJECT', msg.reason); process.exit(1);
  }
});
setTimeout(() => {
  console.log('eid:', eid);
  for (const g of got) console.log(g);
  const ok = got.some((g) => g.includes('Workings:'))
    && got.some((g) => g.includes('door') || g.includes('lock'))
    && got.some((g) => g.includes('ledger says hello'));
  console.log(ok ? 'CHAT LEDGER LIVE PASS' : 'CHAT LEDGER LIVE FAIL');
  process.exit(ok ? 0 : 1);
}, 2500);
