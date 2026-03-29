import { Platform } from '@/types'
import { ReadableContentResult, extractReadableContentFromHtml } from '@/lib/contentExtraction'

export async function fetchRenderedContent(url: string, platform?: Platform): Promise<ReadableContentResult> {
  let browser: Awaited<ReturnType<(typeof import('playwright'))['chromium']['launch']>> | undefined

  try {
    const { chromium } = await import('playwright')

    browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
    })

    const page = await browser.newPage({
      viewport: { width: 1440, height: 1024 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      locale: 'ko-KR',
    })

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    })

    await page.waitForTimeout(1200)
    await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {})

    const html = await page.content()
    return extractReadableContentFromHtml(html, page.url(), platform, 'rendered')
  } catch {
    return { title: '', excerpt: '', text: '', success: false }
  } finally {
    await browser?.close().catch(() => {})
  }
}
