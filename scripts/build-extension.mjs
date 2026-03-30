import { build } from 'esbuild'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const srcDir = path.join(root, 'extension', 'src')
const distDir = path.join(root, 'extension', 'dist')
const appOrigin =
  process.env.CURATIO_APP_ORIGIN ||
  'https://curation-share-service-pcwin21-9855s-projects.vercel.app'

await rm(distDir, { recursive: true, force: true })
await mkdir(distDir, { recursive: true })

const entryPoints = {
  popup: path.join(srcDir, 'popup.ts'),
  background: path.join(srcDir, 'background.ts'),
  offscreen: path.join(srcDir, 'offscreen.ts'),
}

await build({
  entryPoints,
  outdir: distDir,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'chrome120',
  sourcemap: false,
  define: {
    'process.env.CURATIO_APP_ORIGIN': JSON.stringify(appOrigin),
  },
})

await cp(path.join(srcDir, 'popup.html'), path.join(distDir, 'popup.html'))
await cp(path.join(srcDir, 'offscreen.html'), path.join(distDir, 'offscreen.html'))
await cp(path.join(srcDir, 'styles.css'), path.join(distDir, 'styles.css'))

const manifestTemplate = await readFile(path.join(srcDir, 'manifest.template.json'), 'utf8')
await writeFile(
  path.join(distDir, 'manifest.json'),
  manifestTemplate.replaceAll('__APP_ORIGIN__', appOrigin),
  'utf8',
)

console.log(`[build:extension] built extension to ${distDir}`)
