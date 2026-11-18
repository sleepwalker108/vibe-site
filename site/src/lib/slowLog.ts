// «Самописець» затримок сервера для розділу «Стан сервера» (logs/slow.jsonl, останні 200 записів).
// Навіщо: адмінка іноді «застигає» — перехід між розділами не відбувається кілька секунд. База (SQLite через libsql)
// працює синхронно: поки виконується один важкий запит, сервер не відповідає нікому — ні адмінці, ні сайту.
// Тут записуємо (1) кожен запит до бази, що тривав довше SLOW_SQL_MS, і (2) кожну паузу, коли сервер
// узагалі не відповідав довше LAG_MS (якщо поруч немає повільного запиту — гальмує щось інше, не база).
import path from 'path'
import type { Payload } from 'payload'
import { jsonlLog } from './jsonlLog'

export const SLOW_LOG = path.join(process.cwd(), 'logs', 'slow.jsonl')
const SLOW_SQL_MS = 300
const LAG_MS = 1000

export type SlowEntry = { at: string; kind: 'sql' | 'lag'; ms: number; detail?: string }

const log = jsonlLog<SlowEntry>(SLOW_LOG, { maxBytes: 256 * 1024, keep: 200 })

const write = (e: SlowEntry) => {
  console.warn(`[повільно] ${e.kind} ${e.ms} мс${e.detail ? ` — ${e.detail}` : ''}`)
  log.append(e)
}

// той самий запит не частіше разу на хвилину — щоб журнал не забивався однаковими рядками
const seen = new Map<string, number>()
const once = (key: string) => {
  const now = Date.now()
  if ((seen.get(key) || 0) > now - 60_000) return false
  if (seen.size > 500) seen.clear()
  seen.set(key, now)
  return true
}

type Stmt = string | { sql: string }
const sqlText = (s: unknown) => {
  const q = typeof s === 'string' ? s : Array.isArray(s) ? s.map((x: Stmt) => (typeof x === 'string' ? x : x?.sql)).join('; ') : (s as { sql?: string })?.sql
  // лише текст запиту (значення там — «?»), без самих даних
  return String(q || '').replace(/\s+/g, ' ').slice(0, 400)
}

let started = false

// Запускається один раз під час старту сервера (payload.config → onInit)
export const startSlowWatch = (payload: Payload) => {
  if (started) return
  started = true

  // (1) повільні запити до бази: обгортаємо методи клієнта libsql, через які йдуть усі запити Payload
  const client = (payload.db as unknown as { client?: Record<string, unknown> }).client
  if (client) {
    for (const name of ['execute', 'batch', 'executeMultiple'] as const) {
      const orig = client[name]
      if (typeof orig !== 'function') continue
      client[name] = async function (this: unknown, ...args: unknown[]) {
        const t = performance.now()
        try {
          return await (orig as (...a: unknown[]) => Promise<unknown>).apply(this, args)
        } finally {
          const ms = Math.round(performance.now() - t)
          if (ms >= SLOW_SQL_MS) {
            const detail = sqlText(args[0])
            if (once(detail)) write({ at: new Date().toISOString(), kind: 'sql', ms, detail })
          }
        }
      }
    }
  }

  // (2) паузи, коли сервер не відповідав нікому: таймер мав спрацювати через 250 мс, а спрацював пізніше
  const STEP = 250
  let expected = performance.now() + STEP
  setInterval(() => {
    const now = performance.now()
    const lag = Math.round(now - expected)
    expected = now + STEP
    if (lag >= LAG_MS) write({ at: new Date().toISOString(), kind: 'lag', ms: lag })
  }, STEP).unref()
}

// Останні записи — найновіші першими
export const readSlow = (limit = 20): SlowEntry[] => log.read(limit)
