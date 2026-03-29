import { NextRequest, NextResponse } from 'next/server'
import { arrayRemove, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { analyzeCard } from '@/lib/analyzeCard'
import { db } from '@/lib/firebase'
import { requireOwnedCard } from '@/lib/serverOwnership'
import { readBearerToken, verifyFirebaseIdToken } from '@/lib/serverAuth'
import { sanitizeTags } from '@/lib/tags'

async function requireUser(req: NextRequest) {
  const token = readBearerToken(req.headers.get('authorization'))
  return verifyFirebaseIdToken(token)
}

function handleOwnershipError(error: unknown) {
  if (!(error instanceof Error)) return null

  if (error.message === 'CARD_NOT_FOUND') {
    return NextResponse.json({ error: '카드를 찾을 수 없습니다.' }, { status: 404 })
  }

  if (error.message === 'CARD_FORBIDDEN') {
    return NextResponse.json({ error: '이 카드를 수정할 권한이 없습니다.' }, { status: 403 })
  }

  return null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser(req)

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { id } = await params

  try {
    await requireOwnedCard(id, user)
  } catch (error) {
    const response = handleOwnershipError(error)
    if (response) return response
    throw error
  }

  const body = await req.json()
  const updates: Record<string, unknown> = {
    updatedAt: Date.now(),
  }

  if ('contextMemo' in body) {
    if (typeof body.contextMemo !== 'string') {
      return NextResponse.json({ error: '메모 형식이 올바르지 않습니다.' }, { status: 400 })
    }

    updates.contextMemo = body.contextMemo.trim()
  }

  if ('tags' in body) {
    if (!Array.isArray(body.tags) || body.tags.some((tag: unknown) => typeof tag !== 'string')) {
      return NextResponse.json({ error: '태그 형식이 올바르지 않습니다.' }, { status: 400 })
    }

    updates.tags = sanitizeTags(body.tags)
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: '수정할 내용이 없습니다.' }, { status: 400 })
  }

  await updateDoc(doc(db, 'cards', id), updates)

  return NextResponse.json({ ok: true, ...updates })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser(req)

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { id } = await params
  let card

  try {
    const result = await requireOwnedCard(id, user)
    card = result.card
  } catch (error) {
    const response = handleOwnershipError(error)
    if (response) return response
    throw error
  }

  analyzeCard({
    id: card.id,
    url: card.url,
    rawText: card.rawText,
    platform: card.platform,
  }).catch(console.error)

  return NextResponse.json({ ok: true, status: 'analyzing' })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser(req)

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { id } = await params
  let card

  try {
    const result = await requireOwnedCard(id, user)
    card = result.card
  } catch (error) {
    const response = handleOwnershipError(error)
    if (response) return response
    throw error
  }

  await Promise.all(
    (card.folderIds ?? []).map((folderId) =>
      updateDoc(doc(db, 'folders', folderId), {
        cardIds: arrayRemove(id),
        updatedAt: Date.now(),
      }),
    ),
  )

  await deleteDoc(doc(db, 'cards', id))
  return NextResponse.json({ ok: true })
}
