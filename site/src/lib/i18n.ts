import { cookies } from 'next/headers'
import { dictionaries, LOCALE_COOKIE, type Locale } from './dictionary'

// Мова відвідувача зберігається в cookie «lang» (перемикач EN/UA у шапці). За замовчуванням — українська.
export const getLocale = async (): Promise<Locale> =>
  (await cookies()).get(LOCALE_COOKIE)?.value === 'en' ? 'en' : 'uk'

export const getDict = async () => {
  const locale = await getLocale()
  return { locale, t: dictionaries[locale] }
}

// Параметри для запитів до Payload: англійська з запасним варіантом — українською, якщо перекладу ще немає
export const localeQuery = (locale: Locale) => ({ locale, fallbackLocale: 'uk' as const })
