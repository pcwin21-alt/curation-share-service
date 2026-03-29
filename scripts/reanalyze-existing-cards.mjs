import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, getApps } from 'firebase/app'
import { collection, doc, getDocs, getFirestore, updateDoc } from 'firebase/firestore'
import ogs from 'open-graph-scraper'
import { load } from 'cheerio'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

loadEnv(path.join(projectRoot, '.env.local'))

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

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

const META_ONLY_PLATFORMS = new Set(['youtube', 'instagram', 'twitter', 'linkedin'])
const FETCH_NOISE_PATTERNS = [
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

const SUMMARY_NOISE_PATTERNS = [
  /copyright/i,
  /all rights reserved/i,
  /privacy/i,
  /policy/i,
  /terms/i,
  /press/i,
  /advertise/i,
  /developers/i,
  /google llc/i,
  /ampitheatre parkway/i,
  /contact us/i,
  /creators/i,
]

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const dividerIndex = trimmed.indexOf('=')
    if (dividerIndex === -1) continue

    const key = trimmed.slice(0, dividerIndex).trim()
    let value = trimmed.slice(dividerIndex + 1).trim()

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

function normalizeWhitespace(value = '') {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function clampText(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value
}

function detectPlatform(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube'
    if (hostname.includes('brunch.co.kr')) return 'brunch'
    if (hostname.includes('facebook.com') || hostname.includes('fb.com')) return 'facebook'
    if (hostname.includes('linkedin.com')) return 'linkedin'
    if (hostname.includes('instagram.com')) return 'instagram'
    if (hostname.includes('blog.naver.com') || hostname.includes('naver.com')) return 'naver'
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter'
    return 'other'
  } catch {
    return 'other'
  }
}

function resolveUrl(baseUrl, value) {
  if (!value) return undefined

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return undefined
  }
}

function uniqueStrings(values) {
  const seen = new Set()
  const next = []

  for (const value of values) {
    const normalized = normalizeWhitespace(value)
    if (!normalized || seen.has(normalized)) continue

    seen.add(normalized)
    next.push(normalized)
  }

  return next
}

