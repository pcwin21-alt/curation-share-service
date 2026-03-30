import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { isValidShareSlug, normalizeShareSlug } from '@/lib/shareSlug'
import { getWeekKey } from '@/lib/subscriptions'
import { requireOwnedCard, requireOwnedFolder } from '@/lib/serverOwnership'
import { getUserDisplayName, readBearerToken, verifyFirebaseIdToken } from '@/lib/serverAuth'
import {
  CollectionNotification,
  CollectionUpdateEvent,
  ContentCard,
  CurationFolder,
} from '@/types'

function toSlug(name: string) {
  return normalizeShareSlug(name)
}

function trimLine(value: string, maxLength = 120) {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function buildDigestOverview(folder: CurationFolder, card: ContentCard, totalAddedCount: number) {
  const focus = trimLine(card.keyInsight || card.summary?.[0] || card.title, 120)
  return `${folder.name} 컬렉션에 이번 주 ${totalAddedCount}개의 업데이트가 쌓였습니다. 대표 흐름은 "${focus}" 쪽에 가깝습니다.`
}

function buildDigestBullets(eventTitles: string[], card: ContentCard) {
  const bullets = [
    card.keyInsight || card.summary?.[0] || '',
    ...eventTitles.slice(0, 2),
  ]

  return [...new Set(bullets.map((item) => trimLine(item, 110)).filter(Boolean))].slice(0, 3)
}

async function requireUser(req: NextRequest) {
  const token = readBearerToken(req.headers.get('authorization'))
  return verifyFirebaseIdToken(token)
}

function handleOwnershipError(error: unknown) {
  if (!(error instanceof Error)) return null

  if (error.message === 'FOLDER_NOT_FOUND') {
    return NextResponse.json({ error: '폴더를 찾을 수 없습니다.' }, { status: 404 })
  }

  if (error.message === 'CARD_NOT_FOUND') {
    return NextResponse.json({ error: '카드를 찾을 수 없습니다.' }, { status: 404 })
  }

  if (error.message === 'FOLDER_FORBIDDEN') {
    return NextResponse.json({ error: '이 폴더를 수정할 권한이 없습니다.' }, { status: 403 })
  }

  if (error.message === 'CARD_FORBIDDEN') {
    return NextResponse.json({ error: '이 카드를 수정할 권한이 없습니다.' }, { status: 403 })
  }

  return null
}

async function ensureUniqueShareSlug(shareSlug: string, folderId?: string) {
  const snapshot = await getDocs(
    query(collection(db, 'folders'), where('shareSlug', '==', shareSlug), limit(2)),
  )

  const duplicated = snapshot.docs.some((item) => item.id !== folderId)

  if (!duplicated) {
    return null
  }

  return NextResponse.json(
    { error: '이미 사용 중인 공개 링크입니다. 다른 주소를 입력해 주세요.' },
    { status: 409 },
  )
}

async function createCollectionUpdateArtifacts(folder: CurationFolder, card: ContentCard) {
  if (!folder.isPublic || !folder.shareSlug) {
    return
  }

  const weekKey = getWeekKey()
  const eventId = `${folder.id}_${weekKey}`
  const eventRef = doc(db, 'collectionUpdateEvents', eventId)
  const followersSnapshot = await getDocs(collection(db, 'folders', folder.id, 'followers'))
  const now = Date.now()
  const eventSnapshot = await getDoc(eventRef)
  const previousEvent = eventSnapshot.exists() ? (eventSnapshot.data() as CollectionUpdateEvent) : null

  const nextCardIds = [...new Set([...(previousEvent?.addedCardIds ?? []), card.id])]
  const nextCardTitles = [...new Set([...(previousEvent?.addedCardTitles ?? []), card.title])].slice(0, 12)
  const digestOverview = buildDigestOverview(folder, card, nextCardIds.length)
  const digestBullets = buildDigestBullets(nextCardTitles, card)

  const nextEvent: CollectionUpdateEvent = {
    id: eventId,
    folderId: folder.id,
    weekKey,
    collectionName: folder.name,
    shareSlug: folder.shareSlug,
    ownerName: folder.ownerName,
    addedCardIds: nextCardIds,
    addedCardTitles: nextCardTitles,
    addedCount: nextCardIds.length,
    createdAt: previousEvent?.createdAt ?? now,
    updatedAt: now,
    lastCardAddedAt: now,
    digestOverview,
    digestBullets,
    lastSummaryAt: now,
    digestStatus: previousEvent?.digestStatus ?? 'pending',
    digestQueuedAt: previousEvent?.digestQueuedAt ?? null,
    digestSentAt: previousEvent?.digestSentAt ?? null,
  }

  await setDoc(eventRef, nextEvent, { merge: true })

  if (followersSnapshot.empty) {
    return
  }

  await Promise.all(
    followersSnapshot.docs.map(async (followerDoc) => {
      const uid = followerDoc.id
      const notification: CollectionNotification = {
        id: eventId,
        eventId,
        folderId: folder.id,
        collectionName: folder.name,
        shareSlug: folder.shareSlug!,
        ownerName: folder.ownerName,
        weekKey,
        unread: true,
        addedCount: nextCardIds.length,
        addedCardIds: nextCardIds,
        addedCardTitles: nextCardTitles,
        createdAt: previousEvent?.createdAt ?? now,
        lastTriggeredAt: now,
        lastReadAt: null,
      }

      await setDoc(doc(db, 'users', uid, 'notifications', eventId), notification, { merge: true })
    }),
  )
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req)

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const snapshot = await getDocs(query(collection(db, 'folders'), where('ownerUid', '==', user.uid)))
  const folders = snapshot.docs
    .map((item) => item.data() as CurationFolder)
    .sort((a, b) => a.createdAt - b.createdAt)

  return NextResponse.json({ folders })
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req)

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = await req.json()
  const { name, description = '', isPublic = false, shareSlug } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: '폴더 이름을 입력해 주세요.' }, { status: 400 })
  }

  const trimmedName = String(name).trim()
  const normalizedShareSlug = normalizeShareSlug(String(shareSlug ?? trimmedName))

  if (isPublic) {
    if (!isValidShareSlug(normalizedShareSlug)) {
      return NextResponse.json(
        { error: '공개 링크는 3자 이상 50자 이하로 입력해 주세요.' },
        { status: 400 },
      )
    }

    const duplicatedResponse = await ensureUniqueShareSlug(normalizedShareSlug)
    if (duplicatedResponse) return duplicatedResponse
  }

  const id = uuidv4()
  const now = Date.now()

  const folder: CurationFolder = {
    id,
    name: trimmedName,
    description: String(description ?? ''),
    isPublic: Boolean(isPublic),
    ownerUid: user.uid,
    ownerName: getUserDisplayName(user),
    cardIds: [],
    slug: toSlug(trimmedName),
    color: '',
    analytics: {
      viewCount: 0,
      uniqueVisitorCount: 0,
      totalDwellMs: 0,
      totalCardsViewed: 0,
      cardViewCounts: {},
    },
    followerCount: 0,
    emailSubscriberCount: 0,
    createdAt: now,
    updatedAt: now,
    ...(isPublic
      ? {
          shareSlug: normalizedShareSlug,
          sharedAt: now,
        }
      : {}),
  }

  await setDoc(doc(db, 'folders', id), folder)
  return NextResponse.json(folder)
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser(req)

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = await req.json()
  const folderId = String(body.folderId ?? '').trim()
  const cardId = String(body.cardId ?? '').trim()

  if (!folderId || !cardId) {
    return NextResponse.json({ error: 'folderId와 cardId가 필요합니다.' }, { status: 400 })
  }

  let folderForEvent: CurationFolder | null = null
  let cardForEvent: ContentCard | null = null
  let wasAdded = false

  try {
    const [{ ref: folderRef }, { ref: cardRef }] = await Promise.all([
      requireOwnedFolder(folderId, user),
      requireOwnedCard(cardId, user),
    ])

    await runTransaction(db, async (transaction) => {
      const [folderSnapshot, cardSnapshot] = await Promise.all([
        transaction.get(folderRef),
        transaction.get(cardRef),
      ])

      if (!folderSnapshot.exists()) {
        throw new Error('FOLDER_NOT_FOUND')
      }

      if (!cardSnapshot.exists()) {
        throw new Error('CARD_NOT_FOUND')
      }

      const folder = folderSnapshot.data() as CurationFolder
      const card = cardSnapshot.data() as ContentCard

      if ((folder.cardIds ?? []).includes(cardId)) {
        folderForEvent = folder
        cardForEvent = card
        return
      }

      const now = Date.now()
      const nextFolderCardIds = [...new Set([...(folder.cardIds ?? []), cardId])]
      const nextCardFolderIds = [...new Set([...(card.folderIds ?? []), folderId])]

      transaction.update(folderRef, {
        cardIds: nextFolderCardIds,
        updatedAt: now,
      })

      transaction.update(cardRef, {
        folderIds: nextCardFolderIds,
        updatedAt: now,
      })

      wasAdded = true
      folderForEvent = {
        ...folder,
        cardIds: nextFolderCardIds,
        updatedAt: now,
      }
      cardForEvent = {
        ...card,
        folderIds: nextCardFolderIds,
        updatedAt: now,
      }
    })
  } catch (error) {
    const response = handleOwnershipError(error)
    if (response) return response
    throw error
  }

  if (wasAdded && folderForEvent && cardForEvent) {
    await createCollectionUpdateArtifacts(folderForEvent, cardForEvent)
  }

  return NextResponse.json({ ok: true, added: wasAdded })
}

