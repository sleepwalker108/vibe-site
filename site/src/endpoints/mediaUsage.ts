// Де використовуються файли медіатеки (для тих, хто увійшов в адмінку):
//   GET /api/media-usage?ids=1,2,3 → { "1": [{ label, title, href }], … }
import type { Endpoint } from 'payload'
import { findMediaUsage } from '../lib/mediaUsage'

export const mediaUsageEndpoints: Endpoint[] = [
  {
    path: '/media-usage',
    method: 'get',
    handler: async (req) => {
      if (!req.user) return Response.json({ error: 'Потрібно увійти в адмінку' }, { status: 401 })
      const ids = String(req.searchParams.get('ids') || '')
        .split(',')
        .map((s) => Number(s))
        .filter((n) => Number.isInteger(n) && n > 0)
        .slice(0, 100)
      return Response.json(await findMediaUsage(req.payload, ids))
    },
  },
]
