'use client'

import { useEffect, useMemo, useState } from 'react'
import Icon from '@/components/Icon'
import { apiFetch } from '@/lib/apiClient'
import { buildInstagramStoryCaption, exportInstagramStory } from '@/lib/exportInstagramStory'
import { buildSharePath, isValidShareSlug, normalizeShareSlug } from '@/lib/shareSlug'
import { ContentCard as CardType, CurationFolder } from '@/types'

interface FolderExportDialogProps {
  folder: CurationFolder | null
  cards?: CardType[]
  isOpen: boolean
  onClose: () => void
  currentUserUid?: string
}

function formatDuration(ms: number) {
  if (ms <= 0) return '0초'

  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) return `${seconds}초`
  if (seconds === 0) return `${minutes}분`
  return `${minutes}분 ${seconds}초`
}

export default function FolderExportDialog({
  folder,
  cards = [],
  isOpen,
  onClose,
  currentUserUid,
}: FolderExportDialogProps) {
  const [isPublic, setIsPublic] = useState(false)
  const [shareSlug, setShareSlug] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [origin, setOrigin] = useState('')
  const [instaLoading, setInstaLoading] = useState(false)

  const isOwner = !!folder && !!currentUserUid && (!folder.ownerUid || folder.ownerUid === currentUserUid)
  const canEdit = !!folder && isOwner
  const normalizedShareSlug = normalizeShareSlug(shareSlug || folder?.shareSlug || folder?.name || '')
  const previewPath = normalizedShareSlug ? buildSharePath(normalizedShareSlug) : ''
  const previewUrl = origin && previewPath ? `${origin}${previewPath}` : previewPath
  const analytics = folder?.analytics
  const viewCount = analytics?.viewCount ?? 0
  const uniqueVisitorCount = analytics?.uniqueVisitorCount ?? 0
  const averageDwellMs = viewCount > 0 ? Math.round((analytics?.totalDwellMs ?? 0) / viewCount) : 0
  const averageViewedContent = viewCount > 0 ? (analytics?.totalCardsViewed ?? 0) / viewCount : 0
  const followerCount = folder?.followerCount ?? 0
  const emailSubscriberCount = folder?.emailSubscriberCount ?? 0

  const topViewedContent = useMemo(() => {
    if (!folder?.analytics?.cardViewCounts) return null

    const topEntry = Object.entries(folder.analytics.cardViewCounts).sort((a, b) => b[1] - a[1])[0]
    if (!topEntry) return null

    const [cardId, count] = topEntry
    const matchedCard = cards.find((card) => card.id === cardId)

    return {
      title: matchedCard?.title ?? '삭제되었거나 불러오지 못한 콘텐츠',
      count,
    }
  }, [cards, folder?.analytics?.cardViewCounts])

  useEffect(() => {
    if (!isOpen || !folder) return

    setOrigin(window.location.origin)
    setIsPublic(Boolean(folder.isPublic))
    setShareSlug(folder.shareSlug || normalizeShareSlug(folder.name))
    setSaving(false)
    setFeedback('')
    setError('')
    setInstaLoading(false)
  }, [folder, isOpen])

  useEffect(() => {
    if (!feedback) return

    const timeoutId = window.setTimeout(() => {
      setFeedback('')
    }, 2400)

    return () => window.clearTimeout(timeoutId)
  }, [feedback])

  if (!isOpen || !folder) return null

  async function handleSave() {
    if (!folder || !canEdit) return

    if (!isValidShareSlug(normalizedShareSlug)) {
      setError('링크 주소는 3자 이상 50자 이하로, 한글·영문·숫자·하이픈만 사용할 수 있어요.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await apiFetch('/api/folders', {
        method: 'PUT',
        requireAuth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: folder.id,
          isPublic,
          shareSlug: normalizedShareSlug,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error ?? '공개 설정을 저장하지 못했어요.')
        return
      }

      setShareSlug(result.shareSlug ?? normalizedShareSlug)
      setFeedback(isPublic ? '공개 링크를 저장했어요.' : '컬렉션을 비공개로 전환했어요.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCopy() {
    if (!previewUrl || !isPublic) return

    try {
      await navigator.clipboard.writeText(previewUrl)
      setFeedback('공개 링크를 복사했어요.')
    } catch {
      setError('링크를 복사하지 못했어요. 다시 시도해 주세요.')
    }
  }

  async function handleCopyInstagramCaption() {
    if (!folder) return

    if (!previewUrl || !isPublic) {
      setError('인스타 내보내기를 하려면 먼저 공개 링크를 만들어 주세요.')
      return
    }

    try {
      const caption = buildInstagramStoryCaption({
        folder,
        cards,
        shareUrl: previewUrl,
      })
      await navigator.clipboard.writeText(caption)
      setFeedback('인스타 캡션을 복사했어요.')
    } catch {
      setError('인스타 캡션을 복사하지 못했어요.')
    }
  }

  async function handleExportInstagramStory() {
    if (!folder) return

    if (!previewUrl || !isPublic) {
      setError('인스타 스토리로 내보내려면 먼저 공개 링크를 저장해 주세요.')
      return
    }

    setInstaLoading(true)
    setError('')

    try {
      await exportInstagramStory({
        folder,
        cards,
        shareUrl: previewUrl,
      })
      setFeedback('인스타 스토리 이미지를 저장했어요. 캡션과 링크도 함께 복사해 보세요.')
    } catch (nextError) {
      console.error('[instagram-story] export failed:', nextError)
      setError('인스타 스토리 이미지를 만들지 못했어요. 다시 시도해 주세요.')
    } finally {
      setInstaLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-t-3xl bg-surface-container-lowest p-6 shadow-2xl sm:rounded-3xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 transition-colors hover:bg-surface-container"
          aria-label="닫기"
        >
          <Icon name="close" className="h-5 w-5 text-on-surface-variant" />
        </button>

        <div className="mb-6 pr-10">
          <p className="type-micro mb-2 font-semibold text-secondary">컬렉션 내보내기</p>
          <h2 className="font-headline text-[1.35rem] leading-[1.35] text-primary">{folder.name}</h2>
          <p className="type-body mt-2 text-on-surface-variant">
            공개 링크를 만들고, 인스타 스토리 이미지와 캡션까지 한 번에 준비할 수 있어요.
          </p>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-outline-variant/20 bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="type-body font-semibold text-primary">공개 상태</p>
                <p className="type-micro mt-1 text-on-surface-variant">
                  비공개로 바꾸면 기존 링크는 더 이상 열리지 않아요.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`type-micro rounded-full px-3 py-1 font-semibold ${
                    isPublic
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {isPublic ? '공개 중' : '비공개'}
                </span>
                <button
                  type="button"
                  onClick={() => canEdit && setIsPublic((value) => !value)}
                  disabled={!canEdit}
                  className={`relative h-8 w-14 rounded-full transition-colors ${
                    isPublic ? 'bg-secondary' : 'bg-surface-container-high'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                  aria-label="공개 상태 전환"
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                      isPublic ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-outline-variant/20 bg-surface p-4">
            <p className="type-body font-semibold text-primary">공개 링크</p>
            <p className="type-micro mt-1 text-on-surface-variant">
              한글, 영문, 숫자, 하이픈만 사용할 수 있어요.
            </p>

            <div className="mt-3 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="type-micro text-on-surface-variant">{origin || 'https://your-domain'}/c/</span>
                <input
                  type="text"
                  value={shareSlug}
                  onChange={(event) => {
                    setShareSlug(normalizeShareSlug(event.target.value))
                    setError('')
                  }}
                  disabled={!canEdit}
                  maxLength={50}
                  placeholder="컬렉션 주소"
                  className="type-body min-w-0 flex-1 bg-transparent text-on-surface outline-none placeholder:text-outline disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {previewUrl && (
              <div className="mt-3 rounded-2xl bg-secondary-container/55 px-4 py-3">
                <p className="type-micro font-semibold text-secondary">미리보기 링크</p>
                <a
                  href={isPublic ? previewUrl : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`type-body mt-1 block break-all ${
                    isPublic ? 'text-primary hover:text-secondary' : 'text-on-surface-variant'
                  }`}
                >
                  {previewUrl}
                </a>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-outline-variant/20 bg-surface p-4">
            <div className="mb-4">
              <p className="type-body font-semibold text-primary">인스타 스토리로 내보내기</p>
              <p className="type-micro mt-1 text-on-surface-variant">
                1080x1920 스토리 이미지 1장과 함께 캡션, 공개 링크를 바로 복사할 수 있어요.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleExportInstagramStory}
                disabled={instaLoading}
                className="type-body inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icon name="download" className="h-4 w-4" />
                {instaLoading ? '스토리 생성 중...' : '스토리 PNG 저장'}
              </button>

              <button
                type="button"
                onClick={handleCopyInstagramCaption}
                className="type-body rounded-full border border-outline-variant/20 px-4 py-3 font-semibold text-on-surface transition-colors hover:bg-surface-container"
              >
                캡션 복사
              </button>

              <button
                type="button"
                onClick={handleCopy}
                disabled={!isPublic || !previewUrl}
                className="type-body rounded-full border border-outline-variant/20 px-4 py-3 font-semibold text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
              >
                링크 복사
              </button>
            </div>

            {!isPublic && (
              <p className="type-micro mt-3 font-semibold text-[#7A5A11]">
                인스타 내보내기를 하려면 먼저 이 컬렉션을 공개로 전환해 주세요.
              </p>
            )}
          </div>

          {!currentUserUid && (
            <div className="rounded-2xl border border-[#E2B24D]/40 bg-[#FFF5DB] px-4 py-3">
              <p className="type-micro font-semibold text-[#7A5A11]">
                공개 링크를 만들려면 먼저 로그인해 주세요.
              </p>
            </div>
          )}

          {currentUserUid && folder.ownerUid && folder.ownerUid !== currentUserUid && (
            <div className="rounded-2xl border border-outline-variant/20 bg-surface px-4 py-3">
              <p className="type-micro font-semibold text-primary">
                이 컬렉션은 {folder.ownerName ?? '다른 사용자'}가 만든 컬렉션이라 링크를 수정할 수 없어요.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-error/20 bg-error-container/35 px-4 py-3">
              <p className="type-micro font-semibold text-error">{error}</p>
            </div>
          )}

          {feedback && (
            <div className="rounded-2xl border border-secondary/20 bg-secondary-container/45 px-4 py-3">
              <p className="type-micro font-semibold text-secondary">{feedback}</p>
            </div>
          )}

          <div className="rounded-2xl border border-outline-variant/20 bg-surface p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="type-body font-semibold text-primary">공개 반응</p>
                <p className="type-micro mt-1 text-on-surface-variant">
                  링크 유입과 구독 반응을 함께 보면 컬렉션 운영 흐름이 보여요.
                </p>
              </div>
              {folder.isPublic && (
                <span className="type-micro rounded-full bg-secondary-container px-3 py-1 font-semibold text-on-secondary-container">
                  실시간 반영
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-surface-container-low px-4 py-4">
                <p className="type-micro text-on-surface-variant">팔로워</p>
                <p className="mt-2 font-headline text-[1.45rem] text-primary">{followerCount}</p>
              </div>
              <div className="rounded-2xl bg-surface-container-low px-4 py-4">
                <p className="type-micro text-on-surface-variant">메일 구독자</p>
                <p className="mt-2 font-headline text-[1.45rem] text-primary">{emailSubscriberCount}</p>
              </div>
              <div className="rounded-2xl bg-surface-container-low px-4 py-4">
                <p className="type-micro text-on-surface-variant">방문 수</p>
                <p className="mt-2 font-headline text-[1.45rem] text-primary">{viewCount}</p>
              </div>
              <div className="rounded-2xl bg-surface-container-low px-4 py-4">
                <p className="type-micro text-on-surface-variant">방문자 수</p>
                <p className="mt-2 font-headline text-[1.45rem] text-primary">{uniqueVisitorCount}</p>
              </div>
            </div>

            {viewCount > 0 ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-surface-container-low px-4 py-4">
                    <p className="type-micro text-on-surface-variant">평균 체류 시간</p>
                    <p className="mt-2 font-headline text-[1.2rem] text-primary">{formatDuration(averageDwellMs)}</p>
                  </div>
                  <div className="rounded-2xl bg-surface-container-low px-4 py-4">
                    <p className="type-micro text-on-surface-variant">평균 본 콘텐츠 수</p>
                    <p className="mt-2 font-headline text-[1.2rem] text-primary">{averageViewedContent.toFixed(1)}개</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#f7f1e2] px-4 py-4">
                  <p className="type-micro font-semibold text-[#7A5A11]">가장 많이 본 콘텐츠</p>
                  <p className="mt-2 font-headline text-[1.08rem] text-primary">
                    {topViewedContent?.title ?? '아직 집계 중입니다.'}
                  </p>
                  {topViewedContent && (
                    <p className="type-body mt-2 text-on-surface-variant">
                      이 콘텐츠는 공개 페이지에서 {topViewedContent.count}번 가장 자주 확인됐어요.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-surface-container-low px-4 py-4">
                <p className="type-body text-on-surface-variant">
                  아직 집계가 없어요. 공개 링크를 공유하면 방문 수와 체류 시간, 많이 본 콘텐츠가 여기에 쌓입니다.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!isPublic || !previewUrl}
            className="type-body rounded-full border border-outline-variant/20 px-4 py-2 font-semibold text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
          >
            링크 복사
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="type-body rounded-full px-4 py-2 font-semibold text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canEdit || saving}
              className="type-body rounded-full bg-primary px-5 py-2 font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
