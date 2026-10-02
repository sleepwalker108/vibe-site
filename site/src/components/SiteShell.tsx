import type { ReactNode } from 'react'
import { getClient, mediaUrl } from '@/lib/payload'
import { getDict, localeQuery } from '@/lib/i18n'
import { Header, type MenuItem } from './Header'
import { RefreshRouteOnSave } from './RefreshRouteOnSave'
import { ToTop } from './ToTop'

// Шапка + підвал + (у режимі перегляду) автооновлення з адмінки
export const SiteShell = async ({ children, draft }: { children: ReactNode; draft: boolean }) => {
  const payload = await getClient()
  const { locale, t } = await getDict()
  const [c, nav] = await Promise.all([
    payload.findGlobal({ slug: 'contacts', draft, depth: 1, ...localeQuery(locale) }),
    payload.findGlobal({ slug: 'navigation', draft, depth: 0, ...localeQuery(locale) }),
  ])
  const logo = mediaUrl(c.logo, 'card') || '/img/emblem.png'

  return (
    <>
      <Header shortName={c.shortName} kicker={c.kicker} logoUrl={logo} menu={(nav.items || []) as MenuItem[]} locale={locale} t={t} />
      <main>{children}</main>
      <div className="flag-strip" />
      <footer id="footer">
        <div className="wrap">
          <div className="foot">
            <div>
              <div className="foot-brand">
                <img src={logo} alt="" />
                <div>
                  <strong>{c.orgName}</strong>
                  <p style={{ marginTop: 10 }}>{c.address}</p>
                </div>
              </div>
            </div>
            <div>
              <h4>{t.schedule}</h4>
              {c.schedule?.map((l) => <p key={l.id}>{l.text}</p>)}
            </div>
            <div>
              <h4>{t.contacts}</h4>
              {c.email && (
                <p>
                  <a href={`mailto:${c.email}`}>{c.email}</a>
                </p>
              )}
              {c.phones?.map((l) => <p key={l.id}>{l.text}</p>)}
            </div>
            <div>
              <h4>{t.hotline}</h4>
              <div className="foot-hot">{c.hotline?.number}</div>
              {c.hotline?.lines?.map((l) => <p key={l.id}>{l.text}</p>)}
            </div>
          </div>
          <div className="foot-bottom">
            <span>© {new Date().getFullYear()} dp-reintegration.gov.ua</span>
            <ToTop label={t.toTop} />
          </div>
        </div>
      </footer>
      {draft && (
        <>
          <RefreshRouteOnSave />
          <div className="preview-bar">{t.previewBar}</div>
        </>
      )}
    </>
  )
}
