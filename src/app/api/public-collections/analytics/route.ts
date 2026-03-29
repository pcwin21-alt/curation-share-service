import { NextRequest, NextResponse } from 'next/server'
import { doc, increment, runTransaction } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { CurationFolder } from '@/types'

interface AnalyticsPayload {
  event?: 'start' | 'end'
  folderId?: string
  shareSlug?: string
  sessionId?: string
  visitorId?: string
  durationMs?: number
  seenCardIds?: string[]
}

const DEFAULT_MAX_DURATION_MS = 1000 * 60 * 30

function normalizeSeenCardIds(seenCardIds: unknown) {
  if (!Array.isArray(seenCardIds)) return []
  return [...new Set(seenCardIds.filter((item): item is string => typeof item === 'string'))].slice(0, 50)
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as AnalyticsPayload
  const event = body.event
  const folderId = String(body.folderId ?? '').trim()
  const shareSlug = String(body.shareSlug ?? '').trim()
  const sessionId = String(body.sessionId ?? '').trim()
  const visitorId = String(body.visitorId ?? '').trim()

  if (!event || !folderId || !sessionId) {
    return NextResponse.json({ error: '필수 추적 정보가 없습니다.' }, { status: 400 })
  }

  const folderRef = doc(db, 'folders', folderId)
  const sessionRef = doc(db, 'folders', folderId, 'analyticsSessions', sessionId)
  const visitorRef = doc(db, 'folders', folderId, 'analyticsVisitors', visitorId || 'anonymous')

  try {
    if (event === 'start') {
      if (!visitorId) {
        return NextResponse.json({ error: 'visitorId가 필요합니다.' }, { status: 400 })
      }

      await runTransaction(db, async (transaction) => {
        const folderSnapshot = await transaction.get(folderRef)

        if (!folderSnapshot.exists()) {
          throw new Error('NOT_FOUND')
        }

        const folder = folderSnapshot.data() as CurationFolder

        if (!folder.isPublic || folder.shareSlug !== shareSlug) {
          throw new Error('FORBIDDEN')
        }

        const sessionSnapshot = await transaction.get(sessionRef)
        const visitorSnapshot = await transaction.get(visitorRef)
        const now = Date.now()

        if (!sessionSnapshot.exists()) {
          transaction.set(sessionRef, {
            id: sessionId,
            folderId,
            shareSlug,
            visitorId,
            startedAt: now,
            endedAt: null,
            durationMs: 0,
            seenCardIds: [],
          })

          transaction.update(folderRef, {
            'analytics.viewCount': increment(1),
            'analytics.lastViewedAt': now,
          })
        }

        if (!visitorSnapshot.exists()) {
          transaction.set(visitorRef, {
            id: visitorId,
            firstSeenAt: now,
            lastSeenAt: now,
          })

          transaction.update(folderRef, {
            'analytics.uniqueVisitorCount': increment(1),
          })
        } else {
          transaction.update(visitorRef, {
            lastSeenAt: now,
          })
        }
      })

      return NextResponse.json({ ok: true })
    }

    if (event === 'end') {
      const seenCardIds = normalizeSeenCardIds(body.seenCardIds)
      const rawDurationMs = Number(body.durationMs ?? 0)

      await runTransaction(db, async (transaction) => {
        const folderSnapshot = await transaction.get(folderRef)
        const sessionSnapshot = await transaction.get(sessionRef)

        if (!folderSnapshot.exists() || !sessionSnapshot.exists()) {
          return
        }

        const folder = folderSnapshot.data() as CurationFolder

        if (!folder.isPublic || folder.shareSlug !== shareSlug) {
          return
        }

        const sessionData = sessionSnapshot.data() as {
          startedAt?: number
          endedAt?: number | null
          seenCardIds?: string[]
        }

        if (sessionData.endedAt) {
          return
        }

        const startedAt = Number(sessionData.startedAt ?? Date.now())
        const now = Date.now()
        const durationMs = Math.max(
          0,
          Math.min(
            rawDurationMs > 0 ? rawDurationMs : now - startedAt,
            DEFAULT_MAX_DURATION_MS,
          ),
        )
        const mergedSeenCardIds = [...new Set([...(sessionData.seenCardIds ?? []), ...seenCardIds])]

        transaction.update(sessionRef, {
          endedAt: now,
          durationMs,
          seenCardIds: mergedSeenCardIds,
        })

        const folderUpdates: Record<string, unknown> = {
          'analytics.totalDwellMs': increment(durationMs),
          'analytics.totalCardsViewed': increment(mergedSeenCardIds.length),
          'analytics.lastViewedAt': now,
        }

        mergedSeenCardIds.forEach((cardId) => {
          folderUpdates[`analytics.cardViewCounts.${cardId}`] = increment(1)
        })

        transaction.update(folderRef, folderUpdates)
      })

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: '지원하지 않는 이벤트입니다.' }, { status: 400 })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'NOT_FOUND') {
        return NextResponse.json({ error: '컬렉션을 찾을 수 없습니다.' }, { status: 404 })
      }

      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: '공개된 컬렉션이 아닙니다.' }, { status: 403 })
      }
    }

    console.error('[public-collections/analytics] 추적 실패:', error)
    return NextResponse.json({ error: '통계를 저장하지 못했습니다.' }, { status: 500 })
  }
}
