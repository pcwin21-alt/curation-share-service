import { Platform } from '@/types'

export function detectPlatform(url: string): Platform {
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

export function isValidUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}
