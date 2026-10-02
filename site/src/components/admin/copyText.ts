// Копіювання тексту в буфер обміну (із запасним способом для старих браузерів)
export const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

// Повна адреса файлу (з доменом сайту) — щоб посилання працювало, куди б його не вставили
export const absoluteUrl = (url?: string | null) => (url ? new URL(url, window.location.origin).href : '')
