import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

// Перевірка коду (npm run lint). eslint-config-next 16 подає налаштування одразу в новому форматі ESLint —
// без перехідника FlatCompat (зі старим способом підключення ESLint падав ще до перевірки).
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
      // Правила для оптимізатора React Compiler (сайт його не використовує): у нашому коді вони позначають
      // звичайні безпечні прийоми (лічильник у циклі під час рендеру, читання localStorage після появи компонента,
      // «останнє значення» в ref) — лишаємо підказками, а не помилками
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
  {
    // міграції створює Payload за шаблоном (up/down з невикористаними payload, req) — не правимо їх
    files: ['src/migrations/**'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'src/payload-types.ts',
    'src/payload-generated-schema.ts',
    // згенеровані Payload файли адмінки
    'src/app/(payload)/admin/importMap.js',
  ]),
])

export default eslintConfig
