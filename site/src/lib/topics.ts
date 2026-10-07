// Теми новин (як рубрики на старому сайті) — для фільтрів у списку новин і в пошуку
export const TOPICS = [
  { value: 'evacuation', uk: 'Евакуація', en: 'Evacuation', wp: ['Евакуація', 'Evacuation'] },
  { value: 'idp-support', uk: 'Підтримка ВПО', en: 'Support for IDPs', wp: ['Підтримка ВПО', 'Support for IDPs'] },
  { value: 'shelter', uk: 'Прихисток', en: 'Shelter', wp: ['Прихисток', 'Shelter'] },
  { value: 'recovery', uk: 'Відновлення', en: 'Recovery', wp: ['Відновлення', 'Recovery'] },
  { value: 'weekly', uk: 'Головне за тиждень', en: 'Highlights of the week', wp: ['Головне за тиждень', 'Highlights of the week'] },
] as const

export type Topic = (typeof TOPICS)[number]['value']

export const isTopic = (v: unknown): v is Topic => TOPICS.some((t) => t.value === v)
export const topicLabel = (v: string, locale: 'uk' | 'en') => TOPICS.find((t) => t.value === v)?.[locale] || v

// Рубрика старого сайту (назва) → тема
export const topicFromWp = (name: string): Topic | null => TOPICS.find((t) => (t.wp as readonly string[]).includes(name.trim()))?.value || null
