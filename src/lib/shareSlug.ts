export const SHARE_SLUG_MIN_LENGTH = 3
export const SHARE_SLUG_MAX_LENGTH = 50

const SHARE_SLUG_PATTERN = /^[a-z0-9가-힣]+(?:-[a-z0-9가-힣]+)*$/

export function normalizeShareSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SHARE_SLUG_MAX_LENGTH)
}

export function isValidShareSlug(value: string) {
  return (
    value.length >= SHARE_SLUG_MIN_LENGTH &&
    value.length <= SHARE_SLUG_MAX_LENGTH &&
    SHARE_SLUG_PATTERN.test(value)
  )
}

export function buildSharePath(shareSlug: string) {
  return `/c/${shareSlug}`
}
