import { NextRequest, NextResponse } from 'next/server'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { readBearerToken, verifyFirebaseIdToken } from '@/lib/serverAuth'

export async function PATCH(req: NextRequest) {
  const token = readBearerToken(req.headers.get('authorization'))
  const user = await verifyFirebaseIdToken(token)

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = await req.json()
  const nickname = String(body.nickname ?? '').trim()

  if (!nickname) {
    return NextResponse.json({ error: '닉네임을 입력해 주세요.' }, { status: 400 })
  }

  await updateDoc(doc(db, 'users', user.uid), {
    nickname,
  })

  return NextResponse.json({ ok: true, nickname })
}
