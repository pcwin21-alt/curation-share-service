import { NextRequest, NextResponse } from 'next/server'
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { buildWeeklyDigestEmail, sendEmailNow } from '@/lib/email'
import { buildUnsubscribeUrl, createOpaqueToken, getDigestJobId, hashToken } from '@/lib/subscriptions'
import { CollectionUpdateEvent, CurationFolder, EmailSubscriber } from '@/types'

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return req.headers.get('x-cron-secret') === secret
}

async function handleDigest(req: NextRequest) {
  const eventsSnapshot = await getDocs(query(collection(db, 'collectionUpdateEvents'), orderBy('updatedAt', 'asc')))
  const targetEvents = eventsSnapshot.docs
    .map((item) => item.data() as CollectionUpdateEvent)
    .filter((event) => event.digestStatus !== 'sent')

  const results: Array<{ eventId: string; queued: number; sent: number }> = []

  for (const event of targetEvents) {
    const folderSnapshot = await getDoc(doc(db, 'folders', event.folderId))
    if (!folderSnapshot.exists()) continue
    void (folderSnapshot.data() as CurationFolder)
    const subscribersSnapshot = await getDocs(
      query(
        collection(db, 'folders', event.folderId, 'emailSubscribers'),
        where('status', '==', 'confirmed'),
      ),
    )

    let queued = 0
    let sent = 0

    for (const subscriberDoc of subscribersSnapshot.docs) {
      const subscriber = subscriberDoc.data() as EmailSubscriber
      const unsubscribeToken = createOpaqueToken()
      const unsubscribeUrl = buildUnsubscribeUrl(
        req.nextUrl.origin,
        event.folderId,
        subscriber.id,
        unsubscribeToken,
      )
      const jobId = getDigestJobId(event.id, subscriber.id)
      const shareUrl = `${req.nextUrl.origin}/c/${event.shareSlug}`
      const emailContent = buildWeeklyDigestEmail({
        collectionName: event.collectionName,
        shareUrl,
        addedCardTitles: event.addedCardTitles.slice(0, 8),
        unsubscribeUrl,
      })

      await updateDoc(doc(db, 'folders', event.folderId, 'emailSubscribers', subscriber.id), {
        unsubscribeTokenHash: hashToken(unsubscribeToken),
        lastDigestQueuedAt: Date.now(),
        updatedAt: Date.now(),
      })

      await setDoc(doc(db, 'emailQueue', jobId), {
        id: jobId,
        type: 'weekly-digest',
        eventId: event.id,
        folderId: event.folderId,
        subscriberId: subscriber.id,
        recipientEmail: subscriber.email,
        payload: {
          collectionName: event.collectionName,
          shareUrl,
          addedCardTitles: event.addedCardTitles.slice(0, 8),
          unsubscribeUrl,
        },
        status: 'pending',
        createdAt: Date.now(),
        scheduledAt: Date.now(),
      })
      queued += 1

      try {
        const sentResult = await sendEmailNow({
          to: subscriber.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        })

        if (sentResult.sent) {
          sent += 1
          await updateDoc(doc(db, 'emailQueue', jobId), {
            status: 'sent',
            sentAt: Date.now(),
          })
          await updateDoc(doc(db, 'folders', event.folderId, 'emailSubscribers', subscriber.id), {
            lastDigestSentAt: Date.now(),
          })
        }
      } catch (error) {
        console.error('[weekly-digest] send failed:', error)
      }
    }

    await updateDoc(doc(db, 'collectionUpdateEvents', event.id), {
      digestStatus: sent > 0 ? 'sent' : 'queued',
      digestQueuedAt: Date.now(),
      digestSentAt: sent > 0 ? Date.now() : null,
      updatedAt: Date.now(),
    })

    results.push({ eventId: event.id, queued, sent })
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    results,
  })
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
  }

  return handleDigest(req)
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 })
  }

  return handleDigest(req)
}
