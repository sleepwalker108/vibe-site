import type { Instrumentation } from 'next'

// Під час запуску сайту: фонова перевірка Google-таблиці зі статистикою гарячих ліній (раз на 15 хвилин)
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { startSheetSync } = await import('./lib/sheetSync')
  startSheetSync()
}

// Кожну помилку сервера записуємо в журнал — його видно в адмінці, розділ «Стан сервера»
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const digest = typeof err === 'object' && err !== null && 'digest' in err ? String((err as { digest: unknown }).digest) : undefined
  // «сторінку не знайдено» й переадресації — це не помилки
  if (digest && /^NEXT_(HTTP_ERROR_FALLBACK|REDIRECT|NOT_FOUND)/.test(digest)) return
  const { logError } = await import('./lib/errorLog')
  logError({
    at: new Date().toISOString(),
    path: request.path,
    method: request.method,
    message: (err instanceof Error ? err.message : String(err)).slice(0, 500),
    digest,
    kind: context.routeType,
  })
}
