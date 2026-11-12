// Створює public/img/ukraine-regions-v1.svg із контурів у src/data/ukraineMap.ts.
// Контури областей (≈80 КБ) лежать окремим файлом, який браузер кешує, — а не вбудовуються в HTML головної
// (див. components/TerritoriesSection.tsx: <use href="/img/ukraine-regions-v1.svg#UA-…">).
// Запуск після зміни контурів:  npx tsx src/scripts/gen-ukraine-map-svg.ts   (і збільшити v1 → v2 у назві)
import fs from 'fs'
import path from 'path'
import { UA_MAP_VIEWBOX, UA_REGIONS } from '../data/ukraineMap'

const out = path.resolve(process.cwd(), 'public/img/ukraine-regions-v1.svg')
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${UA_MAP_VIEWBOX}">` +
  '<!-- Кордони областей: geoBoundaries / © учасники OpenStreetMap, ODbL 1.0 -->' +
  '<defs>' +
  UA_REGIONS.map((r) => `<path id="${r.id}" d="${r.d}"/>`).join('') +
  '</defs></svg>'
fs.writeFileSync(out, svg)
console.log(`${out}: ${UA_REGIONS.length} областей, ${(svg.length / 1024).toFixed(1)} КБ`)
