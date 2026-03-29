import { NextRequest, NextResponse } from 'next/server'
import { synthesizeCollection } from '@/lib/synthesizeCollection'
import { ContentCard as CardType } from '@/types'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const collectionName = String(body.collectionName ?? '컬렉션').trim() || '컬렉션'
  const mode = body.mode === 'selected' ? 'selected' : 'all'
  const rawCards = Array.isArray(body.cards) ? (body.cards as CardType[]) : []

  const cards = rawCards
    .filter((card) => card?.id && card?.title)
    .slice(0, 18)
    .map((card) => ({
      id: card.id,
      title: card.title,
      platform: card.platform,
      summary: Array.isArray(card.summary) ? card.summary : [],
      keyInsight: card.keyInsight ?? '',
      contextMemo: card.contextMemo ?? '',
      tags: Array.isArray(card.tags) ? card.tags : [],
      rawText: card.rawText ?? '',
      folderIds: Array.isArray(card.folderIds) ? card.folderIds : [],
      status: card.status ?? 'done',
      createdAt: Number(card.createdAt ?? Date.now()),
      updatedAt: Number(card.updatedAt ?? card.createdAt ?? Date.now()),
      url: card.url,
      thumbnailUrl: card.thumbnailUrl,
    }))

  if (cards.length === 0) {
    return NextResponse.json(
      { error: '요약할 콘텐츠를 먼저 선택해 주세요.' },
      { status: 400 },
    )
  }

  const result = await synthesizeCollection({
    collectionName,
    cards,
    mode,
  })

  return NextResponse.json(result)
}
