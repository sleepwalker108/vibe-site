import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import { BACKUP_DIR, diskFree, listBackups } from '@/lib/backups'
import { BackupsPanel } from './BackupsPanel'

// Розділ адмінки «Резервні копії»: /admin/backups (лише для адміністраторів)
export const BackupsView = async ({ initPageResult, params, searchParams }: AdminViewServerProps) => {
  const { req, permissions, visibleEntities, locale } = initPageResult
  if (!req.user) redirect('/admin/login?redirect=%2Fadmin%2Fbackups')
  const isAdmin = req.user.role === 'admin'

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user}
      visibleEntities={visibleEntities}
    >
      {isAdmin ? (
        <BackupsPanel initial={listBackups()} free={diskFree()} dir={BACKUP_DIR} />
      ) : (
        <div style={{ padding: '32px var(--gutter-h, 60px)' }}>
          <h1>Резервні копії</h1>
          <p>Цей розділ доступний лише адміністраторам.</p>
        </div>
      )}
    </DefaultTemplate>
  )
}
