export interface VerifiedUser {
  uid: string
  email?: string
  displayName?: string
}

export function getUserDisplayName(user: VerifiedUser) {
  return user.displayName?.trim() || user.email?.split('@')[0] || '사용자'
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedUser | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

  if (!apiKey || !idToken) {
    return null
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      cache: 'no-store',
    },
  )

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as {
    users?: Array<{ localId?: string; email?: string; displayName?: string }>
  }

  const user = data.users?.[0]
  if (!user?.localId) {
    return null
  }

  return {
    uid: user.localId,
    email: user.email,
    displayName: user.displayName,
  }
}

export function readBearerToken(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) return ''
  return authHeader.slice('Bearer '.length).trim()
}
