// «Статистика гарячих ліній» з Google-форми (для тих, хто увійшов в адмінку). Сайт сам нічого не оновлює:
//   GET  /api/stats-sheet — остання відповідь форми й що зміниться на сайті (нічого не записує)
//   POST /api/stats-sheet — перенести цифри з останньої відповіді як чернетку
import type { Endpoint } from 'payload'
import { applySheet, previewSheet } from '../lib/sheetSync'

const forUser =
  (fn: Endpoint['handler']): Endpoint['handler'] =>
  async (req) =>
    req.user ? fn(req) : Response.json({ error: 'Потрібно увійти в адмінку' }, { status: 401 })

export const statsSheetEndpoints: Endpoint[] = [
  { path: '/stats-sheet', method: 'get', handler: forUser(async (req) => Response.json(await previewSheet(req.payload))) },
  { path: '/stats-sheet', method: 'post', handler: forUser(async (req) => Response.json(await applySheet(req.payload))) },
]
