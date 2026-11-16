import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

// Журнал видалень (колекція «Журнал видалень», collections/AuditLog.ts): кожне переміщення в кошик,
// відновлення з кошика й остаточне видалення новини, сторінки, відео чи файлу медіатеки записується —
// хто, коли, що саме. Якщо щось «зникло» з сайту, тут видно, чи це зробила людина (і хто), чи сам сайт.

type Action = 'trash' | 'restore' | 'delete'

const titleOf = (doc: Record<string, unknown> | undefined): string => {
  if (!doc) return ''
  const t = doc.title ?? doc.alt ?? doc.filename
  if (typeof t === 'string') return t
  if (t && typeof t === 'object') return Object.values(t).find((v) => typeof v === 'string' && v.trim()) as string || ''
  return ''
}

const write = async (req: PayloadRequest, action: Action, collection: string, doc: Record<string, unknown> | undefined) => {
  try {
    const title = titleOf(doc).trim().slice(0, 300)
    const user = req.user ? String((req.user as { email?: string }).email || `користувач #${req.user.id}`) : 'сайт (автоматично)'
    await req.payload.create({
      collection: 'audit-log',
      data: {
        action,
        section: collection as 'news' | 'pages' | 'videos' | 'media',
        docId: String(doc?.id ?? ''),
        title: title || '(без назви)',
        slug: typeof doc?.slug === 'string' ? doc.slug : typeof doc?.filename === 'string' ? doc.filename : undefined,
        user,
      },
      overrideAccess: true,
      req,
    })
    req.payload.logger.info(`Журнал видалень: ${action} ${collection} #${doc?.id} «${title}» — ${user}`)
  } catch (e) {
    // журнал не повинен заважати самій дії
    req.payload.logger.warn(`Журнал видалень не записано: ${(e as Error).message}`)
  }
}

export const auditTrash: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, collection, req }) => {
  if (operation !== 'update') return doc
  const was = Boolean(previousDoc?.deletedAt)
  const now = Boolean(doc?.deletedAt)
  if (now && !was) await write(req, 'trash', collection.slug, doc)
  if (!now && was) await write(req, 'restore', collection.slug, doc)
  return doc
}

export const auditDelete: CollectionAfterDeleteHook = async ({ doc, collection, req }) => {
  await write(req, 'delete', collection.slug, doc)
  return doc
}

export const auditHooks = { afterChange: [auditTrash], afterDelete: [auditDelete] }
