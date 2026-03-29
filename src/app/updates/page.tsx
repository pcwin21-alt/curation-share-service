'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import Icon from '@/components/Icon'
import { useAuth } from '@/lib/AuthContext'
import { db } from '@/lib/firebase'
import { CollectionNotification } from '@/types'

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function UpdatesPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [notifications, setNotifications] = useState<CollectionNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      return
    }

    const notificationsQuery = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('lastTriggeredAt', 'desc'),
    )

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      setNotifications(snapshot.docs.map((item) => item.data() as CollectionNotification))
      setLoading(false)
    })

    return unsubscribe
  }, [user])

  async function markAsRead(notificationId: string) {
    if (!user) return

    const token = await user.getIdToken()
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ notificationId }),
    })
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="rounded-3xl bg-surface-container-low px-8 py-8 text-center">
          <p className="type-body text-on-surface-variant">소식함은 로그인 후에 볼 수 있어요.</p>
          <Link
            href="/workspace"
            className="type-body mt-4 inline-flex rounded-full bg-primary px-5 py-2 font-semibold text-on-primary"
          >
            작업 공간으로
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-outline-variant/30 bg-surface-container-low/90 px-6 py-4 backdrop-blur-xl">
        <Link href="/workspace" className="flex items-center gap-2 transition-opacity hover:opacity-70">
          <Icon name="back" className="h-5 w-5 text-on-surface-variant" />
          <h1 className="font-headline text-[1.7rem] font-semibold tracking-[-0.03em] text-primary">curatio</h1>
        </Link>
        <div className="type-body text-on-surface-variant">{profile?.nickname}</div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-16 pt-24">
        <div className="mb-8">
          <h2 className="type-hero text-primary">소식</h2>
          <p className="type-subtitle mt-2 text-on-surface-variant">
            팔로우한 컬렉션에 새 콘텐츠가 추가되면 여기에서 바로 확인할 수 있어요.
          </p>
        </div>

        {loading ? (
          <div className="rounded-[28px] bg-surface-container-low px-6 py-10 text-center">
            <p className="type-body text-on-surface-variant">소식을 불러오는 중입니다.</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-[28px] bg-surface-container-low px-6 py-10 text-center">
            <p className="font-headline text-[1.1rem] text-primary">아직 새 소식이 없어요</p>
            <p className="type-body mt-2 text-on-surface-variant">
              공개 컬렉션을 팔로우하면 업데이트가 이곳에 쌓입니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={async () => {
                  await markAsRead(notification.id)
                  router.push(`/c/${notification.shareSlug}`)
                }}
                className="w-full rounded-[28px] border border-outline-variant/15 bg-surface px-5 py-5 text-left transition-colors hover:bg-surface-container-low"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      {notification.unread && <span className="h-2.5 w-2.5 rounded-full bg-secondary" />}
                      <p className="type-micro font-semibold text-secondary">컬렉션 업데이트</p>
                    </div>
                    <h3 className="font-headline text-[1.15rem] text-primary">{notification.collectionName}</h3>
                    <p className="type-body mt-2 text-on-surface-variant">
                      새 콘텐츠 {notification.addedCount}개가 추가됐어요.
                    </p>
                  </div>

                  <span className="type-micro rounded-full bg-surface-container px-3 py-1.5 text-on-surface-variant">
                    {formatDate(notification.lastTriggeredAt)}
                  </span>
                </div>

                {notification.addedCardTitles.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {notification.addedCardTitles.slice(0, 3).map((title) => (
                      <span
                        key={title}
                        className="type-micro rounded-full bg-secondary-container px-3 py-1.5 font-semibold text-on-secondary-container"
                      >
                        {title}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
