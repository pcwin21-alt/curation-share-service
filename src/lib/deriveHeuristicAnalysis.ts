interface HeuristicAnalysisInput {
  title: string
  description?: string
  text?: string
  platform?: string
}

interface HeuristicAnalysisResult {
  summary: string[]
  keyInsight: string
  tags: string[]
}

const NOISE_PATTERNS = [
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

const YOUTUBE_NOISE_PATTERNS = [
  /youtube\.com/i,
  /shorts/i,
  /playlist/i,
  /댓글/,
  /채널/,
  /동영상 정보/,
  /설명/,
  /스크립트/,
  /리믹스/,
]

function normalizeWhitespace(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function clampText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>()
  const next: string[] = []

  for (const value of values) {
    const normalized = normalizeWhitespace(value)

    if (!normalized || seen.has(normalized)) continue

    seen.add(normalized)
    next.push(normalized)
  }

  return next
}

function isUsefulLine(value: string, platform?: string) {
  const normalized = normalizeWhitespace(value)

  if (!normalized) return false
  if (normalized.length < 24) return false
  if (NOISE_PATTERNS.some((pattern) => pattern.test(normalized))) return false
  if ((normalized.match(/https?:\/\//g)?.length ?? 0) >= 1 && platform === 'youtube') return false
  if ((normalized.match(/https?:\/\//g)?.length ?? 0) >= 2) return false
  if (normalized.split(/\s+/).filter((token) => token.length >= 36).length >= 3) return false
  if (platform === 'youtube' && YOUTUBE_NOISE_PATTERNS.some((pattern) => pattern.test(normalized))) return false

  return true
}

function splitSentences(text: string, platform?: string) {
  return uniqueStrings(
    text
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+|\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length >= 28)
      .filter((line) => isUsefulLine(line, platform)),
  )
}

function extractParagraphFallback(text: string, platform?: string) {
  return uniqueStrings(
    text
      .split(/\n{2,}/)
      .map((line) => normalizeWhitespace(line))
      .filter((line) => line.length >= 36)
      .filter((line) => isUsefulLine(line, platform))
      .map((line) => clampText(line, 140)),
  )
}

function deriveTags(title: string, platform?: string) {
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

export function deriveHeuristicAnalysis({
  title,
  description = '',
  text = '',
  platform,
}: HeuristicAnalysisInput): HeuristicAnalysisResult {
  const normalizedDescription = normalizeWhitespace(description)
  const normalizedText = normalizeWhitespace(text)
  const sentences = uniqueStrings([
    ...splitSentences(normalizedDescription, platform),
    ...splitSentences(normalizedText, platform),
  ])

  let summary = sentences.slice(0, 3).map((line) => clampText(line, 140))

  if (summary.length === 0) {
    summary = extractParagraphFallback(normalizedText || normalizedDescription, platform).slice(0, 3)
  }

  if (summary.length === 0 && normalizedDescription && isUsefulLine(normalizedDescription, platform)) {
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
