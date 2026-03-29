import { NextRequest, NextResponse } from 'next/server'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { readBearerToken, verifyFirebaseIdToken } from '@/lib/serverAuth'

export async function POST(req: NextRequest) {
  const token = readBearerToken(req.headers.get('authorization'))
  const user = await verifyFirebaseIdToken(token)

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = await req.json()
  const notificationId = String(body.notificationId ?? '').trim()

  if (!notificationId) {
    return NextResponse.json({ error: 'notificationId가 필요합니다.' }, { status: 400 })
  }

  await updateDoc(doc(db, 'users', user.uid, 'notifications', notificationId), {
    unread: false,
    lastReadAt: Date.now(),
  })

  return NextResponse.json({ ok: true })
}