export async function PUT(req: NextRequest) {
  const user = await requireUser(req)

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = await req.json()
  const folderId = String(body.folderId ?? '').trim()

  if (!folderId) {
    return NextResponse.json({ error: 'folderId가 필요합니다.' }, { status: 400 })
  }

  let currentFolder: CurationFolder
  let folderRef

  try {
    const result = await requireOwnedFolder(folderId, user)
    currentFolder = result.folder
    folderRef = result.ref
  } catch (error) {
    const response = handleOwnershipError(error)
    if (response) return response
    throw error
  }

  const updates: Record<string, unknown> = {
    updatedAt: Date.now(),
  }

  if (Object.prototype.hasOwnProperty.call(body, 'color')) {
    updates.color = String(body.color ?? '')
  }

  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    const trimmedName = String(body.name ?? '').trim()

    if (!trimmedName) {
      return NextResponse.json({ error: '폴더 이름을 입력해 주세요.' }, { status: 400 })
    }

    updates.name = trimmedName
    updates.slug = toSlug(trimmedName)
  }

  if (Object.prototype.hasOwnProperty.call(body, 'description')) {
    updates.description = String(body.description ?? '')
  }

  const nextPublic =
    Object.prototype.hasOwnProperty.call(body, 'isPublic')
      ? Boolean(body.isPublic)
      : currentFolder.isPublic

  const rawShareSlug = Object.prototype.hasOwnProperty.call(body, 'shareSlug')
    ? String(body.shareSlug ?? '')
    : currentFolder.shareSlug ?? currentFolder.slug ?? currentFolder.name
  const normalizedShareSlug = normalizeShareSlug(rawShareSlug)

  if (Object.prototype.hasOwnProperty.call(body, 'shareSlug') || nextPublic) {
    if (!isValidShareSlug(normalizedShareSlug)) {
      return NextResponse.json(
        { error: '공개 링크는 3자 이상 50자 이하로 입력해 주세요.' },
        { status: 400 },
      )
    }

    const duplicatedResponse = await ensureUniqueShareSlug(normalizedShareSlug, folderId)
    if (duplicatedResponse) return duplicatedResponse

    updates.shareSlug = normalizedShareSlug
  }

  if (Object.prototype.hasOwnProperty.call(body, 'isPublic')) {
    updates.isPublic = nextPublic
    updates.sharedAt = nextPublic ? currentFolder.sharedAt ?? Date.now() : null
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: '변경할 값이 없습니다.' }, { status: 400 })
  }

  await updateDoc(folderRef, updates)

  return NextResponse.json({
    ok: true,
    folderId,
    shareSlug: updates.shareSlug ?? currentFolder.shareSlug ?? null,
    isPublic: updates.isPublic ?? currentFolder.isPublic,
  })
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser(req)

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = await req.json()
  const folderId = String(body.folderId ?? '').trim()
  const cardId = String(body.cardId ?? '').trim()

  if (!folderId || !cardId) {
    return NextResponse.json({ error: 'folderId와 cardId가 필요합니다.' }, { status: 400 })
  }

  try {
    const [{ ref: folderRef }, { ref: cardRef }] = await Promise.all([
      requireOwnedFolder(folderId, user),
      requireOwnedCard(cardId, user),
    ])

    await runTransaction(db, async (transaction) => {
      const [folderSnapshot, cardSnapshot] = await Promise.all([
        transaction.get(folderRef),
        transaction.get(cardRef),
      ])

      if (!folderSnapshot.exists() || !cardSnapshot.exists()) {
        return
      }

      const folder = folderSnapshot.data() as CurationFolder
      const card = cardSnapshot.data() as ContentCard

      transaction.update(folderRef, {
        cardIds: (folder.cardIds ?? []).filter((id) => id !== cardId),
        updatedAt: Date.now(),
      })

      transaction.update(cardRef, {
        folderIds: (card.folderIds ?? []).filter((id) => id !== folderId),
        updatedAt: Date.now(),
      })
    })
  } catch (error) {
    const response = handleOwnershipError(error)
    if (response) return response
    throw error
  }

  return NextResponse.json({ ok: true })
}
