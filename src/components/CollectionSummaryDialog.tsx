'use client'

import { useEffect, useMemo, useState } from 'react'
import Icon from '@/components/Icon'
import { exportCollectionSummaryPdf } from '@/lib/exportCollectionSummaryPdf'
import { CollectionSummaryResult, ContentCard as CardType } from '@/types'

interface CollectionSummaryDialogProps {
  isOpen: boolean
  onClose: () => void
  collectionName: string
  allCards: CardType[]
  selectedCards: CardType[]
}

type SummaryMode = 'all' | 'selected'

function buildResultText(result: CollectionSummaryResult) {
  return [
    `한눈에 보기\n${result.overview}`,
    `핵심 포인트\n${result.keyTakeaways
      .map((item) => `- ${item.point}${item.sources.length > 0 ? ` (${item.sources.join(', ')})` : ''}`)
      .join('\n')}`,
    `전체 흐름\n${result.sectionSummary}`,
    `다음에 해볼 일\n${result.nextActions.map((item) => `- ${item}`).join('\n')}`,
    `눈여겨볼 콘텐츠\n${result.sourceSpotlights.map((item) => `- ${item.title}: ${item.reason}`).join('\n')}`,
    `생각해볼 질문\n${result.suggestedQuestions.map((item) => `- ${item}`).join('\n')}`,
  ].join('\n\n')
}

function getCardsForMode(mode: SummaryMode, allCards: CardType[], selectedCards: CardType[]) {
  return mode === 'selected' ? selectedCards : allCards
}

