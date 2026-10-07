// Резервні копії сайту — для розділу адмінки «Резервні копії».
//   • копія бази: site-РРРРММДД-ГГХХСС.db.gz  (знімок через VACUUM INTO — коректний, навіть коли сайт працює);
//   • копія файлів медіатеки: media-РРРРММДД-ГГХХСС.tar.gz.
// Назви такі самі, як у щоденної автоматичної копії на сервері (deploy/backup.sh), тож усі копії в одному списку.
import { createClient } from '@libsql/client'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import zlib from 'zlib'
import type { Payload } from 'payload'

export const SITE_DIR = process.cwd()
export const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || path.join(SITE_DIR, '..', 'backups'))
const DB_FILE = path.resolve(SITE_DIR, (process.env.DATABASE_URL || 'file:./site.db').replace(/^file:/, ''))
const MEDIA_DIR = path.join(SITE_DIR, 'media')
const KEEP = { db: 30, media: 14 } // скільки копій зберігати (старіші видаляються)

export type BackupKind = 'db' | 'media'
export type BackupFile = { name: string; kind: BackupKind; size: number; date: string; busy: boolean }

const NAME_RE = /^(site|media)-(\d{8})-(\d{6})(\.db(\.gz)?|\.tar\.gz)(\.part)?$/

// Ім'я файлу з адресного рядка — лише точна назва копії, без «../» тощо
export const safeName = (name: unknown): string | null =>
  typeof name === 'string' && NAME_RE.test(name) && !name.endsWith('.part') && fs.existsSync(path.join(BACKUP_DIR, name)) ? name : null

export const filePath = (name: string) => path.join(BACKUP_DIR, name)

const stamp = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

