import type { ReactNode } from 'react'
import { getClient, mediaUrl } from '@/lib/payload'
import { getDict, localeQuery } from '@/lib/i18n'
import { Header, type MenuItem } from './Header'
import { RefreshRouteOnSave } from './RefreshRouteOnSave'
import { Linkify } from './Linkify'
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
    // Один спільний блок: Next.js після переходу прокручує саме його початок (а не кожен блок по черзі — тоді сторінку кидало донизу)
    <div className="site">
      <a className="skip-link" href="#main">
        {t.skipToContent}
      </a>
      <Header
        shortName={c.shortName}
        kicker={c.kicker}
        logoUrl={logo}
        menu={(nav.items || []) as MenuItem[]}
        locale={locale}
        t={t}
        contacts={{
          hotline: c.hotline?.number,
          hotlineNote: c.hotline?.lines?.[0]?.text,
          phones: (c.phones || []).map((p) => p.text),
          email: c.email,
          socials: (c.socials || []).map((s) => ({ network: s.network, label: s.label, url: s.url })),
        }}
      />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <div className="flag-strip" />
      <footer id="footer">
        <div className="wrap">
          <div className="foot">
            <div>
              <div className="foot-brand">
                <img src={logo} alt="" />
                <div>
                  <strong>{c.orgName}</strong>
                  {c.address && (
                    <p style={{ marginTop: 10 }}>
                      {/* адреса — відкривається на карті */}
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`} target="_blank" rel="noopener noreferrer">
                        {c.address}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <h2 className="foot-h">{t.schedule}</h2>
              {c.schedule?.map((l) => <p key={l.id}>{l.text}</p>)}
            </div>
            <div>
              <h2 className="foot-h">{t.contacts}</h2>
              {c.email && (
                <p>
                  <a href={`mailto:${c.email}`}>{c.email}</a>
                </p>
              )}
              {c.phones?.map((l) => (
                <p key={l.id}>
                  <Linkify text={l.text} />
                </p>
              ))}
              {/* гаряча лінія 1648 — у вільному місці під контактами, в тому ж стилі, що й 1548 */}
              <div className="foot-hot2">
                <h2 className="foot-h">{t.hotline}</h2>
                <a className="foot-hot" href="tel:1648">
                  1648
                </a>
                <p>
                  <a href="tel:+380442878165">+38 (044) 287-81-65</a>
                  <span className="foot-note">({t.callsAbroad})</span>
                </p>
              </div>
            </div>
            <div>
              <h2 className="foot-h">{t.hotline}</h2>
              {c.hotline?.number && (
                <a className="foot-hot" href={`tel:${c.hotline.number.replace(/[^\d+]/g, '')}`}>
                  {c.hotline.number}
                </a>
              )}
              {c.hotline?.lines?.map((l) => (
                <p key={l.id}>
                  <Linkify text={l.text} />
                </p>
              ))}
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
    </div>
  )
}
