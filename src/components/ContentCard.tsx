'use client'

import { useEffect, useState, type DragEvent, type KeyboardEvent } from 'react'
import Image from 'next/image'
import Icon from '@/components/Icon'
import { ApiAuthError, apiFetch } from '@/lib/apiClient'
import { parseTagInput } from '@/lib/tags'
import { ContentCard as CardType, CurationFolder } from '@/types'

const PLATFORM_LABELS: Record<string, string> = {
  youtube: '유튜브',
  brunch: '브런치',
  facebook: '페이스북',
  linkedin: '링크드인',
  instagram: '인스타그램',
  naver: '네이버',
  twitter: '엑스',
  text: '텍스트',
  other: '링크',
}

const PLATFORM_BADGE: Record<string, { bg: string; text: string }> = {
  youtube: { bg: 'bg-[#FF0000]', text: 'text-white' },
  linkedin: { bg: 'bg-[#0A66C2]', text: 'text-white' },
  facebook: { bg: 'bg-[#1877F2]', text: 'text-white' },
  instagram: {
    bg: 'bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737]',
    text: 'text-white',
  },
  naver: { bg: 'bg-[#03C75A]', text: 'text-white' },
  brunch: { bg: 'bg-[#1A1A1A]', text: 'text-white' },
  twitter: { bg: 'bg-[#000000]', text: 'text-white' },
  text: { bg: 'bg-surface-container-high', text: 'text-on-surface-variant' },
  other: { bg: 'bg-surface-container-high', text: 'text-on-surface-variant' },
}

const actionButtonClass =
  'type-micro min-w-0 flex-1 inline-flex items-center justify-center rounded-full border border-outline-variant/20 px-2.5 py-2 font-semibold text-on-surface transition-colors hover:border-secondary/30 hover:bg-secondary-container/60 hover:text-secondary disabled:cursor-not-allowed disabled:opacity-50'

const iconActionButtonClass =
  'shrink-0 rounded-full p-1.5 text-outline transition-colors hover:bg-surface-container'

const PLATFORM_PLACEHOLDER_STYLE: Record<string, { background: string; accent: string; panel: string }> = {
  youtube: {
    background: 'linear-gradient(135deg, #fff1ef 0%, #f6d5d0 100%)',
    accent: '#9f1c1c',
    panel: 'rgba(255,255,255,0.84)',
  },
  linkedin: {
    background: 'linear-gradient(135deg, #eef6ff 0%, #d7e8ff 100%)',
    accent: '#0A66C2',
    panel: 'rgba(255,255,255,0.84)',
  },
  facebook: {
    background: 'linear-gradient(135deg, #edf4ff 0%, #d9e7ff 100%)',
    accent: '#185ec7',
    panel: 'rgba(255,255,255,0.84)',
  },
  instagram: {
    background: 'linear-gradient(135deg, #fff2f7 0%, #f8e0e7 48%, #f7ead7 100%)',
    accent: '#b63a68',
    panel: 'rgba(255,255,255,0.82)',
  },
  naver: {
    background: 'linear-gradient(135deg, #edf8f1 0%, #d9efdf 100%)',
    accent: '#148447',
    panel: 'rgba(255,255,255,0.84)',
  },
  brunch: {
    background: 'linear-gradient(135deg, #f3efe8 0%, #e2ddd5 100%)',
    accent: '#54483d',
    panel: 'rgba(255,255,255,0.82)',
  },
  twitter: {
    background: 'linear-gradient(135deg, #eef1f5 0%, #dce1ea 100%)',
    accent: '#27303f',
    panel: 'rgba(255,255,255,0.84)',
  },
  text: {
    background: 'linear-gradient(135deg, #f6f0e4 0%, #ebdfca 100%)',
    accent: '#7A5A11',
    panel: 'rgba(255,255,255,0.82)',
  },
  other: {
    background: 'linear-gradient(135deg, #f1eee8 0%, #e4ded2 100%)',
    accent: '#5b5247',
    panel: 'rgba(255,255,255,0.82)',
  },
}

