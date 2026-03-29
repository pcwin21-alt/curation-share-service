'use client'

import { auth } from '@/lib/firebase'

interface ApiFetchOptions extends RequestInit {
  requireAuth?: boolean
}

export class ApiAuthError extends Error {
  constructor(message = '로그인이 필요합니다.') {
    super(message)
    this.name = 'ApiAuthError'
  }
}

export async function apiFetch(input: RequestInfo | URL, init: ApiFetchOptions = {}) {
  const { requireAuth = false, headers, ...rest } = init
  const nextHeaders = new Headers(headers ?? {})

  if (requireAuth) {
    const user = auth.currentUser

    if (!user) {
      throw new ApiAuthError()
    }

    const token = await user.getIdToken()
    nextHeaders.set('Authorization', `Bearer ${token}`)
  }

  return fetch(input, {
    ...rest,
    headers: nextHeaders,
  })
}
