// One-off script — generates pwa-icon-192.png and pwa-icon-512.png
// Run: node scripts/generate-pwa-icons.mjs
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const logoPath = join(__dirname, '../public/images/brand/logo-white.png')
const outDir = join(__dirname, '../public/images/brand')

async function generateIcon(size) {
  const padding = Math.round(size * 0.15)
  const logoSize = size - padding * 2

  const logoResized = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 13, g: 148, b: 136, alpha: 0 } })
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 13, g: 148, b: 136, alpha: 255 }, // #0D9488 teal
    },
  })
    .composite([{ input: logoResized, gravity: 'center' }])
    .png()
    .toFile(join(outDir, `pwa-icon-${size}.png`))

  console.log(`Generated pwa-icon-${size}.png`)
}

await generateIcon(192)
await generateIcon(512)
console.log('Done.')
