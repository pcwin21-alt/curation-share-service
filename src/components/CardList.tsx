'use client'

import ContentCard from './ContentCard'
import { ContentCard as CardType, CurationFolder } from '@/types'

interface CardListProps {
  highlightId?: string
  cards: CardType[]
  folders: CurationFolder[]
  isManaging?: boolean
  selectedCardIds?: Set<string>
  onToggleSelect?: (id: string) => void
}

export default function CardList({
  highlightId,
  cards,
  folders,
  isManaging = false,
  selectedCardIds = new Set(),
  onToggleSelect,
}: CardListProps) {
  if (cards.length === 0) {
    return <div className="py-16 text-center text-sm text-on-surface-variant">아직 저장된 콘텐츠가 없어요.</div>
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <ContentCard
          key={card.id}
          card={card}
          folders={folders}
          highlight={highlightId === card.id}
          isManaging={isManaging}
          isSelected={selectedCardIds.has(card.id)}
          selectedCardIds={selectedCardIds}
          onToggleSelect={() => onToggleSelect?.(card.id)}
        />
      ))}
    </div>
  )
}