export default function CollectionSummaryDialog({
  isOpen,
  onClose,
  collectionName,
  allCards,
  selectedCards,
}: CollectionSummaryDialogProps) {
  const [mode, setMode] = useState<SummaryMode>('all')
  const [generatedMode, setGeneratedMode] = useState<SummaryMode>('all')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CollectionSummaryResult | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const availableCards = useMemo(
    () => getCardsForMode(mode, allCards, selectedCards),
    [allCards, mode, selectedCards],
  )

  const cardsForExport = useMemo(
    () => getCardsForMode(generatedMode, allCards, selectedCards),
    [allCards, generatedMode, selectedCards],
  )

  useEffect(() => {
    if (!isOpen) return

    const nextMode = selectedCards.length > 0 ? 'selected' : 'all'
    setMode(nextMode)
    setGeneratedMode(nextMode)
    setResult(null)
    setError('')
    setCopied(false)
    setLoading(false)
  }, [collectionName, isOpen, selectedCards.length])

  useEffect(() => {
    if (!copied) return

    const timeoutId = window.setTimeout(() => {
      setCopied(false)
    }, 1800)

    return () => window.clearTimeout(timeoutId)
  }, [copied])

  if (!isOpen) return null

  async function handleGenerate(nextMode: SummaryMode = mode) {
    const cards = getCardsForMode(nextMode, allCards, selectedCards)

    if (cards.length === 0) {
      setError('요약할 콘텐츠를 먼저 선택해 주세요.')
      return
    }

    setMode(nextMode)
    setLoading(true)
    setError('')
    setCopied(false)

    try {
      const response = await fetch('/api/collections/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionName,
          mode: nextMode,
          cards,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? '요약을 불러오지 못했습니다.')
        setResult(null)
        return
      }

      setResult(data as CollectionSummaryResult)
      setGeneratedMode(nextMode)
    } catch {
      setError('요약을 만드는 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!result) return

    try {
      await navigator.clipboard.writeText(buildResultText(result))
      setCopied(true)
    } catch {
      setError('복사에 실패했습니다. 다시 시도해 주세요.')
    }
  }

  function handleExportPdf() {
    if (!result) return

    try {
      exportCollectionSummaryPdf({
        collectionName,
        mode: generatedMode,
        result,
        cards: cardsForExport,
      })
      setError('')
    } catch {
      setError('PDF 창을 열지 못했습니다. 팝업 차단을 확인해 주세요.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-surface-container-lowest shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/15 px-6 py-5">
          <div>
            <p className="type-micro mb-2 font-semibold text-secondary">AI로 요약하기</p>
            <h2 className="font-headline text-[1.35rem] leading-[1.3] text-primary">
              {collectionName} 컬렉션을 한 번에 읽기 좋은 형태로 정리해 보세요.
            </h2>
            <p className="type-body mt-2 text-on-surface-variant">
              여러 콘텐츠를 묶어서 핵심 포인트, 전체 흐름, 다음에 해볼 일까지 한 장처럼 정리합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-surface-container"
            aria-label="닫기"
          >
            <Icon name="close" className="h-5 w-5 text-on-surface-variant" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleGenerate('all')}
              disabled={loading}
              className={`type-body rounded-full px-4 py-2 font-semibold transition-colors ${
                mode === 'all'
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant/20 bg-surface text-on-surface hover:bg-surface-container'
              }`}
            >
              전체 콘텐츠 요약
            </button>

            <button
              type="button"
              onClick={() => handleGenerate('selected')}
              disabled={loading || selectedCards.length === 0}
              className={`type-body rounded-full px-4 py-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                mode === 'selected'
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant/20 bg-surface text-on-surface hover:bg-surface-container'
              }`}
            >
              선택한 콘텐츠 요약 {selectedCards.length > 0 ? `(${selectedCards.length})` : ''}
            </button>

            <div className="type-micro rounded-full bg-surface-container px-3 py-2 text-on-surface-variant">
              지금 요약 대상 {availableCards.length}개
            </div>
          </div>

          <div className="mb-5 rounded-[24px] bg-[#e6efe7] px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-headline text-[1.08rem] text-primary">
                  흩어진 자료를 한 번에 훑어볼 수 있는 요약본으로 정리합니다.
                </p>
                <p className="type-body mt-2 text-on-surface-variant">
                  카드 요약, 메모, 태그를 모아 공통 흐름과 겹치는 포인트를 빠르게 정리합니다.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleGenerate(mode)}
                disabled={loading || availableCards.length === 0}
                className="type-body rounded-full bg-primary px-5 py-3 font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? '정리하는 중...' : 'AI로 요약 시작'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-error/20 bg-error-container/35 px-4 py-3">
              <p className="type-body text-error">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-5">
              <div className="rounded-[28px] bg-surface px-5 py-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="type-micro font-semibold text-secondary">한눈에 보기</p>
                    <p className="type-body mt-1 text-on-surface-variant">
                      총 {result.sourceCount}개의 콘텐츠를 바탕으로 정리했습니다.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="type-micro rounded-full border border-outline-variant/20 px-3 py-2 font-semibold text-on-surface transition-colors hover:bg-surface-container"
                    >
                      {copied ? '복사됨' : '요약 복사'}
                    </button>

                    <button
                      type="button"
                      onClick={handleExportPdf}
                      className="type-micro inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 font-semibold text-on-primary transition-opacity hover:opacity-90"
                    >
                      <Icon name="download" className="h-4 w-4" />
                      PDF로 저장
                    </button>
                  </div>
                </div>

                <p className="type-body text-on-surface">{result.overview}</p>

                {result.usedFallback && (
                  <div className="mt-4 rounded-2xl bg-[#FFF4D6] px-4 py-3">
                    <p className="type-micro font-semibold text-[#7A5A11]">
                      API 키가 없어 기본 합성 요약으로 정리했습니다. 연결하면 더 정교한 요약으로 바뀝니다.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="space-y-5">
                  <div className="rounded-[28px] bg-surface px-5 py-5">
                    <p className="type-micro mb-3 font-semibold text-secondary">핵심 포인트</p>
                    <div className="space-y-3">
                      {result.keyTakeaways.map((item, index) => (
                        <div key={`${item.point}-${index}`} className="rounded-2xl bg-surface-container-low px-4 py-4">
                          <p className="type-body font-semibold text-primary">{item.point}</p>
                          {item.sources.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.sources.map((source) => (
                                <span
                                  key={source}
                                  className="type-micro rounded-full bg-secondary-container px-3 py-1 font-semibold text-on-secondary-container"
                                >
                                  {source}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[28px] bg-surface px-5 py-5">
                    <p className="type-micro mb-3 font-semibold text-secondary">전체 흐름</p>
                    <p className="type-body whitespace-pre-line text-on-surface">{result.sectionSummary}</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-[28px] bg-[#f7f1e2] px-5 py-5">
                    <p className="type-micro mb-3 font-semibold text-[#7A5A11]">다음에 해볼 일</p>
                    <ul className="space-y-2">
                      {result.nextActions.map((item) => (
                        <li key={item} className="type-body flex items-start gap-2 text-on-surface">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C89119]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-[28px] bg-surface px-5 py-5">
                    <p className="type-micro mb-3 font-semibold text-secondary">눈여겨볼 콘텐츠</p>
                    <div className="space-y-3">
                      {result.sourceSpotlights.map((item) => (
                        <div key={item.title} className="rounded-2xl bg-surface-container-low px-4 py-4">
                          <p className="type-body font-semibold text-primary">{item.title}</p>
                          <p className="type-body mt-2 text-on-surface-variant">{item.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[28px] bg-surface px-5 py-5">
                    <p className="type-micro mb-3 font-semibold text-secondary">생각해볼 질문</p>
                    <div className="space-y-2">
                      {result.suggestedQuestions.map((item) => (
                        <div key={item} className="rounded-2xl bg-surface-container-low px-4 py-3">
                          <p className="type-body text-on-surface">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!result && !error && (
            <div className="rounded-[28px] border border-dashed border-outline-variant/25 px-6 py-14 text-center">
              <p className="font-headline text-[1.1rem] text-primary">컬렉션을 묶어 정리할 준비가 되어 있습니다.</p>
              <p className="type-body mt-2 text-on-surface-variant">
                전체 콘텐츠를 한 번에 요약하거나, 관리 모드에서 고른 카드만 따로 묶어볼 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
