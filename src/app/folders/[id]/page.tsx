'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore'
import AddContentForm from '@/components/AddContentForm'
import ContentCard from '@/components/ContentCard'
import FolderExportDialog from '@/components/FolderExportDialog'
import Icon from '@/components/Icon'
import { useAuth } from '@/lib/AuthContext'
import { db } from '@/lib/firebase'
import { ContentCard as CardType, CurationFolder } from '@/types'

export default function FolderDetailPage() {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const [folder, setFolder] = useState<CurationFolder | null>(null)
  const [cards, setCards] = useState<CardType[]>([])
  const [allFolders, setAllFolders] = useState<CurationFolder[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [latestId, setLatestId] = useState<string | undefined>()

  useEffect(() => {
    if (!user) return

    const unsubscribe = onSnapshot(doc(db, 'folders', id), (snapshot) => {
      if (!snapshot.exists()) {
        setFolder(null)
        return
      }

      const nextFolder = snapshot.data() as CurationFolder
      setFolder(!nextFolder.ownerUid || nextFolder.ownerUid === user.uid ? nextFolder : null)
    })

    return unsubscribe
  }, [id, user])

  useEffect(() => {
    if (!user) return

    const cardQuery = query(collection(db, 'cards'), where('ownerUid', '==', user.uid))
    const unsubscribe = onSnapshot(cardQuery, (snapshot) => {
      const allCards = snapshot.docs
        .map((item) => item.data() as CardType)
        .sort((a, b) => b.createdAt - a.createdAt)
      setCards(allCards.filter((card) => (card.folderIds ?? []).includes(id)))
    })

    return unsubscribe
  }, [id, user])

  useEffect(() => {
    if (!user) return

    const foldersQuery = query(collection(db, 'folders'), where('ownerUid', '==', user.uid))
    const unsubscribe = onSnapshot(foldersQuery, (snapshot) => {
      const nextFolders = snapshot.docs
        .map((item) => item.data() as CurationFolder)
        .sort((a, b) => a.createdAt - b.createdAt)
      setAllFolders(nextFolders)
    })

    return unsubscribe
  }, [user])

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-outline-variant/30 bg-surface-container-low/90 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link href="/workspace" className="rounded-full p-2 transition-colors hover:bg-surface-container">
            <Icon name="back" className="h-5 w-5 text-on-surface-variant" />
          </Link>
          <h1 className="font-headline text-[1.7rem] font-semibold tracking-[-0.03em] text-primary">
            {folder?.name ?? '컬렉션'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowExportDialog(true)}
            className="type-body rounded-full border border-outline-variant/30 px-4 py-2 font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            내보내기
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="type-body rounded-full bg-primary px-5 py-2 font-medium text-on-primary transition-all hover:opacity-90"
          >
            콘텐츠 추가
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-16 pt-24">
        {folder && (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="type-hero mb-2 text-primary">{folder.name}</h2>
              {folder.description ? (
                <p className="type-subtitle text-on-surface-variant">{folder.description}</p>
              ) : (
                <p className="type-body text-outline">콘텐츠 {cards.length}개가 담겨 있습니다.</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="type-body rounded-full border border-outline-variant/30 bg-surface px-4 py-2 font-semibold text-primary transition-colors hover:bg-surface-container"
            >
              콘텐츠 추가
            </button>
          </div>
        )}

        <div className="mb-8 rounded-[28px] border border-secondary/20 bg-[linear-gradient(135deg,rgba(223,238,230,0.95),rgba(247,241,226,0.9))] px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="type-micro mb-2 font-semibold text-secondary">빠르게 추가하기</p>
              <h3 className="font-headline text-[1.25rem] leading-[1.2] text-primary">
                이 컬렉션에 넣을 링크가 있다면
                <br />
                바로 추가해 보세요
              </h3>
              <p className="type-body mt-2 text-on-surface-variant">
                저장한 콘텐츠는 자동으로 현재 컬렉션에 담깁니다.
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

        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container">
              <Icon name="bookmark" className="h-8 w-8 text-outline" />
            </div>
            <p className="type-body text-on-surface-variant">아직 이 컬렉션에 저장된 콘텐츠가 없어요.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="type-body mt-4 rounded-full bg-primary px-5 py-3 font-semibold text-on-primary transition-opacity hover:opacity-90"
            >
              첫 콘텐츠 추가하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <div key={card.id} className={latestId === card.id ? 'rounded-xl ring-2 ring-secondary/40' : ''}>
                <ContentCard card={card} folders={allFolders} />
              </div>
            ))}
          </div>
        )}
      </main>

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
              onAdded={(newId) => {
                setLatestId(newId)
                setShowAddModal(false)
              }}
              onClose={() => setShowAddModal(false)}
              targetFolderId={id}
            />
          </div>
        </div>
      )}

      <FolderExportDialog
        folder={folder}
        cards={cards}
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        currentUserUid={user?.uid}
      />
    </div>
  )
}
