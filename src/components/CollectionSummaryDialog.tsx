'use client'

import { useEffect, useMemo, useState } from 'react'
import Icon from '@/components/Icon'
import { personaPresets } from '@/lib/personaPresets'
import { exportCollectionSummaryPdf } from '@/lib/exportCollectionSummaryPdf'
import {
  CollectionSummaryResponse,
  CollectionSummaryResult,
  ContentCard as CardType,
  PersonaPresetId,
  PersonaSummaryResult,
  SummaryMode,
  SummaryType,
} from '@/types'

interface CollectionSummaryDialogProps {
  isOpen: boolean
  onClose: () => void
  collectionName: string
  allCards: CardType[]
  selectedCards: CardType[]
}

function getCardsForMode(mode: SummaryMode, allCards: CardType[], selectedCards: CardType[]) {
  return mode === 'selected' ? selectedCards : allCards
}

function buildCollectionText(result: CollectionSummaryResult) {
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

function buildPersonaText(result: PersonaSummaryResult) {
  return [
    `${result.personaLabel}\n${result.personaDescription}`,
    `이 렌즈가 보는 핵심\n${result.lensSummary}`,
    `높이 볼 점\n${result.strengths.map((item) => `- ${item}`).join('\n')}`,
    `경계할 점\n${result.cautions.map((item) => `- ${item}`).join('\n')}`,
    `이 관점에서 다시 묶는 기준\n${result.reframingCriteria.map((item) => `- ${item}`).join('\n')}`,
    `다음 질문\n${result.suggestedQuestions.map((item) => `- ${item}`).join('\n')}`,
  ].join('\n\n')
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
  const [summaryType, setSummaryType] = useState<SummaryType>('collection')
  const [personaPresetId, setPersonaPresetId] = useState<PersonaPresetId>('toegye')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CollectionSummaryResponse | null>(null)
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

  const selectedPersonaPreset =
    personaPresets.find((preset) => preset.id === personaPresetId) ?? personaPresets[0]

  useEffect(() => {
    if (!isOpen) return

    const nextMode: SummaryMode = selectedCards.length > 0 ? 'selected' : 'all'
    setMode(nextMode)
    setGeneratedMode(nextMode)
    setSummaryType('collection')
    setPersonaPresetId('toegye')
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

  async function handleGenerate(nextMode: SummaryMode = mode, nextSummaryType: SummaryType = summaryType) {
    const cards = getCardsForMode(nextMode, allCards, selectedCards)

    if (cards.length === 0) {
      setError('요약할 콘텐츠를 먼저 선택해 주세요.')
      return
    }

    setMode(nextMode)
    setSummaryType(nextSummaryType)
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
          summaryType: nextSummaryType,
          personaPresetId,
        }),
      })

      const data = (await response.json()) as CollectionSummaryResponse & { error?: string }

      if (!response.ok) {
        setError(data.error ?? '요약을 불러오지 못했습니다.')
        setResult(null)
        return
      }

      setResult(data)
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
      const text = result.summaryType === 'persona' ? buildPersonaText(result) : buildCollectionText(result)
      await navigator.clipboard.writeText(text)
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
      setError('PDF 창을 열지 못했습니다. 팝업 차단 여부를 확인해 주세요.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-surface-container-lowest shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/15 px-6 py-5">
          <div>
            <p className="type-micro mb-2 font-semibold text-secondary">AI로 요약하기</p>
            <h2 className="font-headline text-[1.35rem] leading-[1.3] text-primary">
              {collectionName} 컬렉션을 일반 요약과 인물 관점으로 다시 읽어보세요.
            </h2>
            <p className="type-body mt-2 text-on-surface-variant">
              기본 요약은 전체 흐름을 정리하고, 인물 관점 요약은 한 렌즈를 빌려 같은 자료를 다른 기준으로 다시 해석합니다.
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
              onClick={() => setSummaryType('collection')}
              className={`type-body rounded-full px-4 py-2 font-semibold transition-colors ${
                summaryType === 'collection'
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant/20 bg-surface text-on-surface hover:bg-surface-container'
              }`}
            >
              일반 요약
            </button>
            <button
              type="button"
              onClick={() => setSummaryType('persona')}
              className={`type-body rounded-full px-4 py-2 font-semibold transition-colors ${
                summaryType === 'persona'
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant/20 bg-surface text-on-surface hover:bg-surface-container'
              }`}
            >
              인물 관점 요약
            </button>

            <div className="type-micro rounded-full bg-surface-container px-3 py-2 text-on-surface-variant">
              지금 요약 대상 {availableCards.length}개
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setMode('all')}
              disabled={loading}
              className={`type-body rounded-full px-4 py-2 font-semibold transition-colors ${
                mode === 'all'
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'border border-outline-variant/20 bg-surface text-on-surface hover:bg-surface-container'
              }`}
            >
              전체 콘텐츠
            </button>
            <button
              type="button"
              onClick={() => setMode('selected')}
              disabled={loading || selectedCards.length === 0}
              className={`type-body rounded-full px-4 py-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                mode === 'selected'
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'border border-outline-variant/20 bg-surface text-on-surface hover:bg-surface-container'
              }`}
            >
              선택한 콘텐츠 {selectedCards.length > 0 ? `(${selectedCards.length})` : ''}
            </button>
          </div>

          {summaryType === 'persona' && (
            <div className="mb-5 rounded-[24px] border border-outline-variant/15 bg-surface px-5 py-5">
              <div className="mb-4">
                <p className="type-micro mb-2 font-semibold text-secondary">인물 관점 프리셋</p>
                <p className="type-body text-on-surface-variant">
                  말투를 흉내 내는 대신, 각 인물이 중요하게 볼 기준과 질문을 렌즈처럼 빌려 컬렉션을 다시 읽습니다.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {personaPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setPersonaPresetId(preset.id)}
                    className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                      personaPresetId === preset.id
                        ? 'border-secondary bg-secondary-container/45'
                        : 'border-outline-variant/15 bg-surface-container-low hover:bg-surface-container'
                    }`}
                  >
                    <p className="type-body font-semibold text-primary">{preset.label}</p>
                    <p className="type-micro mt-2 text-on-surface-variant">{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-5 rounded-[24px] bg-[#e6efe7] px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-headline text-[1.08rem] text-primary">
                  {summaryType === 'persona'
                    ? `${selectedPersonaPreset.label}로 컬렉션을 다시 읽습니다.`
                    : '흩어진 자료를 한 번에 훑어볼 수 있는 요약본으로 정리합니다.'}
                </p>
                <p className="type-body mt-2 text-on-surface-variant">
                  {summaryType === 'persona'
                    ? '한 인물의 지식과 철학을 렌즈처럼 가져와, 이 자료 묶음의 강점과 경계점을 다시 도출합니다.'
                    : '카드 요약, 메모, 태그를 모아 공통 흐름과 겹치는 포인트를 빠르게 정리합니다.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleGenerate(mode, summaryType)}
                disabled={loading || availableCards.length === 0}
                className="type-body rounded-full bg-primary px-5 py-3 font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? '정리하는 중...' : summaryType === 'persona' ? '인물 렌즈로 요약 시작' : 'AI로 요약 시작'}
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
                    <p className="type-micro font-semibold text-secondary">
                      {result.summaryType === 'persona' ? result.personaLabel : '한눈에 보기'}
                    </p>
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

                {result.summaryType === 'persona' ? (
                  <>
                    <h3 className="font-headline text-[1.18rem] text-primary">{result.personaLabel}</h3>
                    <p className="type-body mt-2 text-on-surface-variant">{result.personaDescription}</p>
                    <p className="type-body mt-4 text-on-surface">{result.lensSummary}</p>
                  </>
                ) : (
                  <p className="type-body text-on-surface">{result.overview}</p>
                )}

                {result.usedFallback && (
                  <div className="mt-4 rounded-2xl bg-[#FFF4D6] px-4 py-3">
                    <p className="type-micro font-semibold text-[#7A5A11]">
                      API 키가 없어 기본 합성 요약으로 정리했습니다. 연결하면 더 정교한 요약으로 바뀝니다.
                    </p>
                  </div>
                )}
              </div>

              {result.summaryType === 'persona' ? (
                <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
                  <div className="space-y-5">
                    <div className="rounded-[28px] bg-surface px-5 py-5">
                      <p className="type-micro mb-3 font-semibold text-secondary">높이 볼 점</p>
                      <div className="space-y-3">
                        {result.strengths.map((item, index) => (
                          <div key={`${item}-${index}`} className="rounded-2xl bg-surface-container-low px-4 py-4">
                            <p className="type-body text-on-surface">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[28px] bg-surface px-5 py-5">
                      <p className="type-micro mb-3 font-semibold text-secondary">경계할 점</p>
                      <div className="space-y-3">
                        {result.cautions.map((item, index) => (
                          <div key={`${item}-${index}`} className="rounded-2xl bg-surface-container-low px-4 py-4">
                            <p className="type-body text-on-surface">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-[28px] bg-[#f7f1e2] px-5 py-5">
                      <p className="type-micro mb-3 font-semibold text-[#7A5A11]">이 관점에서 다시 묶는 기준</p>
                      <ul className="space-y-2">
                        {result.reframingCriteria.map((item) => (
                          <li key={item} className="type-body flex items-start gap-2 text-on-surface">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C89119]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-[28px] bg-surface px-5 py-5">
                      <p className="type-micro mb-3 font-semibold text-secondary">이 렌즈에서 중요한 카드</p>
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
                      <p className="type-micro mb-3 font-semibold text-secondary">다음 질문</p>
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
              ) : (
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
              )}
            </div>
          )}

          {!result && !error && (
            <div className="rounded-[28px] border border-dashed border-outline-variant/25 px-6 py-14 text-center">
              <p className="font-headline text-[1.1rem] text-primary">
                {summaryType === 'persona' ? '인물의 렌즈로 컬렉션을 다시 읽을 준비가 되어 있습니다.' : '컬렉션을 묶어 한 번에 정리할 준비가 되어 있습니다.'}
              </p>
              <p className="type-body mt-2 text-on-surface-variant">
                {summaryType === 'persona'
                  ? '프리셋 하나를 고르고, 전체 콘텐츠나 선택한 카드만 따로 묶어 관점 중심 요약을 만들 수 있습니다.'
                  : '전체 콘텐츠를 한 번에 요약하거나, 관리 모드에서 고른 카드만 따로 묶어볼 수 있습니다.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