function isUsefulLine(value) {
  const normalized = normalizeWhitespace(value)

  if (!normalized) return false
  if (normalized.length < 24) return false
  if (SUMMARY_NOISE_PATTERNS.some((pattern) => pattern.test(normalized))) return false
  if ((normalized.match(/https?:\/\//g)?.length ?? 0) >= 2) return false
  if (normalized.split(/\s+/).filter((token) => token.length >= 36).length >= 3) return false

  return true
}

function splitSentences(text) {
  return uniqueStrings(
    text
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+|\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length >= 28)
      .filter(isUsefulLine),
  )
}

function extractParagraphFallback(text) {
  return uniqueStrings(
    text
      .split(/\n{2,}/)
      .map((line) => normalizeWhitespace(line))
      .filter((line) => line.length >= 36)
      .filter(isUsefulLine)
      .map((line) => clampText(line, 140)),
  )
}

function deriveTags(title, platform) {
  const segments = uniqueStrings(
    title
      .split(/[|\-:()\/]/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2 && item.length <= 18),
  ).slice(0, 4)

  if (segments.length > 0) {
    return segments
  }

  if (platform && platform !== 'other' && platform !== 'text') {
    return [platform]
  }

  return []
}

function deriveHeuristicAnalysis({ title, description = '', text = '', platform }) {
  const normalizedDescription = normalizeWhitespace(description)
  const normalizedText = normalizeWhitespace(text)
  const sentences = uniqueStrings([
    ...splitSentences(normalizedDescription),
    ...splitSentences(normalizedText),
  ])

  let summary = sentences.slice(0, 3).map((line) => clampText(line, 140))

  if (summary.length === 0) {
    summary = extractParagraphFallback(normalizedText || normalizedDescription).slice(0, 3)
  }

  if (summary.length === 0 && normalizedDescription) {
    summary = [clampText(normalizedDescription, 140)]
  }

  if (summary.length === 0 && platform === 'youtube') {
    summary = ['유튜브 링크입니다. 자세한 내용은 원문에서 확인해 보세요.']
  }

  if (summary.length === 0 && title) {
    summary = [clampText(title, 120)]
  }

  return {
    summary,
    keyInsight: summary[0] || clampText(title, 120),
    tags: deriveTags(title, platform),
  }
}

async function fetchMeta(url) {
  try {
    const { result, error } = await ogs({ url, timeout: 5000 })

    if (error || !result.success) {
      return { title: '', description: '', thumbnailUrl: undefined }
    }

    return {
      title: result.ogTitle ?? result.dcTitle ?? '',
      description: result.ogDescription ?? '',
      thumbnailUrl: result.ogImage?.[0]?.url,
    }
  } catch {
    return { title: '', description: '', thumbnailUrl: undefined }
  }
}

function extractBlocks(rootHtml) {
  const $root = load(rootHtml)
  const blocks = []
  const seen = new Set()

  $root('h1, h2, h3, h4, p, li, blockquote, pre').each((_, element) => {
    const text = normalizeWhitespace($root(element).text())

    if (!text) return
    if (element.tagName !== 'h1' && element.tagName !== 'h2' && element.tagName !== 'h3' && element.tagName !== 'h4' && text.length < 32) return
    if (seen.has(text)) return

    seen.add(text)
    blocks.push(text)
  })

  if (blocks.length > 0) return blocks

  const fallbackText = normalizeWhitespace($root.root().text())
  return fallbackText ? [fallbackText] : []
}

function scoreCandidate(html, paragraphCount, headingCount, linkTextLength) {
  const blocks = extractBlocks(html)
  const text = blocks.join('\n\n').trim()

  if (!text) {
    return { score: -1, text: '' }
  }

  const score = text.length + paragraphCount * 120 + headingCount * 80 - Math.min(linkTextLength, 1200)

  return {
    score,
    text: clampText(text, 12000),
  }
}

function countMatches(value, patterns) {
  const lower = value.toLowerCase()
  return patterns.reduce((count, pattern) => count + (lower.includes(pattern) ? 1 : 0), 0)
}

function looksLowQualityText(text, excerpt, platform) {
  const normalizedText = normalizeWhitespace(text)
  const normalizedExcerpt = normalizeWhitespace(excerpt)

  if (!normalizedText) return true
  if (META_ONLY_PLATFORMS.has(platform)) return true
  if (normalizedText.length < 220) return true

  const linkCount = normalizedText.match(/https?:\/\//g)?.length ?? 0
  const boilerplateHits = countMatches(normalizedText, FETCH_NOISE_PATTERNS)
  const overlyLongTokens = normalizedText.split(/\s+/).filter((token) => token.length >= 36).length
  const mostlySameAsExcerpt =
    Boolean(normalizedExcerpt) &&
    normalizedText.includes(normalizedExcerpt) &&
    normalizedText.length <= normalizedExcerpt.length * 1.5

  return linkCount >= 2 || boilerplateHits >= 2 || overlyLongTokens >= 3 || mostlySameAsExcerpt
}

async function fetchReadableContent(url, platform) {
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
      return { title: '', excerpt: '', text: '', thumbnailUrl: undefined }
    }

    const html = await response.text()
    if (!html.trim()) {
      return { title: '', excerpt: '', text: '', thumbnailUrl: undefined }
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
      url,
      $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content'),
    )

    const candidates = []

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
    const excerpt = clampText(metaDescription || rawText, 280)
    const text = looksLowQualityText(rawText, excerpt, platform) ? '' : rawText

    return {
      title: metaTitle,
      excerpt,
      text,
      thumbnailUrl,
    }
  } catch {
    return { title: '', excerpt: '', text: '', thumbnailUrl: undefined }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function reanalyzeCard(cardSnapshot) {
  const card = cardSnapshot.data()
  const cardRef = doc(db, 'cards', cardSnapshot.id)
  const platform = card.url ? detectPlatform(card.url) : card.platform ?? 'text'

  await updateDoc(cardRef, { status: 'analyzing', platform })

  let title = ''
  let description = ''
  let thumbnailUrl
  let extractedText = ''

  if (card.url) {
    const [meta, readable] = await Promise.all([
      fetchMeta(card.url),
      fetchReadableContent(card.url, platform),
    ])

    title = meta.title || readable.title || card.url
    description = readable.excerpt || meta.description || ''
    thumbnailUrl = meta.thumbnailUrl || readable.thumbnailUrl
    extractedText = readable.text || description
  } else {
    const rawText = typeof card.rawText === 'string' ? card.rawText : ''
    title = rawText ? clampText(rawText, 80) : card.title || '텍스트 콘텐츠'
    description = rawText ? clampText(rawText, 280) : ''
    extractedText = rawText.trim()
  }

  const heuristic = deriveHeuristicAnalysis({
    title,
    description,
    text: extractedText,
    platform,
  })

  const nextUpdate = {
    title,
    platform,
    summary: heuristic.summary,
    keyInsight: heuristic.keyInsight,
    tags: heuristic.tags,
    status: 'done',
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    ...(extractedText ? { rawText: extractedText } : {}),
  }

  await updateDoc(cardRef, nextUpdate)
}

async function main() {
  const snapshot = await getDocs(collection(db, 'cards'))
  const cards = snapshot.docs

  console.log(`[reanalyze-existing-cards] found ${cards.length} cards`)

  let successCount = 0
  let failureCount = 0

  for (const cardSnapshot of cards) {
    try {
      await reanalyzeCard(cardSnapshot)
      successCount += 1
      console.log(`[reanalyze-existing-cards] updated ${cardSnapshot.id}`)
    } catch (error) {
      failureCount += 1
      console.error(`[reanalyze-existing-cards] failed ${cardSnapshot.id}`, error)

      await updateDoc(doc(db, 'cards', cardSnapshot.id), { status: 'error' }).catch(() => {})
    }
  }

  console.log(
    `[reanalyze-existing-cards] completed. success=${successCount} failure=${failureCount}`,
  )
}

main().catch((error) => {
  console.error('[reanalyze-existing-cards] fatal error', error)
  process.exitCode = 1
})
