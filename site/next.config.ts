import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // окрема папка збірки (напр. для перевірки збірки, поки працює режим розробки)
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // не повідомляємо, на чому зроблено сайт (заголовок X-Powered-By)
  poweredByHeader: false,
  // Захисні заголовки для всіх сторінок і файлів
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // браузер не «вгадує» тип файлу (напр. не виконає завантажений файл як скрипт)
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // сайт і адмінку не можна вбудувати в чужу сторінку (захист від «клікджекінгу»)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
          // іншим сайтам передаємо лише домен, без повної адреси сторінки
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // сайту не потрібні камера, мікрофон, геолокація
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
        ],
      },
    ]
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
