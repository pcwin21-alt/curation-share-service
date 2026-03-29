import { NextRequest, NextResponse } from 'next/server'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { buildVerificationEmail, sendEmailNow } from '@/lib/email'
import {
  buildConfirmUrl,
  createOpaqueToken,
  createSubscriberId,
  getVerificationJobId,
  hashToken,
} from '@/lib/subscriptions'
import { CurationFolder, EmailSubscriber } from '@/types'

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const folderId = String(body.folderId ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const userUid = String(body.userUid ?? '').trim() || null

  if (!folderId || !isValidEmail(email)) {
    return NextResponse.json({ error: '올바른 이메일 주소를 입력해 주세요.' }, { status: 400 })
  }

  const folderRef = doc(db, 'folders', folderId)
  const folderSnapshot = await getDoc(folderRef)

  if (!folderSnapshot.exists()) {
    return NextResponse.json({ error: '컬렉션을 찾을 수 없습니다.' }, { status: 404 })
  }

  const folder = folderSnapshot.data() as CurationFolder

  if (!folder.isPublic) {
    return NextResponse.json({ error: '공개 컬렉션만 구독할 수 있습니다.' }, { status: 400 })
  }

  const subscriberId = createSubscriberId(folderId, email)
  const subscriberRef = doc(db, 'folders', folderId, 'emailSubscribers', subscriberId)
  const existingSnapshot = await getDoc(subscriberRef)
  const existing = existingSnapshot.exists() ? (existingSnapshot.data() as EmailSubscriber) : null
  const verifyToken = createOpaqueToken()
  const unsubscribeToken = createOpaqueToken()
  const now = Date.now()

  const subscriber: EmailSubscriber = {
    id: subscriberId,
    folderId,
    email,
    status: existing?.status === 'confirmed' ? 'confirmed' : 'pending',
    verifyTokenHash: hashToken(verifyToken),
    unsubscribeTokenHash: hashToken(unsubscribeToken),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    confirmedAt: existing?.confirmedAt ?? null,
    lastVerificationSentAt: now,
    lastDigestQueuedAt: existing?.lastDigestQueuedAt ?? null,
    lastDigestSentAt: existing?.lastDigestSentAt ?? null,
    unsubscribedAt: null,
    userUid,
  }

  if (existing?.status === 'confirmed') {
    await setDoc(subscriberRef, { ...subscriber, status: 'confirmed' }, { merge: true })
    return NextResponse.json({
      ok: true,
      status: 'confirmed',
      message: '이미 구독 중인 이메일이에요.',
    })
  }

  await setDoc(subscriberRef, subscriber, { merge: true })

  const origin = req.nextUrl.origin
  const confirmUrl = buildConfirmUrl(origin, folderId, subscriberId, verifyToken)
  const emailContent = buildVerificationEmail({
    collectionName: folder.name,
    confirmUrl,
  })

  await setDoc(doc(db, 'emailQueue', getVerificationJobId(folderId, subscriberId)), {
    id: getVerificationJobId(folderId, subscriberId),
    type: 'verification',
    recipientEmail: email,
    folderId,
    subscriberId,
    payload: {
      collectionName: folder.name,
      confirmUrl,
    },
    status: 'pending',
    createdAt: now,
    scheduledAt: now,
  })

  try {
    const sentResult = await sendEmailNow({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    return NextResponse.json({
      ok: true,
      status: 'pending',
      message: sentResult.sent
        ? '확인 메일을 보냈어요. 메일함에서 구독을 완료해 주세요.'
        : '확인 메일 발송 대기열에 올렸어요.',
      confirmUrl: sentResult.sent ? undefined : confirmUrl,
    })
  } catch (error) {
    console.error('[subscribe] send failed:', error)
    return NextResponse.json({
      ok: true,
      status: 'pending',
      message: '확인 메일 발송 대기열에 올렸어요.',
      confirmUrl,
    })
  }
}
