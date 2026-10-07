'use client'
import { useAuth } from '@payloadcms/ui'
import { NavItem } from './DashboardLink'

// Пункт «Резервні копії» у лівому меню адмінки — лише для адміністраторів
export const BackupsNavLink = () => {
  const { user } = useAuth<{ role?: string }>()
  return user?.role === 'admin' ? <NavItem href="/admin/backups" label="Резервні копії" /> : null
}
