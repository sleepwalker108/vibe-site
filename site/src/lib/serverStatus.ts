// Дані для розділу адмінки «Стан сервера»
import { execFile } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { Payload } from 'payload'
import { BACKUP_DIR, SITE_DIR, listBackups } from './backups'

const ROOT = path.resolve(SITE_DIR, '..') // папка з git-репозиторієм
const DB_FILE = path.resolve(SITE_DIR, (process.env.DATABASE_URL || 'file:./site.db').replace(/^file:/, ''))

const git = (args: string[]) =>
  new Promise<string>((resolve) =>
    execFile('git', ['-C', ROOT, ...args], { timeout: 5000, windowsHide: true }, (e, out) => resolve(e ? '' : String(out).trim())),
  )

const dirSize = (dir: string): number => {
  let total = 0
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) total += dirSize(p)
      else if (e.isFile()) total += fs.statSync(p).size
    }
  } catch {}
  return total
}
const fileSize = (f: string) => {
  try {
    return fs.statSync(f).size
  } catch {
    return 0
  }
}

// Пам'ять: на Linux беремо «доступно» (з урахуванням кешу), інакше — просто вільну
const memory = () => {
  const total = os.totalmem()
  let available = os.freemem()
  try {
    const m = fs.readFileSync('/proc/meminfo', 'utf8').match(/MemAvailable:\s+(\d+)/)
    if (m) available = Number(m[1]) * 1024
  } catch {}
  return { total, used: total - available, site: process.memoryUsage().rss }
}

const disk = () => {
  try {
    const s = fs.statfsSync(SITE_DIR)
    return { total: s.blocks * s.bsize, free: s.bavail * s.bsize }
  } catch {
    return null
  }
}

export const getServerStatus = async (payload: Payload) => {
  const [head, branch, origin] = await Promise.all([
    git(['log', '-1', '--format=%H%x1f%h%x1f%s%x1f%cI']),
    git(['rev-parse', '--abbrev-ref', 'HEAD']),
    git(['remote', 'get-url', 'origin']),
  ])
  const [sha, short, subject, committed] = head.split('\x1f')
  let built: string | null = null
  try {
    built = fs.statSync(path.join(SITE_DIR, '.next', 'BUILD_ID')).mtime.toISOString()
  } catch {}

  const count = (collection: 'news' | 'pages' | 'media' | 'users', where?: any) =>
    payload.count({ collection, where, overrideAccess: true }).then((r) => r.totalDocs)
  const [news, newsDraft, pages, media, users] = await Promise.all([
    count('news', { _status: { equals: 'published' } }),
    count('news', { _status: { equals: 'draft' } }),
    count('pages'),
    count('media'),
    count('users'),
  ])

  const backups = listBackups().filter((b) => !b.busy)
  const lastDb = backups.find((b) => b.kind === 'db') || null
  const lastMedia = backups.find((b) => b.kind === 'media') || null

  return {
    version: sha ? { sha, short, subject, committed, branch: branch || 'main', origin: origin.replace(/\/\/[^@/]+@/, '//') } : null,
    built,
    uptime: { site: process.uptime(), server: os.uptime() },
    node: process.version,
    host: os.hostname(),
    disk: disk(),
    memory: memory(),
    sizes: { db: fileSize(DB_FILE), media: dirSize(path.join(SITE_DIR, 'media')), backups: dirSize(BACKUP_DIR) },
    counts: { news, newsDraft, pages, media, users },
    backups: { lastDb, lastMedia, total: backups.length },
  }
}
export type ServerStatus = Awaited<ReturnType<typeof getServerStatus>>

// Нові зміни на GitHub, які ще не встановлені на сервері
export type UpdatesInfo =
  | { state: 'current' }
  | { state: 'behind'; count: number; commits: { short: string; message: string; date: string }[] }
  | { state: 'unknown'; reason: string }

export const getUpdates = async (): Promise<UpdatesInfo> => {
  const [sha, branch, origin] = await Promise.all([git(['rev-parse', 'HEAD']), git(['rev-parse', '--abbrev-ref', 'HEAD']), git(['remote', 'get-url', 'origin'])])
  if (!sha) return { state: 'unknown', reason: 'Не вдалося прочитати версію сайту (git)' }
  const gh = origin.match(/github\.com[:/]([^/]+)\/([^/.]+)(\.git)?$/)
  if (gh) {
    try {
      const r = await fetch(`https://api.github.com/repos/${gh[1]}/${gh[2]}/compare/${sha}...${branch || 'main'}`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'nartu-site' },
        signal: AbortSignal.timeout(7000),
        cache: 'no-store',
      })
      if (r.ok) {
        const c = await r.json()
        if (c.status === 'identical' || c.status === 'behind' || !c.ahead_by) return { state: 'current' }
        return {
          state: 'behind',
          count: c.ahead_by,
          commits: (c.commits as any[])
            .slice(-15)
            .reverse()
            .map((x) => ({ short: String(x.sha).slice(0, 7), message: String(x.commit.message).split('\n')[0], date: x.commit.author?.date || '' })),
        }
      }
    } catch {}
  }
  // запасний варіант без GitHub API — лише «є/немає змін»
  const remote = (await git(['ls-remote', 'origin', `refs/heads/${branch || 'main'}`])).split(/\s/)[0]
  if (!remote) return { state: 'unknown', reason: 'Немає зв’язку з GitHub' }
  return remote === sha ? { state: 'current' } : { state: 'behind', count: 0, commits: [] }
}
