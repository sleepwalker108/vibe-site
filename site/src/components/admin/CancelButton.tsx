'use client'
import { Button, ConfirmationModal, toast, useConfig, useDocumentInfo, useForm, useFormModified, useLocale, useModal } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'

/**
 * «Скасувати» біля кнопок збереження/публікації.
 *  - Є неопубліковані зміни (адмінка зберігає їх як чернетку автоматично) → після підтвердження документ
 *    повертається до опублікованої версії, і ми виходимо до списку.
 *  - Є незбережені зміни в розділі без чернеток (користувачі, медіатека) → після підтвердження виходимо без збереження.
 *  - Змін немає → просто повертаємось до списку (для розділів «Сайт» — на головну адмінки).
 */
export const CancelButton = () => {
  const { id, collectionSlug, globalSlug, hasPublishedDoc, unpublishedVersionCount, docConfig } = useDocumentInfo()
  const { reset, setModified } = useForm()
  const modified = useFormModified()
  const { code: locale } = useLocale()
  const { openModal } = useModal()
  const {
    config: {
      routes: { api, admin },
    },
  } = useConfig()
  const router = useRouter()

  const slug = `cancel-changes-${collectionSlug || globalSlug}-${id || 'new'}`
  const hasDrafts = Boolean((docConfig as any)?.versions?.drafts)
  const back = collectionSlug ? `${admin}/collections/${collectionSlug}` : admin
  const canRevert = hasDrafts && hasPublishedDoc && (unpublishedVersionCount > 0 || modified)
  const needsConfirm = canRevert || modified

  const leave = () => {
    setModified(false) // щоб адмінка не питала «Вийти без збереження?»
    router.push(back)
  }

  // Повернення до опублікованої версії (так само, як «Повернутися до опублікованого стану» в адмінці)
  const revert = async () => {
    const url = collectionSlug
      ? `${api}/${collectionSlug}/${id}?locale=${locale}&fallback-locale=null&depth=0`
      : `${api}/globals/${globalSlug}?locale=${locale}&fallback-locale=null&depth=0`
    const published = await fetch(url, { credentials: 'include' }).then((r) => r.json())
    const res = await fetch(url, {
      method: collectionSlug ? 'PATCH' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(published),
    })
    if (!res.ok) {
      toast.error('Не вдалося скасувати зміни. Спробуйте ще раз.')
      return false
    }
    const json = await res.json()
    await reset(collectionSlug ? json.doc : json.result)
    toast.success('Зміни скасовано — повернуто опубліковану версію')
    return true
  }

  return (
    <>
      <Button buttonStyle="secondary" size="medium" className="cancel-btn" onClick={() => (needsConfirm ? openModal(slug) : leave())}>
        Скасувати
      </Button>
      <ConfirmationModal
        modalSlug={slug}
        heading="Скасувати зміни?"
        body={
          canRevert
            ? 'Усі неопубліковані зміни буде видалено, документ повернеться до опублікованої версії. Це не можна відмінити.'
            : 'Незбережені зміни буде втрачено.'
        }
        cancelLabel="Ні, продовжити редагування"
        confirmLabel="Так, скасувати"
        confirmingLabel="Скасовую…"
        onConfirm={async () => {
          if (canRevert && !(await revert())) return
          leave()
        }}
      />
    </>
  )
}
