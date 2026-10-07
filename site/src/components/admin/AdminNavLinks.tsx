'use client'
import { useAuth } from '@payloadcms/ui'
import { NavItem } from './DashboardLink'

// Службові пункти лівого меню адмінки — лише для адміністраторів
export const AdminNavLinks = () => {
  const { user } = useAuth<{ role?: string }>()
  if (user?.role !== 'admin') return null
  return (
    <>
      <NavItem href="/admin/status" label="Стан сервера" />
      <NavItem href="/admin/backups" label="Резервні копії" />
    </>
  )
}