function getPlatformBadge(platform: string) {
  return PLATFORM_BADGE[platform] ?? {
    bg: 'bg-surface-container-high',
    text: 'text-on-surface-variant',
  }
}

function getHostname(url?: string) {
  if (!url) return ''

  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function getPlaceholderStyle(platform: string) {
  return PLATFORM_PLACEHOLDER_STYLE[platform] ?? PLATFORM_PLACEHOLDER_STYLE.other
}

function trimPreviewText(value: string, maxLength = 120) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength).trim()}...` : normalized
}

interface FallbackMediaProps {
  card: CardType
  hostname: string
  isUnassigned: boolean
  badge: { bg: string; text: string }
  memoLabel: string
  interactive?: boolean
  onClick?: () => void
}

function FallbackMedia({
  card,
  hostname,
  isUnassigned,
  badge,
  memoLabel,
  interactive = false,
  onClick,
}: FallbackMediaProps) {
  const placeholderStyle = getPlaceholderStyle(card.platform)
  const previewLabel = card.platform === 'text' ? '직접 입력한 텍스트' : hostname || '저장한 링크'
  const previewBody = trimPreviewText(
    card.keyInsight || card.summary[0] || card.contextMemo || '메모를 열어 저장한 이유를 정리해 보세요.',
    110,
  )
  const previewTag = card.tags[0]

  const content = (
    <div className="relative aspect-video overflow-hidden" style={{ background: placeholderStyle.background }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.75),_transparent_36%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.42),_transparent_34%)]" />

      <div className="absolute inset-0 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="type-micro font-semibold" style={{ color: placeholderStyle.accent }}>
              {previewLabel}
            </p>
            <span className="mt-2 inline-flex rounded-full bg-white/72 px-2.5 py-1 text-[0.72rem] font-semibold leading-none tracking-[-0.01em] text-on-surface-variant">
              썸네일 없음
            </span>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {isUnassigned && (
              <span className="type-micro rounded-full bg-[#FFF1C7] px-2.5 py-0.5 font-semibold text-[#7A5A11] shadow-sm">
                미분류
              </span>
            )}
            <span
              className={`${badge.bg} ${badge.text} type-micro rounded-full px-2.5 py-0.5 font-bold shadow-sm`}
            >
              {PLATFORM_LABELS[card.platform] ?? card.platform}
            </span>
          </div>
        </div>

        <div className="mt-5 max-w-[78%]">
          <p className="line-clamp-3 font-headline text-[1.2rem] leading-[1.18] text-primary">
            {card.title}
          </p>
        </div>

        <div className="absolute inset-x-4 bottom-4">
          <div
            className="rounded-2xl px-4 py-3 shadow-sm backdrop-blur"
            style={{ backgroundColor: placeholderStyle.panel }}
          >
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="type-micro font-semibold" style={{ color: placeholderStyle.accent }}>
                {memoLabel}
              </span>
              {previewTag && (
                <span className="type-micro rounded-full bg-white/80 px-2.5 py-1 font-semibold text-on-surface-variant">
                  #{previewTag}
                </span>
              )}
            </div>
            <p className="type-body line-clamp-2 text-on-surface-variant">{previewBody}</p>
          </div>
        </div>
      </div>
    </div>
  )

  if (!interactive) {
    return content
  }

  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      {content}
    </button>
  )
}

interface ContentCardProps {
  card: CardType
  folders: CurationFolder[]
  highlight?: boolean
  isManaging?: boolean
  readOnly?: boolean
  isSelected?: boolean
  selectedCardIds?: Set<string>
  onToggleSelect?: () => void
}

export default function ContentCard({
  card,
  folders,
  highlight = false,
  isManaging = false,
  readOnly = false,
  isSelected = false,
  selectedCardIds = new Set(),
  onToggleSelect,
}: ContentCardProps) {
  const isAnalyzing = card.status === 'saving' || card.status === 'analyzing'
  const [showFolderPicker, setShowFolderPicker] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [showMemoEditor, setShowMemoEditor] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [memoDraft, setMemoDraft] = useState(card.contextMemo ?? '')
  const [memoValue, setMemoValue] = useState(card.contextMemo ?? '')
  const [tagDraft, setTagDraft] = useState((card.tags ?? []).join(', '))
  const [tagValue, setTagValue] = useState(card.tags ?? [])
  const [savingMemo, setSavingMemo] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [shareFeedback, setShareFeedback] = useState('')

  const cardFolderIds = card.folderIds ?? []
  const assignableFolders = folders.filter((folder) => !cardFolderIds.includes(folder.id))
  const isUnassigned = cardFolderIds.length === 0
  const badge = getPlatformBadge(card.platform)
  const normalizedMemoDraft = memoDraft.trim()
  const normalizedMemoValue = memoValue.trim()
  const memoChanged = normalizedMemoDraft !== normalizedMemoValue
  const normalizedTagDraft = parseTagInput(tagDraft)
  const tagsChanged = normalizedTagDraft.join('|') !== tagValue.join('|')
  const metadataChanged = memoChanged || tagsChanged
  const visibleTags = tagValue
  const hostname = getHostname(card.url)
  const memoButtonLabel = readOnly ? '메모 보기' : '메모'
  const thumbnailMemoLabel = readOnly ? '메모 보기' : '메모 작성'
  const previewText = trimPreviewText(
    memoValue || card.keyInsight || card.summary[0] || hostname || '저장한 콘텐츠를 다시 펼쳐볼 수 있어요.',
    120,
  )
  const analysisError = card.analysisError?.trim() ?? ''
  const analysisWarnings = card.analysisWarnings ?? []
  const hasDetails = Boolean(
    memoValue ||
      card.summary.length > 0 ||
      visibleTags.length > 0 ||
      cardFolderIds.length > 0 ||
      hostname ||
      analysisError ||
      analysisWarnings.length > 0,
  )

  useEffect(() => {
    const nextMemo = card.contextMemo ?? ''
    setMemoDraft(nextMemo)
    setMemoValue(nextMemo)
  }, [card.contextMemo])

  useEffect(() => {
    const nextTags = card.tags ?? []
    setTagDraft(nextTags.join(', '))
    setTagValue(nextTags)
  }, [card.tags])

  useEffect(() => {
    if (!shareFeedback) return

    const timeoutId = window.setTimeout(() => {
      setShareFeedback('')
    }, 2200)

    return () => window.clearTimeout(timeoutId)
  }, [shareFeedback])

  function closeEditor() {
    setShowMemoEditor(false)
    setMemoDraft(memoValue)
    setTagDraft(tagValue.join(', '))
  }

  async function assignToFolder(folderId: string) {
    setAssigning(true)

    try {
      await apiFetch('/api/folders', {
        method: 'PATCH',
        requireAuth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, cardId: card.id }),
      })
      setShareFeedback('컬렉션에 담았어요.')
    } catch (error) {
      alert(
        error instanceof ApiAuthError
          ? '컬렉션에 담으려면 다시 로그인해 주세요.'
          : '컬렉션에 담지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
    } finally {
      setAssigning(false)
      setShowFolderPicker(false)
    }
  }

  async function removeFromFolder(folderId: string) {
    try {
      await apiFetch('/api/folders', {
        method: 'DELETE',
        requireAuth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, cardId: card.id }),
      })
      setShareFeedback('컬렉션에서 뺐어요.')
    } catch (error) {
      alert(
        error instanceof ApiAuthError
          ? '컬렉션을 수정하려면 다시 로그인해 주세요.'
          : '컬렉션에서 빼지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
    }
  }

  async function deleteCard() {
    const confirmed = confirm('이 콘텐츠를 삭제할까요?')
    if (!confirmed) return

    try {
      await apiFetch(`/api/cards/${card.id}`, {
        method: 'DELETE',
        requireAuth: true,
      })
    } catch (error) {
      alert(
        error instanceof ApiAuthError
          ? '콘텐츠를 삭제하려면 다시 로그인해 주세요.'
          : '콘텐츠를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
    }
  }

  async function saveMetadata() {
    setSavingMemo(true)

    try {
      const response = await apiFetch(`/api/cards/${card.id}`, {
        method: 'PATCH',
        requireAuth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextMemo: normalizedMemoDraft,
          tags: normalizedTagDraft,
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error('메모 저장 실패')
      }

      const nextMemo =
        typeof result?.contextMemo === 'string' ? result.contextMemo : normalizedMemoDraft
      const nextTags = Array.isArray(result?.tags)
        ? result.tags.filter((tag: unknown): tag is string => typeof tag === 'string')
        : normalizedTagDraft

      setMemoValue(nextMemo)
      setMemoDraft(nextMemo)
      setTagValue(nextTags)
      setTagDraft(nextTags.join(', '))
      setShowMemoEditor(false)
      setShareFeedback('메모와 태그를 저장했어요.')
    } catch {
      alert('메모나 태그를 저장하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setSavingMemo(false)
    }
  }

  async function handleReanalyze() {
    setReanalyzing(true)

    try {
      await apiFetch(`/api/cards/${card.id}`, {
        method: 'POST',
        requireAuth: true,
      })
      setShareFeedback('다시 분석을 시작했어요.')
    } catch (error) {
      alert(
        error instanceof ApiAuthError
          ? '다시 분석하려면 다시 로그인해 주세요.'
          : '재분석을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
    } finally {
      setReanalyzing(false)
    }
  }

  function handleMemoKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (readOnly || savingMemo || !metadataChanged) return

    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      void saveMetadata()
    }
  }

  async function shareCard() {
    if (!card.url) return

    try {
      if (navigator.share) {
        await navigator.share({
          title: card.title,
          text: memoValue || card.keyInsight || undefined,
          url: card.url,
        })
        return
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(card.url)
        setShareFeedback('링크를 복사했어요.')
        return
      }

      window.prompt('아래 링크를 복사해 주세요.', card.url)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      alert('공유하지 못했습니다. 다시 시도해 주세요.')
    }
  }

  function handleDragStart(event: DragEvent) {
    const ids = isSelected ? JSON.stringify([...selectedCardIds]) : JSON.stringify([card.id])
    event.dataTransfer.setData('cardIds', ids)
    event.dataTransfer.effectAllowed = 'move'
  }

  if (isAnalyzing) {
    return (
      <div className="overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-container-lowest">
        <div className="aspect-video bg-surface-container shimmer" />
        <div className="space-y-3 p-5">
          <div className="h-3 w-1/4 rounded bg-surface-container-high shimmer" />
          <div className="h-5 w-full rounded bg-surface-container shimmer" />
          <div className="h-4 w-3/4 rounded bg-surface-container-low shimmer" />
        </div>
      </div>
    )
  }

  if (isManaging) {
    return (
      <article
        draggable
        onDragStart={handleDragStart}
        onClick={onToggleSelect}
        className={`relative cursor-pointer select-none overflow-hidden rounded-xl border transition-all duration-150 ${
          isSelected
            ? 'border-secondary bg-surface-container-lowest ring-2 ring-secondary/40'
            : isUnassigned
              ? 'border-[#E2B24D] bg-[#FFF9EC] hover:border-[#C89119]'
              : 'border-outline-variant/10 bg-surface-container-lowest hover:border-secondary/40'
        }`}
      >
        <div className="absolute left-3 top-3 z-10">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
              isSelected ? 'border-secondary bg-secondary' : 'border-white/80 bg-black/20'
            }`}
          >
            {isSelected && <Icon name="check" className="h-3.5 w-3.5 text-on-secondary" />}
          </div>
        </div>

        <div className="absolute right-3 top-3 z-10 opacity-70">
          <Icon name="drag" className="h-[18px] w-[18px] text-white drop-shadow" />
        </div>

        {card.thumbnailUrl ? (
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={card.thumbnailUrl}
              alt={card.title}
              fill
              unoptimized
              className="object-cover opacity-90"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
        ) : (
          <FallbackMedia
            card={card}
            hostname={hostname}
            isUnassigned={isUnassigned}
            badge={badge}
            memoLabel={memoButtonLabel}
          />
        )}

        <div className="p-4">
          {isUnassigned && (
            <span className="type-micro mb-2 inline-flex rounded-full bg-[#FFF1C7] px-2.5 py-1 font-semibold text-[#7A5A11]">
              미분류
            </span>
          )}
          <p className="line-clamp-2 font-headline text-[1rem] leading-[1.35] text-primary">
            {card.title}
          </p>
          {card.keyInsight && (
            <p className="type-micro mt-1 line-clamp-2 text-on-surface-variant">{card.keyInsight}</p>
          )}
        </div>
      </article>
    )
  }

  return (
    <>
      <article
        className={`group overflow-hidden rounded-xl border bg-surface-container-lowest ${
          highlight
            ? 'ring-2 ring-secondary/40'
            : isUnassigned
              ? 'border-[#E2B24D] shadow-[0_0_0_1px_rgba(226,178,77,0.18)]'
              : 'border-outline-variant/10'
        }`}
      >
        {card.thumbnailUrl ? (
          <button
            type="button"
            onClick={() => setShowMemoEditor(true)}
            className="relative block aspect-video w-full overflow-hidden text-left"
          >
            <Image
              src={card.thumbnailUrl}
              alt={card.title}
              fill
              unoptimized
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent px-4 py-3">
              <span className="type-micro inline-flex rounded-full bg-white/92 px-2.5 py-1 font-semibold text-slate-800 shadow-sm">
                {thumbnailMemoLabel}
              </span>
            </div>

            <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
              {isUnassigned && (
                <span className="type-micro rounded-full bg-[#FFF1C7] px-2.5 py-0.5 font-semibold text-[#7A5A11] shadow-sm">
                  미분류
                </span>
              )}
              <span
                className={`${badge.bg} ${badge.text} type-micro rounded-full px-2.5 py-0.5 font-bold shadow-sm`}
              >
                {PLATFORM_LABELS[card.platform] ?? card.platform}
              </span>
            </div>
          </button>
        ) : (
          <FallbackMedia
            card={card}
            hostname={hostname}
            isUnassigned={isUnassigned}
            badge={badge}
            memoLabel={thumbnailMemoLabel}
            interactive
            onClick={() => setShowMemoEditor(true)}
          />
        )}

        <div className="p-5">
          {card.status === 'error' && (
            <p className="type-micro mb-2 text-error">분석 중 문제가 생겨 기본 정보만 보여주고 있어요.</p>
          )}

          <h4 className="mb-2 line-clamp-2 font-headline text-[1.12rem] leading-[1.38] text-primary transition-colors group-hover:text-secondary">
            {card.title}
          </h4>

          <p className="type-body mb-4 line-clamp-2 text-on-surface-variant">{previewText}</p>

          {hasDetails && (
            <button
              type="button"
              onClick={() => setShowDetails((value) => !value)}
              className="type-micro mb-4 inline-flex items-center gap-1 rounded-full border border-outline-variant/20 px-3 py-1.5 font-semibold text-on-surface-variant transition-colors hover:border-secondary/30 hover:bg-surface-container hover:text-primary"
            >
              <span>{showDetails ? '세부 정보 닫기' : '세부 정보 보기'}</span>
              <Icon
                name={showDetails ? 'chevron-down' : 'chevron-right'}
                className="h-3.5 w-3.5"
              />
            </button>
          )}

          {showDetails && (
            <div className="mb-4 space-y-4 rounded-2xl bg-surface-container px-4 py-4">
              {memoValue && (
                <button
                  type="button"
                  onClick={() => setShowMemoEditor(true)}
                  className="block w-full rounded-2xl border border-secondary/15 bg-secondary-container/45 px-4 py-3 text-left transition-colors hover:bg-secondary-container/65"
                >
                  <p className="type-micro mb-1 font-semibold text-secondary">메모</p>
                  <p className="type-body line-clamp-4 whitespace-pre-line text-on-surface">{memoValue}</p>
                </button>
              )}

              {card.summary.length > 0 && (
                <ul className="space-y-1.5">
                  {card.summary.slice(0, 2).map((line, index) => (
                    <li
                      key={index}
                      className="type-micro flex items-start gap-2 font-medium text-on-tertiary-container"
                    >
                      <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-3">{line}</span>
                    </li>
                  ))}
                </ul>
              )}

              {visibleTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {visibleTags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="type-micro rounded-full bg-tertiary-fixed px-2.5 py-0.5 font-medium text-on-tertiary-fixed"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {cardFolderIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {cardFolderIds.map((folderId) => {
                    const folder = folders.find((item) => item.id === folderId)

                    if (!folder) return null

                    if (readOnly) {
                      return (
                        <span
                          key={folderId}
                          className="type-micro rounded-full bg-secondary-container px-2 py-0.5 font-medium text-on-secondary-container"
                        >
                          {folder.name}
                        </span>
                      )
                    }

                    return (
                      <button
                        key={folderId}
                        onClick={() => removeFromFolder(folderId)}
                        className="type-micro group flex items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 font-medium text-on-secondary-container transition-colors hover:bg-error-container hover:text-on-error-container"
                        title="폴더에서 제거"
                      >
                        {folder.name}
                        <Icon
                          name="close"
                          className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </button>
                    )
                  })}
                </div>
              )}

              {hostname && (
                <p className="type-micro truncate text-on-surface-variant">{hostname}</p>
              )}

              {(analysisWarnings.length > 0 || analysisError) && (
                <div className="rounded-2xl border border-outline-variant/15 bg-surface px-3 py-3">
                  <p className="type-micro mb-2 font-semibold text-primary">분석 메모</p>
                  {analysisError && <p className="type-micro mb-2 text-error">{analysisError}</p>}
                  {analysisWarnings.length > 0 && (
                    <ul className="space-y-1">
                      {analysisWarnings.map((warning) => (
                        <li key={warning} className="type-micro text-on-surface-variant">
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={handleReanalyze}
                      disabled={reanalyzing}
                      className="type-micro mt-3 font-semibold text-secondary underline underline-offset-4 disabled:opacity-40"
                    >
                      {reanalyzing ? '재분석 중...' : '이 카드 다시 분석하기'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 border-t border-outline-variant/15 pt-3">
            {shareFeedback && <p className="type-micro text-secondary">{shareFeedback}</p>}

            <div className="relative flex items-center gap-1.5">
              {!readOnly && card.status === 'error' && (
                <button
                  type="button"
                  onClick={handleReanalyze}
                  disabled={reanalyzing}
                  className={actionButtonClass}
                >
                  <span className="truncate">{reanalyzing ? '재분석 중...' : '다시 분석'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowMemoEditor(true)}
                className={actionButtonClass}
              >
                <span className="truncate">{memoButtonLabel}</span>
              </button>

              {card.url && (
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={actionButtonClass}
                >
                  <span className="truncate">바로가기</span>
                </a>
              )}

              {card.url && (
                <button type="button" onClick={shareCard} className={actionButtonClass}>
                  <span className="truncate">공유</span>
                </button>
              )}

              {!readOnly && assignableFolders.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowFolderPicker((value) => !value)}
                  className={`${iconActionButtonClass} hover:text-secondary`}
                  title="폴더에 추가"
                >
                  <Icon name="bookmark" className="h-[18px] w-[18px]" />
                </button>
              )}

              {!readOnly && (
                <button
                  type="button"
                  onClick={deleteCard}
                  className={`${iconActionButtonClass} hover:text-error`}
                  title="삭제"
                >
                  <Icon name="trash" className="h-[18px] w-[18px]" />
                </button>
              )}

              {!readOnly && showFolderPicker && (
                <div className="absolute bottom-10 right-0 z-10 min-w-36 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-1.5 shadow-lg">
                  {assignableFolders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => assignToFolder(folder.id)}
                      disabled={assigning}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-on-surface transition-colors hover:bg-surface-container"
                    >
                      {folder.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </article>

      {showMemoEditor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
          onClick={() => {
            if (!savingMemo) {
              closeEditor()
            }
          }}
        >
          <div
            className="w-full max-w-xl rounded-[28px] border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="type-micro mb-1 font-semibold text-secondary">메모와 태그</p>
                <h5 className="font-headline text-[1.08rem] leading-[1.45] text-primary">{card.title}</h5>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-full p-1.5 text-outline transition-colors hover:bg-surface-container hover:text-primary"
                aria-label="메모 닫기"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <textarea
              value={readOnly ? memoValue : memoDraft}
              onChange={(event) => setMemoDraft(event.target.value)}
              onKeyDown={handleMemoKeyDown}
              readOnly={readOnly}
              rows={8}
              placeholder="이 콘텐츠를 왜 저장했는지, 어디에 쓰고 싶은지 메모해 보세요."
              className={`type-body w-full rounded-2xl border border-outline-variant/20 bg-surface px-4 py-3 text-on-surface outline-none transition-colors placeholder:text-on-surface-variant ${
                readOnly
                  ? 'cursor-default text-on-surface-variant'
                  : 'focus:border-secondary/40 focus:ring-2 focus:ring-secondary/15'
              }`}
            />

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="type-micro font-semibold text-secondary">태그</p>
                {!readOnly && (
                  <p className="type-micro text-on-surface-variant">쉼표로 구분해서 입력해 주세요.</p>
                )}
              </div>

              {normalizedTagDraft.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {normalizedTagDraft.map((tag) => (
                    <span
                      key={tag}
                      className="type-micro rounded-full bg-tertiary-fixed px-2.5 py-1 font-medium text-on-tertiary-fixed"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <input
                value={readOnly ? tagValue.join(', ') : tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                readOnly={readOnly}
                placeholder="예: 음악 모음, 인터뷰, 레퍼런스"
                className={`type-body w-full rounded-2xl border border-outline-variant/20 bg-surface px-4 py-3 text-on-surface outline-none transition-colors placeholder:text-on-surface-variant ${
                  readOnly
                    ? 'cursor-default text-on-surface-variant'
                    : 'focus:border-secondary/40 focus:ring-2 focus:ring-secondary/15'
                }`}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              {card.url ? (
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="type-micro font-semibold text-secondary hover:text-primary"
                >
                  원문 바로가기
                </a>
              ) : (
                <span className="type-micro text-on-surface-variant">링크 없는 텍스트 콘텐츠</span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeEditor}
                  className={`${actionButtonClass} border-transparent bg-surface-container`}
                >
                  <span className="truncate">닫기</span>
                </button>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={saveMetadata}
                    disabled={savingMemo || !metadataChanged}
                    className="type-micro inline-flex items-center justify-center rounded-full bg-secondary px-4 py-2 font-semibold text-on-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {savingMemo ? '저장 중...' : '저장'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
