// API розділу «Стан сервера» (лише для адміністраторів):
//   GET /api/status/links    — перевірка посилань і картинок у новинах та сторінках
//   GET /api/status/updates  — чи є на GitHub нові зміни, ще не встановлені на сервері
import type { Endpoint } from 'payload'
import { checkLinks } from '../lib/linkCheck'
import { getUpdates } from '../lib/serverStatus'

const forAdmin =
  (fn: Endpoint['handler']): Endpoint['handler'] =>
  async (req) =>
    req.user?.role === 'admin' ? fn(req) : Response.json({ error: 'Лише для адміністраторів' }, { status: 403 })

export const statusEndpoints: Endpoint[] = [
  { path: '/status/links', method: 'get', handler: forAdmin(async (req) => Response.json(await checkLinks(req.payload))) },
  { path: '/status/updates', method: 'get', handler: forAdmin(async () => Response.json(await getUpdates())) },
]
