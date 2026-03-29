import crypto from 'crypto'

export function getWeekKey(date = new Date()) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export function createOpaqueToken() {
  return crypto.randomBytes(24).toString('hex')
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function createSubscriberId(folderId: string, email: string) {
  return crypto
    .createHash('sha256')
    .update(`${folderId}:${email.trim().toLowerCase()}`)
    .digest('hex')
    .slice(0, 24)
}

export function buildConfirmUrl(origin: string, folderId: string, subscriberId: string, token: string) {
  const url = new URL('/api/public-collections/confirm', origin)
  url.searchParams.set('folderId', folderId)
  url.searchParams.set('subscriberId', subscriberId)
  url.searchParams.set('token', token)
  return url.toString()
}

export function buildUnsubscribeUrl(origin: string, folderId: string, subscriberId: string, token: string) {
  const url = new URL('/api/public-collections/unsubscribe', origin)
  url.searchParams.set('folderId', folderId)
  url.searchParams.set('subscriberId', subscriberId)
  url.searchParams.set('token', token)
  return url.toString()
}

export function getDigestJobId(eventId: string, subscriberId: string) {
  return `digest_${eventId}_${subscriberId}`
}

export function getVerificationJobId(folderId: string, subscriberId: string) {
  return `verify_${folderId}_${subscriberId}`
}
