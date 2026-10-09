// «Статистика гарячих ліній» з Google-форми (для тих, хто увійшов в адмінку):
//   GET  /api/stats-sheet — коли й що востаннє підтягнулося
//   POST /api/stats-sheet — перевірити таблицю зараз (навіть якщо відповідь та сама — перезаписати чернетку)
import type { Endpoint } from 'payload'
import { getSyncState, syncFromSheet } from '../lib/sheetSync'

const forUser =
  (fn: Endpoint['handler']): Endpoint['handler'] =>
  async (req) =>
    req.user ? fn(req) : Response.json({ error: 'Потрібно увійти в адмінку' }, { status: 401 })

export const statsSheetEndpoints: Endpoint[] = [
  { path: '/stats-sheet', method: 'get', handler: forUser(async () => Response.json(getSyncState())) },
  { path: '/stats-sheet', method: 'post', handler: forUser(async (req) => Response.json(await syncFromSheet(req.payload, { force: true }))) },
]
