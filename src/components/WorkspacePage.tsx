'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import AddContentForm from '@/components/AddContentForm'
import CardList from '@/components/CardList'
import CollectionSummaryDialog from '@/components/CollectionSummaryDialog'
import FolderExportDialog from '@/components/FolderExportDialog'
import FolderSidebar from '@/components/FolderSidebar'
import Icon from '@/components/Icon'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useAuth } from '@/lib/AuthContext'
import { ApiAuthError, apiFetch } from '@/lib/apiClient'
import { db } from '@/lib/firebase'
import { featureFlags } from '@/lib/features'
import { useUnreadNotificationsCount } from '@/lib/useUnreadNotificationsCount'
import { ContentCard as CardType, CurationFolder } from '@/types'

function formatTime(ts: number) {
  return new Date(ts).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function WorkspacePage() {
  const { user, profile, loading: authLoading, signInWithGoogle, signOut } = useAuth()
  const unreadCount = useUnreadNotificationsCount(featureFlags.updates ? user?.uid : undefined)
  const [latestId, setLatestId] = useState<string | undefined>()
  const [folders, setFolders] = useState<CurationFolder[]>([])
  const [cards, setCards] = useState<CardType[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [isManaging, setIsManaging] = useState(false)
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set())
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showSummaryDialog, setShowSummaryDialog] = useState(false)

  useEffect(() => {
    if (!user) return

    const folderQuery = query(collection(db, 'folders'), where('ownerUid', '==', user.uid))
    const unsubscribe = onSnapshot(folderQuery, (snapshot) => {
      const nextFolders = snapshot.docs
        .map((folderDoc) => folderDoc.data() as CurationFolder)
        .sort((a, b) => a.createdAt - b.createdAt)
      setFolders(nextFolders)
    })

    return unsubscribe
  }, [user])

  useEffect(() => {
    if (!user) return

    const cardQuery = query(collection(db, 'cards'), where('ownerUid', '==', user.uid))
    const unsubscribe = onSnapshot(cardQuery, (snapshot) => {
      const nextCards = snapshot.docs
        .map((cardDoc) => cardDoc.data() as CardType)
        .sort((a, b) => b.createdAt - a.createdAt)
      setCards(nextCards)
    })

    return unsubscribe
  }, [user])

  const displayCards =
    selectedFolderId === null
      ? cards
      : cards.filter((card) => (card.folderIds ?? []).includes(selectedFolderId))

  const unassignedCount = cards.filter((card) => (card.folderIds ?? []).length === 0).length
  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId)
  const summaryTitle = selectedFolder ? selectedFolder.name : '전체 컬렉션'
  const summaryCount = displayCards.length
  const thumbnails = displayCards
    .filter((card) => card.thumbnailUrl)
    .slice(0, 4)
    .map((card) => card.thumbnailUrl as string)
  const latestCreatedAt = displayCards[0]?.createdAt ?? null
  const folderUpdatedAt = selectedFolder?.updatedAt ?? null
  const lastModified = selectedFolder
    ? folderUpdatedAt
      ? formatTime(folderUpdatedAt)
      : '-'
    : latestCreatedAt
      ? formatTime(latestCreatedAt)
      : '-'

  const selectedCards = displayCards.filter((card) => selectedCardIds.has(card.id))

  function toggleSelectCard(id: string) {
    setSelectedCardIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleDeleteSelected() {
    if (selectedCardIds.size === 0) return

    const confirmed = confirm(`선택한 콘텐츠 ${selectedCardIds.size}개를 삭제할까요?`)
    if (!confirmed) return

    try {
      await Promise.all(
        [...selectedCardIds].map((id) =>
          apiFetch(`/api/cards/${id}`, {
            method: 'DELETE',
            requireAuth: true,
          }),
        ),
      )
      setSelectedCardIds(new Set())
    } catch (error) {
      alert(
        error instanceof ApiAuthError
          ? '콘텐츠를 삭제하려면 다시 로그인해 주세요.'
          : '선택한 콘텐츠를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
    }
  }

  async function handleDropToFolder(folderId: string, cardIds: string[]) {
    try {
      await Promise.all(
        cardIds.map((cardId) =>
          apiFetch('/api/folders', {
            method: 'PATCH',
            requireAuth: true,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderId, cardId }),
          }),
        ),
      )
      setSelectedCardIds(new Set())
    } catch (error) {
      alert(
        error instanceof ApiAuthError
          ? '폴더에 옮기려면 다시 로그인해 주세요.'
          : '카드를 폴더로 옮기지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="rounded-[28px] bg-surface-container-low px-8 py-6">
          <p className="type-body text-on-surface-variant">작업 공간을 불러오는 중입니다.</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background px-6 py-10">
        <div className="mx-auto max-w-5xl rounded-[32px] border border-outline-variant/20 bg-surface-container-low px-6 py-8 shadow-sm sm:px-8 sm:py-10">
          <div className="mb-10 flex items-center justify-between gap-4">
            <Link href="/" className="font-headline text-[1.5rem] text-primary">
              curatio
            </Link>
            <Link
              href="/"
              className="type-body rounded-full border border-outline-variant/20 px-4 py-2 font-semibold text-on-surface-variant transition-colors hover:bg-surface"
            >
              홈 화면
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] bg-surface px-6 py-7">
              <p className="type-micro mb-3 font-semibold text-secondary">로그인 후 이용 가능</p>
              <h1 className="type-hero max-w-[11ch] text-primary">
                콘텐츠를 모으고 정리하고,
                <br />
                공개 링크로 공유해 보세요
              </h1>
              <p className="type-body mt-4 max-w-xl text-on-surface-variant">
                이곳은 콘텐츠와 컬렉션 폴더를 관리하는 작업 공간입니다. 로그인하면 메모 작성, 폴더 구성,
                공개 링크 만들기, AI 요약, 업데이트 확인까지 한 흐름으로 이어집니다.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="type-body rounded-full bg-primary px-5 py-3 font-semibold text-on-primary transition-opacity hover:opacity-90"
                >
                  Google로 시작하기
                </button>
                <Link
                  href="/"
                  className="type-body rounded-full border border-outline-variant/20 px-5 py-3 font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
                >
                  서비스 소개 보기
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[28px] bg-[#e1eee6] px-5 py-5">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/75 text-secondary">
                  <Icon name="archive" className="h-5 w-5" />
                </div>
                <p className="font-headline text-[1.1rem] text-primary">주제별 컬렉션 정리</p>
                <p className="type-body mt-2 text-on-surface-variant">
                  링크와 메모를 모아 두고, 다시 보기 좋은 폴더로 정리할 수 있어요.
                </p>
              </div>

              <div className="rounded-[28px] bg-[#f7f1e2] px-5 py-5">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/75 text-[#7A5A11]">
                  <Icon name="pencil" className="h-5 w-5" />
                </div>
                <p className="font-headline text-[1.1rem] text-primary">메모와 맥락 남기기</p>
                <p className="type-body mt-2 text-on-surface-variant">
                  왜 저장했는지, 어떤 생각이 들었는지 카드마다 함께 적어둘 수 있어요.
                </p>
              </div>

              <div className="rounded-[28px] bg-surface px-5 py-5">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-container-high text-primary">
                  <Icon name="share" className="h-5 w-5" />
                </div>
                <p className="font-headline text-[1.1rem] text-primary">공개 링크 공유</p>
                <p className="type-body mt-2 text-on-surface-variant">
                  완성한 컬렉션을 공개 링크로 정리하고, 구독과 팔로우 흐름까지 연결할 수 있어요.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-outline-variant/30 bg-surface-container-low/90 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Link href="/workspace" className="font-headline text-[1.7rem] font-semibold tracking-[-0.03em] text-primary">
            curatio
          </Link>
          <Link
            href="/"
            className="type-body rounded-full border border-outline-variant/20 px-4 py-2 font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
          >
            홈 화면
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {featureFlags.updates && (
            <Link
              href="/updates"
            className="relative rounded-full border border-outline-variant/20 px-4 py-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
            aria-label="소식"
          >
            <div className="flex items-center gap-2">
              <Icon name="feed" className="h-4 w-4" />
              <span className="type-body font-semibold">소식</span>
            </div>
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[0.7rem] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            </Link>
          )}

          <div
            className="relative"
            onMouseEnter={() => setShowProfileMenu(true)}
            onMouseLeave={() => setShowProfileMenu(false)}
          >
            <button className="flex items-center gap-2 transition-opacity hover:opacity-80">
              {profile?.photoURL ? (
                <Image
                  src={profile.photoURL}
                  alt={profile.nickname}
                  width={32}
                  height={32}
                  unoptimized
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-sm font-bold text-on-secondary-container">
                  {(profile?.nickname ?? 'U')[0]}
                </div>
              )}
              <span className="type-body hidden text-on-surface-variant sm:block">{profile?.nickname}</span>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full z-50 pt-2">
                <div className="w-max min-w-[180px] rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-1 shadow-lg">
                  <Link
                    href="/profile"
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
                  >
                    <Icon name="settings" className="h-4 w-4 shrink-0 text-on-surface-variant" />
                    계정 설정
                  </Link>
                  <Link
                    href="/updates"
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
                  >
                    <Icon name="feed" className="h-4 w-4 shrink-0 text-on-surface-variant" />
                    소식 보기
                  </Link>
                  <div className="my-1 border-t border-outline-variant/15" />
                  <button
                    onClick={signOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container"
                  >
                    <Icon name="logout" className="h-4 w-4 shrink-0" />
                    로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="type-body rounded-full bg-primary px-5 py-2 font-medium text-on-primary transition-all hover:opacity-90"
          >
            콘텐츠 추가
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-28 pt-24 md:pb-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-0">
          <div className="rounded-2xl bg-surface-container-low p-6 lg:sticky lg:top-28 lg:mr-6 lg:w-72 lg:shrink-0 lg:self-start">
            <FolderSidebar
              folders={folders}
              selectedId={selectedFolderId}
              onSelect={setSelectedFolderId}
              onCreated={(folder) => setFolders((previous) => [...previous, folder])}
              isManaging={isManaging}
              onDropToFolder={handleDropToFolder}
              unassignedCount={unassignedCount}
            />
          </div>

          <div className="min-w-0 flex-1 rounded-2xl bg-surface-bright p-6">
            <div className="mb-8 flex flex-col items-center rounded-2xl border-b-2 border-outline-variant/20 bg-surface-container px-6 py-8 text-center">
              <div className="mb-5 grid h-24 w-24 grid-cols-2 gap-px overflow-hidden rounded-2xl bg-surface-container-high shadow-sm">
                {thumbnails.length > 0 ? (
                  thumbnails.map((url, index) => (
                    <div key={index} className="relative h-full w-full">
                      <Image src={url} alt="" fill unoptimized className="object-cover" sizes="48px" />
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 row-span-2 flex items-center justify-center bg-surface-container-high">
                    <Icon name="archive" className="h-10 w-10 text-outline" />
                  </div>
                )}
              </div>

              <p className="type-hero mb-3 text-primary">{summaryTitle}</p>

              <div className="type-body mb-5 flex flex-wrap items-center justify-center gap-3 text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <Icon name="document" className="h-4 w-4 text-outline" />
                  콘텐츠 {summaryCount}개
                </span>
                <span className="hidden text-outline-variant sm:inline">·</span>
                <span className="flex items-center gap-1.5">
                  <Icon name="clock" className="h-4 w-4 text-outline" />
                  최근 수정 {lastModified}
                </span>
              </div>

              {selectedFolderId === null && unassignedCount > 0 && (
                <div className="type-micro mb-5 rounded-full border border-[#E2B24D]/50 bg-[#FFF4D6] px-4 py-2 font-semibold text-[#7A5A11]">
                  아직 폴더에 담기지 않은 콘텐츠가 {unassignedCount}개 있어요
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => selectedFolder && setShowExportDialog(true)}
                  disabled={!selectedFolder}
                  className="type-micro flex items-center gap-1.5 rounded-full border border-outline-variant/40 px-4 py-2 font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon name="share" className="h-4 w-4" />
                  {selectedFolder ? '내보내기' : '컬렉션을 선택하면 내보낼 수 있어요'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowSummaryDialog(true)}
                  disabled={displayCards.length === 0}
                  className="type-micro flex items-center gap-1.5 rounded-full border border-outline-variant/40 px-4 py-2 font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon name="document" className="h-4 w-4" />
                  AI로 요약하기
                </button>
              </div>
            </div>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h3 className="type-section text-primary">
                {selectedFolderId ? selectedFolder?.name ?? '컬렉션' : '최근 저장한 콘텐츠'}
              </h3>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="type-body rounded-full border border-outline-variant/30 bg-surface px-4 py-1.5 font-semibold text-primary transition-colors hover:bg-surface-container"
                >
                  콘텐츠 추가
                </button>

                {isManaging && selectedCardIds.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="type-body flex items-center gap-1.5 rounded-full bg-error-container px-4 py-1.5 font-semibold text-on-error-container transition-opacity hover:opacity-80"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                    {selectedCardIds.size}개 삭제
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsManaging((value) => !value)
                    setSelectedCardIds(new Set())
                  }}
                  className={`type-body rounded-full px-4 py-1.5 font-semibold transition-colors ${
                    isManaging
                      ? 'bg-secondary text-on-secondary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {isManaging ? `완료 (${selectedCardIds.size}개 선택)` : '관리'}
                </button>
              </div>
            </div>

            <div className="mb-6 rounded-[28px] border border-secondary/20 bg-[linear-gradient(135deg,rgba(223,238,230,0.95),rgba(247,241,226,0.9))] px-5 py-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="type-micro mb-2 font-semibold text-secondary">빠르게 추가하기</p>
                  <h4 className="font-headline text-[1.3rem] leading-[1.2] text-primary">
                    링크나 메모를 바로 넣고
                    <br />
                    이 컬렉션에 쌓아보세요
                  </h4>
                  <p className="type-body mt-2 text-on-surface-variant">
                    지금 보고 있는 화면에서 바로 저장하고, 선택한 컬렉션에 곧바로 담을 수 있어요.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="type-body inline-flex items-center justify-center rounded-full bg-primary px-6 py-3.5 font-semibold text-on-primary shadow-[0_10px_24px_rgba(31,26,23,0.16)] transition-opacity hover:opacity-90"
                >
                  콘텐츠 추가하기
                </button>
              </div>
            </div>

            {isManaging && (
              <p className="type-micro mb-4 rounded-lg bg-surface-container py-2.5 text-center text-on-surface-variant">
                카드를 눌러 선택하고 컬렉션으로 끌어 옮기면 한 번에 정리할 수 있어요
              </p>
            )}

            <CardList
              highlightId={latestId}
              cards={displayCards}
              folders={folders}
              isManaging={isManaging}
              selectedCardIds={selectedCardIds}
              onToggleSelect={toggleSelectCard}
            />

            {displayCards.length === 0 && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="type-body rounded-full bg-primary px-5 py-3 font-semibold text-on-primary transition-opacity hover:opacity-90"
                >
                  첫 콘텐츠 추가하기
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 z-50 flex w-full items-end justify-around rounded-t-2xl border-t border-outline-variant/30 bg-surface-container-low/90 px-4 pb-5 pt-2 backdrop-blur-xl md:hidden">
        <Link
          href="/workspace"
          className="flex min-w-[68px] flex-col items-center justify-center gap-1 rounded-xl bg-secondary-container px-4 py-2 text-on-surface transition-all"
        >
          <Icon name="archive" className="h-[18px] w-[18px]" />
          <span className="type-nav">보관함</span>
        </Link>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex min-w-[68px] flex-col items-center justify-center -mt-5 transition-all"
        >
          <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-primary shadow-lg transition-all hover:opacity-90 active:scale-95">
            <Icon name="plus" className="h-8 w-8 text-on-primary" />
          </div>
          <span className="type-nav mt-1.5 text-on-surface-variant">추가</span>
        </button>

        <Link
          href="/updates"
          className="relative flex min-w-[68px] flex-col items-center justify-center gap-1 px-4 py-2 text-on-surface-variant transition-all hover:opacity-80"
        >
          <Icon name="feed" className="h-[18px] w-[18px]" />
          <span className="type-nav">소식</span>
          {unreadCount > 0 && (
            <span className="absolute right-3 top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[0.7rem] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <Link
          href="/profile"
          className="flex min-w-[68px] flex-col items-center justify-center gap-1 px-4 py-2 text-on-surface-variant transition-all hover:opacity-80"
        >
          <Icon name="user" className="h-[18px] w-[18px]" />
          <span className="type-nav">프로필</span>
        </Link>
      </nav>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-primary/20 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative w-full max-w-lg rounded-t-2xl bg-surface-container-lowest p-8 shadow-2xl sm:rounded-2xl">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 transition-colors hover:bg-surface-container"
              aria-label="닫기"
            >
              <Icon name="close" className="h-5 w-5 text-on-surface-variant" />
            </button>
            <AddContentForm
              onAdded={(id) => {
                setLatestId(id)
                setShowAddModal(false)
              }}
              onClose={() => setShowAddModal(false)}
              targetFolderId={selectedFolderId}
            />
          </div>
        </div>
      )}

      <FolderExportDialog
        folder={selectedFolder ?? null}
        cards={displayCards}
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        currentUserUid={user.uid}
      />

      <CollectionSummaryDialog
        isOpen={showSummaryDialog}
        onClose={() => setShowSummaryDialog(false)}
        collectionName={summaryTitle}
        allCards={displayCards}
        selectedCards={selectedCards}
      />
    </div>
  )
}
