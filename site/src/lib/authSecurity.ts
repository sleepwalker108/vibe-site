// Захист входу в адмінку: правила пароля й однаковий час відповіді.
import { APIError, type CollectionAfterErrorHook, type CollectionBeforeOperationHook } from 'payload'

export const MIN_PASSWORD = 10

// Найпоширеніші паролі й «клавіатурні доріжки» — їх підбирають першими
const COMMON = [
  'password', 'пароль', 'qwerty', 'йцукен', 'admin', 'nartu', 'letmein', 'welcome', 'ukraine', 'україна',
  '123456', '1234567890', '0987654321', '111111', 'abc123', 'iloveyou', 'asdfgh', 'zxcvbn',
]

// Повертає текст помилки або null, якщо пароль годиться
export const passwordProblem = (password: string, email?: string): string | null => {
  const p = password.toLocaleLowerCase('uk')
  if (password.length < MIN_PASSWORD) return `Пароль має містити щонайменше ${MIN_PASSWORD} символів.`
  if (/^(.)\1+$/.test(password)) return 'Пароль не може складатися з одного символу, що повторюється.'
  if (/^\d+$/.test(password)) return 'Пароль не може складатися лише з цифр — додайте літери.'
  if (COMMON.some((c) => p.includes(c))) return 'Пароль надто простий (містить поширене слово чи послідовність). Оберіть інший.'
  const login = (email || '').split('@')[0].toLocaleLowerCase('uk')
  if (login.length >= 4 && p.includes(login)) return 'Пароль не повинен містити вашу адресу пошти.'
  return null
}

// Кожна невдала спроба входу відповідає за той самий час — незалежно від того, чи є така пошта,
// чи неправильний пароль, чи акаунт заблоковано. Так за часом відповіді нічого не вгадати,
// а підбір паролів сповільнюється. Успішний вхід не затримується.
const FAILED_LOGIN_MS = 400
const LOGIN_START = 'loginStartedAt'

// Одне повідомлення для «неправильний пароль», «немає такої пошти» і «акаунт заблоковано»:
// інакше за різними відповідями можна дізнатися, які email-и є в адмінці
export const LOGIN_FAILED = 'Невірна адреса пошти або пароль. Після 5 невдалих спроб вхід тимчасово блокується на 15 хвилин.'

export const authAfterError: CollectionAfterErrorHook = async ({ error, req }) => {
  const name = error?.constructor?.name || error?.name
  if (name !== 'AuthenticationError' && name !== 'LockedAuth') return
  const started = Number(req.context?.[LOGIN_START]) || Date.now()
  const wait = FAILED_LOGIN_MS - (Date.now() - started)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  return { response: { errors: [{ message: LOGIN_FAILED }] }, status: 401 }
}

export const authBeforeOperation: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
  // у різних операцій різні аргументи — беремо лише те, що потрібно
  const a = args as { data?: { email?: string; password?: string }; id?: string | number }
  const data = a?.data

  if (operation === 'login') req.context[LOGIN_START] = Date.now()

  // Новий пароль (створення користувача, зміна, відновлення) — має бути надійним
  if ((operation === 'create' || operation === 'update' || operation === 'resetPassword') && typeof data?.password === 'string' && data.password) {
    let email = data.email
    if (!email && operation === 'update' && a?.id) {
      email = ((await req.payload.findByID({ collection: 'users', id: a.id, depth: 0, overrideAccess: true, req }).catch(() => null)) as { email?: string } | null)?.email
    }
    const problem = passwordProblem(data.password, email)
    if (problem) throw new APIError(problem, 400, null, true)
  }
  return args
}
