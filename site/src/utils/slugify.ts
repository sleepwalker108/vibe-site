const map: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i',
  ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ы: 'y', э: 'e', ё: 'e', ъ: '',
}

// Українська транслітерація (за постановою КМУ №55), спрощено для адрес сторінок
export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/['’ʼ`"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    // не довше 90 знаків — і по межі слова, а не посередині
    .replace(/^(.{0,90})(-.*)?$/, (_, head: string, rest?: string) => (rest ? head.replace(/-[^-]*$/, '') || head : head))
    .slice(0, 90)
