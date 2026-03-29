import { NextRequest, NextResponse } from 'next/server'
import { doc, runTransaction } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { buildSharePath } from '@/lib/shareSlug'
import { hashToken } from '@/lib/subscriptions'
import { CurationFolder, EmailSubscriber } from '@/types'

async function confirmSubscription(folderId: string, subscriberId: string, token: string) {
  const folderRef = doc(db, 'folders', folderId)
  const subscriberRef = doc(db, 'folders', folderId, 'emailSubscribers', subscriberId)

  let shareSlug = ''
  let status: 'confirmed' | 'invalid' | 'already-confirmed' = 'invalid'

  await runTransaction(db, async (transaction) => {
    const [folderSnapshot, subscriberSnapshot] = await Promise.all([
      transaction.get(folderRef),
      transaction.get(subscriberRef),
    ])

    if (!folderSnapshot.exists() || !subscriberSnapshot.exists()) {
      return
    }

    const folder = folderSnapshot.data() as CurationFolder
    const subscriber = subscriberSnapshot.data() as EmailSubscriber
    shareSlug = folder.shareSlug ?? ''

    if (subscriber.status === 'confirmed') {
      status = 'already-confirmed'
      return
    }

    if (subscriber.verifyTokenHash !== hashToken(token)) {
      status = 'invalid'
      return
    }

    transaction.update(subscriberRef, {
      status: 'confirmed',
      confirmedAt: Date.now(),
      updatedAt: Date.now(),
      verifyTokenHash: null,
    })

    transaction.update(folderRef, {
      emailSubscriberCount: (folder.emailSubscriberCount ?? 0) + 1,
      updatedAt: Date.now(),
    })

    status = 'confirmed'
  })

  return { shareSlug, status }
}

function readParams(req: NextRequest) {
  const url = req.nextUrl
  return {
    folderId: url.searchParams.get('folderId') ?? '',
    subscriberId: url.searchParams.get('subscriberId') ?? '',
    token: url.searchParams.get('token') ?? '',
  }
}

export async function GET(req: NextRequest) {
  const { folderId, subscriberId, token } = readParams(req)
  const result = await confirmSubscription(folderId, subscriberId, token)
  const redirectPath =
    result.shareSlug && result.status !== 'invalid'
      ? `${buildSharePath(result.shareSlug)}?subscription=${result.status}`
      : '/'

  return NextResponse.redirect(new URL(redirectPath, req.nextUrl.origin))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const folderId = String(body.folderId ?? '')
  const subscriberId = String(body.subscriberId ?? '')
  const token = String(body.token ?? '')
  const result = await confirmSubscription(folderId, subscriberId, token)

  if (result.status === 'invalid') {
    return NextResponse.json({ error: '확인 링크가 올바르지 않습니다.' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, ...result })
}
