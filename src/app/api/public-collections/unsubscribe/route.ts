import { NextRequest, NextResponse } from 'next/server'
import { doc, runTransaction } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { buildSharePath } from '@/lib/shareSlug'
import { hashToken } from '@/lib/subscriptions'
import { CurationFolder, EmailSubscriber } from '@/types'

async function unsubscribe(
  folderId: string,
  subscriberId: string,
  token: string,
): Promise<{ shareSlug: string; status: 'unsubscribed' | 'invalid' }> {
  const folderRef = doc(db, 'folders', folderId)
  const subscriberRef = doc(db, 'folders', folderId, 'emailSubscribers', subscriberId)

  let shareSlug = ''
  let status: 'unsubscribed' | 'invalid' = 'invalid'

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

    if (subscriber.unsubscribeTokenHash !== hashToken(token)) {
      status = 'invalid'
      return
    }

    if (subscriber.status === 'unsubscribed') {
      status = 'unsubscribed'
      return
    }

    transaction.update(subscriberRef, {
      status: 'unsubscribed',
      unsubscribedAt: Date.now(),
      updatedAt: Date.now(),
    })

    if (subscriber.status === 'confirmed') {
      transaction.update(folderRef, {
        emailSubscriberCount: Math.max((folder.emailSubscriberCount ?? 1) - 1, 0),
        updatedAt: Date.now(),
      })
    }

    status = 'unsubscribed'
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
  const result = await unsubscribe(folderId, subscriberId, token)
  const redirectPath =
    result.status !== 'invalid' && result.shareSlug
      ? `${buildSharePath(result.shareSlug)}?subscription=unsubscribed`
      : '/'

  return NextResponse.redirect(new URL(redirectPath, req.nextUrl.origin))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const folderId = String(body.folderId ?? '')
  const subscriberId = String(body.subscriberId ?? '')
  const token = String(body.token ?? '')
  const result = await unsubscribe(folderId, subscriberId, token)

  if (result.status !== 'unsubscribed') {
    return NextResponse.json({ error: '구독 해지 링크가 올바르지 않습니다.' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, ...result })
}
