/**
 * THE LOG WEARS ONE COAT: `log(level, tag, msg, fields)` prints the
 * plain `[tag] msg k=v` line the supervisor log has always carried, or
 * one JSON object per line when LOG_JSON=1 — the same call, the same
 * fields, so a shipper can parse what a human already reads. Only the
 * lines the ops lane touched ride it (boot, tick, db, session); the
 * rest of the codebase's console.* lines are unchanged and still land
 * in the same file.
 */
export type LogLevel = 'info' | 'warn' | 'error';

const JSON_MODE = process.env.LOG_JSON === '1';

function plain(tag: string, msg: string, fields?: Record<string, unknown>): string {
  let line = `[${tag}] ${msg}`;
  if (fields) {
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined) continue;
      line += ` ${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`;
    }
  }
  return line;
}

export function formatLog(level: LogLevel, tag: string, msg: string, fields?: Record<string, unknown>): string {
  if (!JSON_MODE) return plain(tag, msg, fields);
  return JSON.stringify({ ts: new Date().toISOString(), level, tag, msg, ...fields });
}

export function log(level: LogLevel, tag: string, msg: string, fields?: Record<string, unknown>): void {
  const line = formatLog(level, tag, msg, fields);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}
