import type { Access, FieldAccess, Where } from 'payload'

export const isLoggedIn: Access = ({ req: { user } }) => Boolean(user)

export const isAdmin: Access = ({ req: { user } }) => user?.role === 'admin'

export const isAdminField: FieldAccess = ({ req: { user } }) => user?.role === 'admin'

// Відвідувачі бачать лише опубліковане й не видалене, редактори — ще й чернетки та кошик.
// Без умови про deletedAt будь-хто міг прочитати вміст кошика через API (…/api/pages?trash=true).
export const publishedOrLoggedIn: Access = ({ req: { user } }) => {
  if (user) return true
  const where: Where = { and: [{ _status: { equals: 'published' } }, { deletedAt: { exists: false } }] }
  return where
}

// Колекції без чернеток, але з кошиком (відео): відвідувачі бачать усе, крім видаленого
export const notTrashedOrLoggedIn: Access = ({ req: { user } }) => {
  if (user) return true
  return { deletedAt: { exists: false } }
}