export const listBackups = (): BackupFile[] => {
  if (!fs.existsSync(BACKUP_DIR)) return []
  return fs
    .readdirSync(BACKUP_DIR)
    .map((name) => {
      const m = name.match(NAME_RE)
      if (!m || m[2] === '00000000') return null // службова «порожня» копія на сервері — не показуємо
      const st = fs.statSync(path.join(BACKUP_DIR, name))
      const [, kind, d, t] = m
      return {
        name,
        kind: kind === 'site' ? 'db' : 'media',
        size: st.size,
        date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}`,
        busy: name.endsWith('.part'),
      } as BackupFile
    })
    .filter((b): b is BackupFile => !!b)
    .sort((a, b) => b.date.localeCompare(a.date))
}

const prune = () => {
  for (const kind of ['db', 'media'] as const) {
    listBackups()
      .filter((b) => b.kind === kind && !b.busy)
      .slice(KEEP[kind])
      .forEach((b) => fs.rmSync(filePath(b.name), { force: true }))
  }
}

const sqlString = (s: string) => `'${s.replace(/'/g, "''")}'`
const client = (payload: Payload) => (payload.db as any).client as { execute: (sql: string) => Promise<any>; executeMultiple: (sql: string) => Promise<void> }

// Копія бази: знімок → gzip. Повертає назву файлу.
export const backupDatabase = async (payload: Payload): Promise<string> => {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
  // назва з точністю до секунди — якщо копія з такою назвою вже є, чекаємо наступну секунду (щоб не перезаписати)
  let base = `site-${stamp()}`
  while (fs.existsSync(filePath(`${base}.db.gz`))) {
    await new Promise((r) => setTimeout(r, 1000))
    base = `site-${stamp()}`
  }
  const raw = filePath(`${base}.db.tmp`)
  const part = filePath(`${base}.db.gz.part`)
  try {
    await client(payload).execute(`VACUUM INTO ${sqlString(raw)}`)
    await pipeline(fs.createReadStream(raw), zlib.createGzip({ level: 6 }), fs.createWriteStream(part))
    fs.renameSync(part, filePath(`${base}.db.gz`))
  } finally {
    fs.rmSync(raw, { force: true })
    fs.rmSync(part, { force: true })
  }
  prune()
  return `${base}.db.gz`
}

let mediaRunning = false // щоб два натискання поспіль не запустили дві копії одночасно

// Копія медіатеки (може бути кілька ГБ) — запускається у фоні; поки триває, файл має закінчення .part
export const startMediaBackup = (payload: Payload): string => {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
  if (mediaRunning || listBackups().some((b) => b.kind === 'media' && b.busy)) throw new Error('Копія файлів уже створюється — зачекайте')
  const name = `media-${stamp()}.tar.gz`
  const part = filePath(`${name}.part`)
  // архів пишемо за відносною назвою (у папці копій): tar з Git для Windows сприймає «C:» як адресу сервера
  const tar = spawn('tar', ['-czf', path.basename(part), '-C', SITE_DIR, 'media'], { cwd: BACKUP_DIR, stdio: ['ignore', 'ignore', 'pipe'] })
  mediaRunning = true
  let err = ''
  tar.stderr.on('data', (d) => (err += d))
  tar.on('error', (e) => {
    mediaRunning = false
    fs.rmSync(part, { force: true })
    payload.logger.error(`Копія медіатеки: ${e.message}`)
  })
  tar.on('close', (code) => {
    mediaRunning = false
    if (code === 0) {
      try {
        fs.renameSync(part, filePath(name))
        prune()
        payload.logger.info(`Копія медіатеки готова: ${name}`)
      } catch (e) {
        payload.logger.error(`Копія медіатеки: ${(e as Error).message}`)
      }
    } else {
      fs.rmSync(part, { force: true })
      payload.logger.error(`Копія медіатеки не вдалася (код ${code}): ${err.slice(0, 300)}`)
    }
  })
  return name
}

export const mediaExists = () => fs.existsSync(MEDIA_DIR)

// Відновлення бази з копії — без зупинки сайту: дані копіюються в робочу базу однією транзакцією.
// Перед цим автоматично робиться копія поточного стану (щоб можна було повернутись).
export const restoreDatabase = async (payload: Payload, name: string): Promise<{ safety: string }> => {
  if (!name.startsWith('site-')) throw new Error('Відновити можна лише копію бази')
  const tmp = filePath(`restore-${Date.now()}.db.tmp`)
  // Окреме з'єднання лише для відновлення: спільне з'єднання сайту може «забрати» будь-яка паралельна
  // транзакція (наприклад, запис відвідування), і тоді приєднана копія (ATTACH) опинилася б не там.
  // Налаштування цього з'єднання (foreign_keys, busy_timeout) не впливають на роботу сайту.
  const db = createClient({ url: `file:${DB_FILE}` })
  let safety = ''
  try {
    await db.execute('PRAGMA busy_timeout = 30000') // сайт теж пише в базу — чекаємо, а не падаємо
    // 1) розпакувати
    const src = fs.createReadStream(filePath(name))
    await pipeline(name.endsWith('.gz') ? src.pipe(zlib.createGunzip()) : src, fs.createWriteStream(tmp))
    const head = Buffer.alloc(16)
    const fd = fs.openSync(tmp, 'r')
    fs.readSync(fd, head, 0, 16, 0)
    fs.closeSync(fd)
    if (!head.toString('latin1').startsWith('SQLite format 3')) throw new Error('Файл пошкоджений — це не база даних')

    // 2) копія має бути з тієї ж версії сайту (ті самі міграції), інакше таблиці не збігаються
    await db.execute(`ATTACH DATABASE ${sqlString(tmp)} AS r`)
    try {
      const names = async (schema: string) =>
        ((await db.execute(`SELECT name FROM ${schema}.payload_migrations ORDER BY name`)).rows as any[]).map((r) => r.name).join('|')
      const [cur, old] = await Promise.all([names('main'), names('r')])
      if (cur !== old)
        throw new Error('Ця копія зроблена на іншій версії сайту (інша структура бази). Її можна відновити лише вручну на сервері.')

      const tables = ((await db.execute(`SELECT name FROM main.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)).rows as any[]).map(
        (r) => r.name as string,
      )
      // 3) спершу — копія поточного стану
      safety = await backupDatabase(payload)

      // 4) замінити дані однією транзакцією (якщо щось не так — нічого не зміниться)
      const q = (t: string) => `"${t.replace(/"/g, '""')}"`
      const sql = [
        'PRAGMA foreign_keys=OFF;',
        'BEGIN IMMEDIATE;',
        ...tables.map((t) => `DELETE FROM main.${q(t)}; INSERT INTO main.${q(t)} SELECT * FROM r.${q(t)};`),
        'COMMIT;',
      ].join('\n')
      try {
        await db.executeMultiple(sql)
      } catch (e) {
        await db.executeMultiple('ROLLBACK;').catch(() => {})
        throw e
      }
    } finally {
      await db.execute('DETACH DATABASE r').catch(() => {})
    }
    return { safety }
  } finally {
    db.close()
    fs.rmSync(tmp, { force: true })
  }
}

export const deleteBackup = (name: string) => fs.rmSync(filePath(name), { force: true })

export const diskFree = (): number | null => {
  try {
    const s = fs.statfsSync(fs.existsSync(BACKUP_DIR) ? BACKUP_DIR : SITE_DIR)
    return s.bavail * s.bsize
  } catch {
    return null
  }
}
