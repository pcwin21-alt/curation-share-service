import { Platform } from '@/types'
import { ReadableContentResult, extractReadableContentFromHtml } from '@/lib/contentExtraction'

export type { ReadableContentResult } from '@/lib/contentExtraction'

export async function fetchReadableContent(url: string, platform?: Platform): Promise<ReadableContentResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    })

    if (!response.ok) {
      return { title: '', excerpt: '', text: '', success: false }
    }

    const html = await response.text()
    return extractReadableContentFromHtml(html, url, platform, 'static')
  } catch {
    return { title: '', excerpt: '', text: '', success: false }
  } finally {
    clearTimeout(timeoutId)
  }
}
