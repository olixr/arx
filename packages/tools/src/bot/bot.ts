/**
 * Headless bot client for load/soak testing.
 * Usage: npm run bot -w @arx/tools -- [count] [serverUrl]
 */
import WebSocket from 'ws';
import {
  PROTOCOL_VERSION,
  TICK_MS,
  type C2SMessage,
  type S2CMessage,
} from '@arx/shared';

const count = Number.parseInt(process.argv[2] ?? '5', 10);
const url = process.argv[3] ?? 'ws://localhost:8790/ws';

function startBot(index: number): void {
  const ws = new WebSocket(url);
  let seq = 1;
  let timer: NodeJS.Timeout | null = null;
  let heading = Math.random() * Math.PI * 2;

  const send = (msg: C2SMessage) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  };

  ws.on('open', () => {
    send({ t: 'hello', v: PROTOCOL_VERSION, name: `Bot${index}` });
  });

  ws.on('message', (data, isBinary) => {
    if (isBinary) return;
    const msg = JSON.parse(data.toString()) as S2CMessage;
    if (msg.t === 'welcome') {
      console.log(`[bot ${index}] joined as eid ${msg.eid}`);
      timer = setInterval(() => {
        // Wander: drift the heading, occasionally pick a new one.
        heading += (Math.random() - 0.5) * 0.4;
        if (Math.random() < 0.01) heading = Math.random() * Math.PI * 2;
        send({
          t: 'input',
          frame: {
            seq: seq++,
            mx: Math.cos(heading),
            my: Math.sin(heading),
            aim: heading,
            buttons: 0,
          },
        });
      }, TICK_MS);
    } else if (msg.t === 'reject') {
      console.error(`[bot ${index}] rejected: ${msg.reason}`);
    }
  });

  ws.on('close', () => {
    if (timer) clearInterval(timer);
    console.log(`[bot ${index}] disconnected`);
  });
  ws.on('error', (err) => console.error(`[bot ${index}] error:`, err.message));
}

console.log(`Starting ${count} bots against ${url}`);
for (let i = 0; i < count; i++) {
  setTimeout(() => startBot(i), i * 100);
}
