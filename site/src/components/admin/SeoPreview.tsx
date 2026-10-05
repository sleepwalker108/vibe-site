'use client'
import { useDocumentInfo, useFormFields } from '@payloadcms/ui'

const SITE = 'dp-reintegration.gov.ua'
const SUFFIX = ' — НАРТУ'

const Counter = ({ n, ok: [min, max] }: { n: number; ok: [number, number] }) => (
  <span className={`seo-count ${n === 0 ? '' : n < min ? 'warn' : n > max ? 'bad' : 'good'}`}>
    {n} / {max}
  </span>
)

// «Як виглядатиме в Google» — оновлюється під час набору
export const SeoPreview = () => {
  const { collectionSlug } = useDocumentInfo()
  const v = useFormFields(([f]) => ({
    title: f.title?.value as string | undefined,
    slug: f.slug?.value as string | undefined,
    excerpt: f.excerpt?.value as string | undefined,
    metaTitle: f['meta.title']?.value as string | undefined,
    metaDesc: f['meta.description']?.value as string | undefined,
  }))
  const title = (v.metaTitle || v.title || 'Заголовок сторінки') + (v.metaTitle ? '' : SUFFIX)
  const desc = v.metaDesc || v.excerpt || 'Google візьме опис із тексту сторінки. Краще написати власний — 120–160 символів.'
  const path = collectionSlug === 'news' ? `news › ${v.slug || '…'}` : v.slug || '…'

  return (
    <div className="seo-preview">
      <style>{CSS}</style>
      <div className="seo-label">Так сторінка виглядатиме в Google</div>
      <div className="seo-card">
        <div className="seo-site">
          <span className="seo-fav">Н</span>
          <span>
            <b>НАРТУ</b>
            <small>
              https://{SITE} › {path}
            </small>
          </span>
        </div>
        <div className="seo-title">{title.length > 65 ? title.slice(0, 62) + '…' : title}</div>
        <div className="seo-desc">{desc.length > 165 ? desc.slice(0, 160) + '…' : desc}</div>
      </div>
      <div className="seo-counts">
        Заголовок: <Counter n={(v.metaTitle || v.title || '').length + (v.metaTitle ? 0 : SUFFIX.length)} ok={[25, 60]} />
        Опис: <Counter n={(v.metaDesc || v.excerpt || '').length} ok={[110, 160]} />
      </div>
    </div>
  )
}

const CSS = `
.seo-preview { margin: 4px 0 20px; }
.seo-label { font-size: 13px; color: var(--theme-elevation-600); margin-bottom: 6px; }
.seo-card { background: #fff; color: #202124; border: 1px solid var(--theme-elevation-150); border-radius: 10px; padding: 14px 16px; max-width: 640px; font-family: Arial, sans-serif; }
.seo-site { display: flex; gap: 10px; align-items: center; margin-bottom: 6px; }
.seo-site b { display: block; font-size: 14px; font-weight: 400; }
.seo-site small { display: block; font-size: 12px; color: #4d5156; }
.seo-fav { width: 26px; height: 26px; border-radius: 50%; background: #0057b8; color: #ffd500; display: grid; place-items: center; font-weight: 700; font-size: 13px; }
.seo-title { color: #1a0dab; font-size: 20px; line-height: 1.3; margin-bottom: 3px; }
.seo-desc { color: #4d5156; font-size: 14px; line-height: 1.58; }
.seo-counts { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 12px; margin-top: 8px; color: var(--theme-elevation-600); }
.seo-count { padding: 1px 8px; border-radius: 999px; background: var(--theme-elevation-100); margin-right: 10px; font-variant-numeric: tabular-nums; }
.seo-count.good { background: #dcf3e5; color: #1f6b3d; } .seo-count.warn { background: #fff1c2; color: #7a5b00; } .seo-count.bad { background: #fde2d8; color: #9a3412; }
`
