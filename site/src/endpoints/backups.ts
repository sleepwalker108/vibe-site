// API розділу «Резервні копії» (лише для адміністраторів):
//   POST   /api/backups              { kind: 'db' | 'media' }  — зробити копію
//   GET    /api/backups/download?file=…                        — завантажити копію на комп'ютер
//   POST   /api/backups/restore      { file }                  — відновити базу з копії
//   DELETE /api/backups?file=…                                 — видалити копію
import fs from 'fs'
import { Readable } from 'stream'
import type { Endpoint, PayloadRequest } from 'payload'
import { backupDatabase, deleteBackup, filePath, listBackups, mediaExists, restoreDatabase, safeName, startMediaBackup } from '../lib/backups'

const json = (data: unknown, status = 200) => Response.json(data, { status })
const denied = (req: PayloadRequest) => (req.user?.role === 'admin' ? null : json({ error: 'Лише для адміністраторів' }, 403))
const body = async (req: PayloadRequest) => ((await req.json?.().catch(() => ({}))) || {}) as Record<string, unknown>
const fail = (e: unknown) => json({ error: (e as Error)?.message || 'Невідома помилка' }, 400)

export const backupEndpoints: Endpoint[] = [
  {
    path: '/backups',
    method: 'get',
    handler: async (req) => denied(req) || json({ backups: listBackups() }),
  },
  {
    path: '/backups',
    method: 'post',
    handler: async (req) => {
      const no = denied(req)
      if (no) return no
      const { kind } = await body(req)
      try {
        if (kind === 'media') {
          if (!mediaExists()) return json({ error: 'Медіатека порожня' }, 400)
          return json({ started: startMediaBackup(req.payload) })
        }
        return json({ created: await backupDatabase(req.payload) })
      } catch (e) {
        return fail(e)
      }
    },
  },
  {
    path: '/backups/download',
    method: 'get',
    handler: async (req) => {
      const no = denied(req)
      if (no) return no
      const name = safeName(req.searchParams.get('file'))
      if (!name) return json({ error: 'Копію не знайдено' }, 404)
      const { size } = fs.statSync(filePath(name))
      return new Response(Readable.toWeb(fs.createReadStream(filePath(name))) as ReadableStream, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(size),
          'Content-Disposition': `attachment; filename="nartu-${name}"`,
          'Cache-Control': 'no-store',
        },
      })
    },
  },
  {
    path: '/backups/restore',
    method: 'post',
    handler: async (req) => {
      const no = denied(req)
      if (no) return no
      const name = safeName((await body(req)).file)
      if (!name) return json({ error: 'Копію не знайдено' }, 404)
      try {
        const { safety } = await restoreDatabase(req.payload, name)
        req.payload.logger.warn(`Базу відновлено з копії ${name} (користувач ${req.user?.email}); попередній стан — ${safety}`)
        return json({ restored: name, safety })
      } catch (e) {
        return fail(e)
      }
    },
  },
  {
    path: '/backups',
    method: 'delete',
    handler: async (req) => {
      const no = denied(req)
      if (no) return no
      const name = safeName(req.searchParams.get('file'))
      if (!name) return json({ error: 'Копію не знайдено' }, 404)
      deleteBackup(name)
      return json({ deleted: name })
    },
  },
]
