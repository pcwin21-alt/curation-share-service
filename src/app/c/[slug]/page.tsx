'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore'
import ContentCard from '@/components/ContentCard'
import Icon from '@/components/Icon'
import { ApiAuthError, apiFetch } from '@/lib/apiClient'
import { useAuth } from '@/lib/AuthContext'
import { featureFlags } from '@/lib/features'
import { buildSharePath } from '@/lib/shareSlug'
import { db } from '@/lib/firebase'
import { ContentCard as CardType, CurationFolder } from '@/types'

function formatDate(ts?: number) {
  if (!ts) return '방금'

  return new Date(ts).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function createAnalyticsId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function getVisitorId() {
  const storageKey = 'curatio-public-visitor-id'
  const saved = window.localStorage.getItem(storageKey)

  if (saved) return saved

  const nextId = createAnalyticsId()
  window.localStorage.setItem(storageKey, nextId)
  return nextId
}

export default function PublicFolderPage() {
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const { user, isSigningIn, signInWithGoogle } = useAuth()
  const [folder, setFolder] = useState<CurationFolder | null>(null)
  const [cards, setCards] = useState<CardType[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [subscribeFeedback, setSubscribeFeedback] = useState('')
  const [subscribeError, setSubscribeError] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const startedAtRef = useRef<number>(0)
  const seenCardIdsRef = useRef<Set<string>>(new Set())
  const flushedRef = useRef(false)

  useEffect(() => {
    let unsubscribeCards: (() => void) | null = null

    const folderQuery = query(collection(db, 'folders'), where('shareSlug', '==', slug))

    const unsubscribeFolder = onSnapshot(folderQuery, (snapshot) => {
      if (snapshot.empty) {
        setFolder(null)
        setCards([])
        setLoading(false)
        if (unsubscribeCards) unsubscribeCards()
        return
      }

      const nextFolder = snapshot.docs[0].data() as CurationFolder

      if (!nextFolder.isPublic) {
        setFolder(null)
        setCards([])
        setLoading(false)
        if (unsubscribeCards) unsubscribeCards()
        return
      }

      setFolder(nextFolder)
      setLoading(false)

      if (unsubscribeCards) unsubscribeCards()

      const cardsQuery = query(collection(db, 'cards'), where('folderIds', 'array-contains', nextFolder.id))

      unsubscribeCards = onSnapshot(cardsQuery, (cardsSnapshot) => {
        const nextCards = cardsSnapshot.docs
          .map((item) => item.data() as CardType)
          .sort((a, b) => b.createdAt - a.createdAt)
        setCards(nextCards)
      })
    })

    return () => {
      unsubscribeFolder()
      if (unsubscribeCards) unsubscribeCards()
    }
  }, [slug])

  useEffect(() => {
    if (!featureFlags.follows || !folder?.id || !user) {
      setIsFollowing(false)
      return
    }

    const unsubscribe = onSnapshot(doc(db, 'folders', folder.id, 'followers', user.uid), (snapshot) => {
      setIsFollowing(snapshot.exists())
    })

    return unsubscribe
  }, [folder?.id, user])

  useEffect(() => {
    if (!copied) return

    const timeoutId = window.setTimeout(() => {
      setCopied(false)
    }, 2200)

    return () => window.clearTimeout(timeoutId)
  }, [copied])

  useEffect(() => {
    const subscription = searchParams.get('subscription')

    if (subscription === 'confirmed') {
      setSubscribeFeedback('이메일 구독이 확인됐어요. 새 콘텐츠가 추가되면 주간 메일로 보내드릴게요.')
    } else if (subscription === 'already-confirmed') {
      setSubscribeFeedback('이미 구독 중인 컬렉션이에요.')
    } else if (subscription === 'unsubscribed') {
      setSubscribeFeedback('이메일 구독을 해지했어요.')
    }
  }, [searchParams])

  useEffect(() => {
    if (
      !featureFlags.analytics ||
      !folder?.id ||
      !folder.isPublic ||
      typeof window === 'undefined' ||
      (user?.uid && folder.ownerUid === user.uid)
    ) {
      return
    }

    const sessionId = createAnalyticsId()
    const visitorId = getVisitorId()
    startedAtRef.current = Date.now()
    seenCardIdsRef.current = new Set()
    flushedRef.current = false

    fetch('/api/public-collections/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'start',
        folderId: folder.id,
        shareSlug: folder.shareSlug,
        sessionId,
        visitorId,
      }),
    }).catch((error) => {
      console.error('[analytics/start] failed:', error)
    })

    const flushAnalytics = () => {
      if (flushedRef.current) return
      flushedRef.current = true

      const payload = JSON.stringify({
        event: 'end',
        folderId: folder.id,
        shareSlug: folder.shareSlug,
        sessionId,
        visitorId,
        durationMs: Date.now() - startedAtRef.current,
        seenCardIds: [...seenCardIdsRef.current],
      })

      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/public-collections/analytics', blob)
        return
      }

      fetch('/api/public-collections/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch((error) => {
        console.error('[analytics/end] failed:', error)
      })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushAnalytics()
      }
    }

    window.addEventListener('pagehide', flushAnalytics)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', flushAnalytics)
      flushAnalytics()
    }
  }, [folder?.id, folder?.isPublic, folder?.ownerUid, folder?.shareSlug, user?.uid])

  useEffect(() => {
    if (cards.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return

          const cardId = entry.target.getAttribute('data-public-card-id')
          if (!cardId) return

          seenCardIdsRef.current.add(cardId)
        })
      },
      { threshold: 0.55 },
    )

    const elements = document.querySelectorAll('[data-public-card-id]')
    elements.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [cards])

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email)
    }
  }, [user?.email])

  async function handleCopyShareLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${buildSharePath(slug)}`)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  async function handleSubscribe() {
    if (!folder) return

    setSubscribing(true)
    setSubscribeError('')
    setSubscribeFeedback('')

    try {
      const response = await apiFetch('/api/public-collections/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: folder.id,
          email,
          userUid: user?.uid ?? null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setSubscribeError(result.error ?? '구독 신청을 저장하지 못했어요.')
        return
      }

      setSubscribeFeedback(
        result.confirmUrl
          ? `${result.message} 개발 환경에서는 아래 링크로 바로 확인할 수 있어요: ${result.confirmUrl}`
          : result.message,
      )
    } finally {
      setSubscribing(false)
    }
  }

  async function handleToggleFollow() {
    if (!folder) return

    if (!user) {
      await signInWithGoogle()
      return
    }

    setFollowLoading(true)

    try {
      const response = await apiFetch('/api/follows', {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        requireAuth: true,
        body: JSON.stringify({ folderId: folder.id }),
      })

      if (!response.ok) {
        const result = await response.json()
        setSubscribeError(result.error ?? '팔로우 상태를 변경하지 못했어요.')
      }
    } catch (error) {
      setSubscribeError(
        error instanceof ApiAuthError
          ? '팔로우하려면 먼저 로그인해 주세요.'
          : '팔로우 상태를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="rounded-3xl bg-surface-container-low px-8 py-6 text-center">
          <p className="type-body text-on-surface-variant">공개 컬렉션을 불러오는 중입니다.</p>
        </div>
      </div>
    )
  }

  if (!folder) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md rounded-3xl bg-surface-container-low px-8 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container">
            <Icon name="warning" className="h-7 w-7 text-outline" />
          </div>
          <h1 className="font-headline text-[1.3rem] text-primary">공개 컬렉션을 찾을 수 없어요</h1>
          <p className="type-body mt-3 text-on-surface-variant">
            링크가 바뀌었거나 비공개로 전환되었을 수 있습니다.
          </p>
          <Link
            href="/"
            className="type-body mt-6 inline-flex rounded-full bg-primary px-5 py-2 font-semibold text-on-primary transition-opacity hover:opacity-90"
          >
            홈으로 이동
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-outline-variant/20 bg-surface-container-low/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="font-headline text-[1.25rem] font-semibold text-primary">
            curatio
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {featureFlags.follows && <button
              type="button"
              onClick={handleToggleFollow}
              disabled={followLoading || isSigningIn}
              className="type-body rounded-full border border-outline-variant/30 px-4 py-2 font-semibold text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40"
            >
              {user ? (isFollowing ? '팔로잉 중' : '팔로우') : '로그인 후 팔로우'}
            </button>}
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="type-body rounded-full border border-outline-variant/30 px-4 py-2 font-semibold text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              {copied ? '링크를 복사했어요' : '링크 공유'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        <section className="mb-8 rounded-[28px] bg-surface-container-low px-6 py-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="max-w-3xl">
              <p className="type-micro mb-2 font-semibold text-secondary">공개 컬렉션</p>
              <h1 className="font-headline text-[2rem] leading-[1.12] text-primary">{folder.name}</h1>
              <p className="type-body mt-3 text-on-surface-variant">
                {folder.description || '링크로 바로 공유하는 읽기 전용 컬렉션입니다.'}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-on-surface-variant">
                <span className="type-micro rounded-full bg-surface px-3 py-1.5 font-semibold">
                  콘텐츠 {cards.length}개
                </span>
                <span className="type-micro rounded-full bg-surface px-3 py-1.5 font-semibold">
                  최근 공개 {formatDate(folder.sharedAt || folder.updatedAt)}
                </span>
                <span className="type-micro rounded-full bg-surface px-3 py-1.5 font-semibold">
                  팔로워 {folder.followerCount ?? 0}명
                </span>
                <span className="type-micro rounded-full bg-surface px-3 py-1.5 font-semibold">
                  메일 구독 {folder.emailSubscriberCount ?? 0}명
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-surface px-4 py-4">
                <p className="type-micro text-on-surface-variant">큐레이터</p>
                <p className="type-body mt-1 font-semibold text-primary">
                  {folder.ownerName || 'curatio 사용자'}
                </p>
              </div>

              <div className="rounded-2xl bg-surface px-4 py-4">
                <p className="type-micro font-semibold text-secondary">이메일로 받아보기</p>
                <p className="type-body mt-2 text-on-surface-variant">
                  회원가입 없이도 이메일만 입력하면, 새 콘텐츠가 쌓였을 때 주간 요약으로 받아볼 수 있어요.
                </p>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="type-body min-w-0 flex-1 rounded-full border border-outline-variant/20 bg-background px-4 py-3 text-on-surface outline-none placeholder:text-outline"
                  />
                  <button
                    type="button"
                    onClick={handleSubscribe}
                    disabled={subscribing}
                    className="type-body rounded-full bg-primary px-5 py-3 font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {subscribing ? '신청 중...' : '구독 신청'}
                  </button>
                </div>

                {subscribeError && <p className="type-micro mt-3 font-semibold text-error">{subscribeError}</p>}
                {subscribeFeedback && (
                  <p className="type-micro mt-3 whitespace-pre-line font-semibold text-secondary">
                    {subscribeFeedback}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {cards.length === 0 ? (
          <div className="rounded-[28px] bg-surface-container-low px-6 py-14 text-center">
            <p className="type-body text-on-surface-variant">
              이 컬렉션에는 아직 공개된 콘텐츠가 없습니다.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <div key={card.id} data-public-card-id={card.id}>
                <ContentCard card={card} folders={[folder]} readOnly />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
