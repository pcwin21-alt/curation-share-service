import { load } from 'cheerio'
import { Platform } from '@/types'

export interface ReadableContentResult {
  title: string
  excerpt: string
  text: string
  thumbnailUrl?: string
  siteName?: string
  success: boolean
}

const META_ONLY_STATIC_PLATFORMS = new Set<Platform>(['youtube', 'instagram', 'twitter', 'linkedin'])

const NOISE_PATTERNS = [
  'copyright',
  'all rights reserved',
  'privacy',
  'policy',
  'terms',
  'press',
  'advertise',
  'developers',
  'google llc',
  'ampitheatre parkway',
  'about',
  'contact us',
  'creators',
]

const CONTENT_SELECTORS = [
  'article',
  '[role="main"]',
  'main',
  '.article-body',
  '.article-content',
  '.post-content',
  '.entry-content',
  '.article',
  '.content',
  '#content',
  '.markdown-body',
]

const REMOVAL_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'svg',
  'canvas',
  'form',
  'input',
  'button',
  'header',
  'footer',
  'nav',
  'aside',
  '[aria-hidden="true"]',
  '.ad',
  '.ads',
  '.advertisement',
  '.share',
  '.social',
  '.comment',
  '.comments',
  '.related',
  '.recommend',
]

function countMatches(value: string, patterns: string[]) {
  const lower = value.toLowerCase()
  return patterns.reduce((count, pattern) => count + (lower.includes(pattern) ? 1 : 0), 0)
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

export function clampText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value
}

export function resolveUrl(baseUrl: string, value?: string | null) {
  if (!value) return undefined

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return undefined
  }
}

function extractBlocks(rootHtml: string) {
  const $root = load(rootHtml)
  const blocks: string[] = []
  const seen = new Set<string>()

  $root('h1, h2, h3, h4, p, li, blockquote, pre').each((_, element) => {
    const tagName = element.tagName.toLowerCase()
    const text = normalizeWhitespace($root(element).text())

    if (!text) return
    if (!/^h[1-4]$/.test(tagName) && text.length < 32) return
    if (seen.has(text)) return

    seen.add(text)
    blocks.push(text)
  })

  if (blocks.length > 0) {
    return blocks
  }

  const fallbackText = normalizeWhitespace($root.root().text())
  return fallbackText ? [fallbackText] : []
}

function scoreCandidate(html: string, paragraphCount: number, headingCount: number, linkTextLength: number) {
  const blocks = extractBlocks(html)
  const text = blocks.join('\n\n').trim()

  if (!text) {
    return { score: -1, text: '' }
  }

  const linkPenalty = Math.min(linkTextLength, 1200)
  const score = text.length + paragraphCount * 120 + headingCount * 80 - linkPenalty

  return {
    score,
    text: clampText(text, 12000),
  }
}

function looksLowQualityText(text: string, excerpt: string, platform?: Platform, mode: 'static' | 'rendered' = 'static') {
  const normalizedText = normalizeWhitespace(text)
  const normalizedExcerpt = normalizeWhitespace(excerpt)

  if (!normalizedText) return true
  if (mode === 'static' && platform && META_ONLY_STATIC_PLATFORMS.has(platform)) return true
  if (normalizedText.length < 220) return true

  const linkCount = normalizedText.match(/https?:\/\//g)?.length ?? 0
  const boilerplateHits = countMatches(normalizedText, NOISE_PATTERNS)
  const overlyLongTokens = normalizedText.split(/\s+/).filter((token) => token.length >= 36).length
  const mostlySameAsExcerpt =
    Boolean(normalizedExcerpt) &&
    normalizedText.includes(normalizedExcerpt) &&
    normalizedText.length <= normalizedExcerpt.length * 1.5

  return linkCount >= 2 || boilerplateHits >= 2 || overlyLongTokens >= 3 || mostlySameAsExcerpt
}

export function extractReadableContentFromHtml(
  html: string,
  baseUrl: string,
  platform?: Platform,
  mode: 'static' | 'rendered' = 'static',
): ReadableContentResult {
  if (!html.trim()) {
    return { title: '', excerpt: '', text: '', success: false }
  }

  const $ = load(html)
  $(REMOVAL_SELECTORS.join(', ')).remove()

  const metaTitle = normalizeWhitespace(
    $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').first().text() ||
      $('h1').first().text() ||
      '',
  )
  const metaDescription = normalizeWhitespace(
    $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      '',
  )
  const thumbnailUrl = resolveUrl(
    baseUrl,
    $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content'),
  )
  const siteName = normalizeWhitespace(
    $('meta[property="og:site_name"]').attr('content') || $('meta[name="application-name"]').attr('content') || '',
  )

  const candidates: Array<{ score: number; text: string }> = []

  for (const selector of CONTENT_SELECTORS) {
    $(selector).slice(0, 6).each((_, element) => {
      const node = $(element).clone()
      node.find(REMOVAL_SELECTORS.join(', ')).remove()

      const candidate = scoreCandidate(
        $.html(node),
        node.find('p').length,
        node.find('h1, h2, h3').length,
        normalizeWhitespace(node.find('a').text()).length,
      )

      if (candidate.score > 0 && candidate.text.length >= 180) {
        candidates.push(candidate)
      }
    })
  }

  const bodyNode = $('body').clone()
  bodyNode.find(REMOVAL_SELECTORS.join(', ')).remove()
  const bodyCandidate = scoreCandidate(
    $.html(bodyNode),
    bodyNode.find('p').length,
    bodyNode.find('h1, h2, h3').length,
    normalizeWhitespace(bodyNode.find('a').text()).length,
  )

  if (bodyCandidate.score > 0) {
    candidates.push(bodyCandidate)
  }

  const rawText = candidates.sort((a, b) => b.score - a.score)[0]?.text ?? ''
  const excerptSource = metaDescription || rawText
  const excerpt = excerptSource ? clampText(excerptSource, 280) : ''
  const text = looksLowQualityText(rawText, excerpt, platform, mode) ? '' : rawText

  return {
    title: metaTitle,
    excerpt,
    text,
    thumbnailUrl,
    siteName: siteName || undefined,
    success: Boolean(metaTitle || excerpt || text),
  }
}
