// Безпечна адреса посилання з адмінки (меню, ресурси, соцмережі, текст сторінок).
// Дозволено: http(s), пошта, телефон, адреси самого сайту (/…, #…, ?…). Будь-яка інша схема
// (javascript:, data:, vbscript: …) замінюється на «#» — щоб у посилання не можна було вписати скрипт.
// React і сам блокує javascript:, це — другий рубіж захисту.
export const safeHref = (raw?: string | null): string => {
  const url = (raw || '').trim()
  if (!url) return '#'
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url
  if (/^\/[/\\]/.test(url)) return `https://${url.replace(/^\/[/\\]+/, '')}` // «//сайт» — як звичайне зовнішнє посилання
  if (/^[/#?]/.test(url)) return url
  // прибираємо невидимі й керівні символи, якими маскують «java\tscript:»
  if (/^[a-z][a-z0-9+.-]*:/i.test(url.replace(/[\u0000- \u007f-\u009f​-‏﻿]/g, ''))) return '#'
  return url // відносна адреса без схеми
}
