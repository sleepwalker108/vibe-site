// Запуск сайту для «Запустити сайт.bat»:
// 1) застосовує нові міграції бази, 2) запускає сайт, 3) відкриває адмінку в браузері.
import { exec, spawn, spawnSync } from 'node:child_process'
import net from 'node:net'

const PORT = 3000
const say = (s = '') => console.log('  ' + s)

const isPortBusy = () =>
  new Promise((resolve) => {
    const sock = net.connect(PORT, '127.0.0.1')
    sock.once('connect', () => (sock.destroy(), resolve(true)))
    sock.once('error', () => resolve(false))
  })

console.log()
say('Сайт НАРТУ')
say('Сайт:     http://localhost:3000')
say('Адмінка:  http://localhost:3000/admin')
say('Щоб зупинити сайт — закрийте це вікно.')
console.log()

if (await isPortBusy()) {
  say('Сайт уже запущений в іншому вікні. Відкриваю адмінку.')
  exec(`start "" http://localhost:${PORT}/admin`)
  process.exit(0)
}

say('Оновлюю структуру бази (якщо є зміни)...')
const migrate = spawnSync('npm run payload -- migrate', { stdio: 'inherit', shell: true })
if (migrate.status !== 0) {
  say('Не вдалося оновити базу. Сайт не запущено — надішліть цей текст розробнику.')
  process.exit(1)
}

say('Запускаю сайт...')
const dev = spawn('npm run dev', { stdio: 'inherit', shell: true })
dev.on('exit', (code) => process.exit(code ?? 0))

// Відкриваємо адмінку, щойно сайт почне відповідати
const started = Date.now()
const timer = setInterval(async () => {
  if (await isPortBusy()) {
    clearInterval(timer)
    fetch(`http://localhost:${PORT}/`).catch(() => {}) // «прогріваємо» головну сторінку
    exec(`start "" http://localhost:${PORT}/admin`)
  } else if (Date.now() - started > 120_000) {
    clearInterval(timer)
  }
}, 1000)
