// Збірка сайту (npm run build).
// Спершу — швидким збирачем Turbopack. Якщо він падає (напр. на сервері Turbopack «панікував» на українських
// літерах, коли намагався показати фрагмент коду: «end byte index … is not a char boundary»), збираємо
// запасним збирачем webpack: він або збере сайт, або покаже справжню помилку звичайним текстом.
import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const next = require.resolve('next/dist/bin/next')
const distDir = process.env.NEXT_DIST_DIR || '.next'
const env = {
  ...process.env,
  NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --no-deprecation --max-old-space-size=8000`.trim(),
}

const build = (extra = []) => spawnSync(process.execPath, [next, 'build', ...extra], { stdio: 'inherit', env }).status

let code = build()
if (code !== 0) {
  console.log('\n⚠ Збірка Turbopack не вдалася — збираю запасним способом (webpack)…\n')
  rmSync(distDir, { recursive: true, force: true })
  code = build(['--webpack'])
}
process.exit(code ?? 1)
