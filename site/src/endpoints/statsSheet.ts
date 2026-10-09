// Статистика з Google-форми (для тих, хто увійшов в адмінку). Сайт сам нічого не оновлює.
// <розділ> — stats («Статистика гарячих ліній») або annual-report («Річний звіт гарячих ліній»):
//   GET    /api/sheet-sync/<розділ> — остання відповідь форми й що зміниться (нічого не записує)
//   POST   /api/sheet-sync/<розділ> — перенести цифри з останньої відповіді як чернетку
//   DELETE /api/sheet-sync/<розділ> — скасувати останнє перенесення (повернути цифри, як були)
import type { Endpoint, PayloadRequest } from 'payload'
import { applySheet, isSheetSlug, previewSheet, undoSheet, type SheetSlug } from '../lib/sheetSync'

const handler =
  (fn: (req: PayloadRequest, slug: SheetSlug) => Promise<unknown>): Endpoint['handler'] =>
  async (req) => {
    if (!req.user) return Response.json({ error: 'Потрібно увійти в адмінку' }, { status: 401 })
    const slug = req.routeParams?.slug
    if (!isSheetSlug(slug)) return Response.json({ error: 'Невідомий розділ' }, { status: 404 })
    return Response.json(await fn(req, slug))
  }

export const statsSheetEndpoints: Endpoint[] = [
  { path: '/sheet-sync/:slug', method: 'get', handler: handler((req, slug) => previewSheet(req.payload, slug)) },
  { path: '/sheet-sync/:slug', method: 'post', handler: handler((req, slug) => applySheet(req.payload, slug)) },
  { path: '/sheet-sync/:slug', method: 'delete', handler: handler((req, slug) => undoSheet(req.payload, slug)) },
]
