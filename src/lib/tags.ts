function normalizeTag(value: string) {
  return value.replace(/^#+/, '').replace(/\s+/g, ' ').trim()
}

export function sanitizeTags(tags: string[]) {
  const next: string[] = []
  const seen = new Set<string>()

  for (const rawTag of tags) {
    const normalized = normalizeTag(rawTag)

    if (!normalized) continue

    const key = normalized.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    next.push(normalized.slice(0, 24))

    if (next.length >= 8) {
      break
    }
  }

  return next
}

export function parseTagInput(value: string) {
  return sanitizeTags(
    value
      .split(/[,\n]/)
      .map((item) => item.trim()),
  )
}
