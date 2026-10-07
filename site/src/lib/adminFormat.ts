// Форматування чисел і часу для службових розділів адмінки (резервні копії, стан сервера)
export const size = (b: number) =>
  b >= 1e9 ? `${(b / 1e9).toFixed(1)} ГБ` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} МБ` : `${Math.max(b ? 1 : 0, Math.round(b / 1e3))} КБ`

// 1 день, 2 дні, 5 днів
export const plural = (n: number, [one, few, many]: [string, string, string]) => {
  const m10 = n % 10
  const m100 = n % 100
  return `${n} ${m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many}`
}

// «3 дні 4 год», «5 год 12 хв», «7 хв»
export const duration = (sec: number) => {
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (d) return `${plural(d, ['день', 'дні', 'днів'])}${h ? ` ${h} год` : ''}`
  if (h) return `${h} год${m ? ` ${m} хв` : ''}`
  return `${Math.max(1, m)} хв`
}

// Дата й час за Києвом: «7 жовтня 2026, 11:15»
export const kyivTime = (iso: string | Date) =>
  new Date(iso).toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
