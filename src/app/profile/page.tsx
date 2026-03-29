'use client'

import Image from 'next/image'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Icon from '@/components/Icon'
import { useAuth } from '@/lib/AuthContext'
import { apiFetch } from '@/lib/apiClient'

export default function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const router = useRouter()
  const [nicknameDraft, setNicknameDraft] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <p className="type-body text-on-surface-variant">로그인이 필요합니다.</p>
          <Link href="/" className="type-body font-medium text-secondary hover:underline">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const nickname = nicknameDraft ?? profile.nickname

  async function handleSave() {
    const trimmedNickname = nickname.trim()
    if (!trimmedNickname || !user) return

    setSaving(true)

    try {
      const response = await apiFetch('/api/profile', {
        method: 'PATCH',
        requireAuth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: trimmedNickname }),
      })

      if (!response.ok) {
        throw new Error('PROFILE_SAVE_FAILED')
      }

      await refreshProfile()

      setNicknameDraft(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-outline-variant/30 bg-surface-container-low/90 px-6 py-4 backdrop-blur-xl">
        <Link href="/workspace" className="flex items-center gap-2 transition-opacity hover:opacity-70">
          <Icon name="back" className="h-5 w-5 text-on-surface-variant" />
          <h1 className="font-headline text-[1.7rem] font-semibold tracking-[-0.03em] text-primary">curatio</h1>
        </Link>
        <Link
          href="/"
          className="type-body rounded-full border border-outline-variant/20 px-4 py-2 font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
        >
          홈 화면
        </Link>
      </header>

      <main className="mx-auto max-w-lg px-6 pb-16 pt-24">
        <h2 className="type-hero mb-1 text-primary">계정 설정</h2>
        <p className="type-subtitle mb-10 text-on-surface-variant">프로필과 표시 이름을 관리할 수 있습니다.</p>

        <div className="mb-10 flex items-center gap-4">
          {profile.photoURL ? (
            <Image
              src={profile.photoURL}
              alt={profile.nickname}
              width={56}
              height={56}
              unoptimized
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary-container text-xl font-bold text-on-secondary-container">
              {profile.nickname[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-headline text-xl text-primary">{profile.nickname}</p>
            <p className="type-body text-on-surface-variant">{profile.email}</p>
          </div>
        </div>

        <div className="space-y-6 rounded-2xl bg-surface-container-low p-6">
          <div>
            <label className="type-micro mb-2 block font-medium uppercase tracking-wider text-on-surface-variant">
              닉네임
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNicknameDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="표시할 이름을 입력해주세요."
              maxLength={20}
              className="w-full border-b border-outline-variant bg-transparent py-2 text-[1rem] leading-7 text-on-surface placeholder:text-outline-variant/50 focus:border-secondary focus:outline-none"
            />
            <p className="type-micro mt-1 text-outline">{nickname.length}/20</p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !nickname.trim()}
            className="type-body w-full rounded-xl bg-primary py-3 font-medium text-on-primary transition-all hover:opacity-90 disabled:opacity-40"
          >
            {saving ? '저장 중...' : saved ? '저장됨' : '저장'}
          </button>
        </div>

        <button
          onClick={handleSignOut}
          className="type-body mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/30 px-4 py-3 text-on-surface-variant transition-colors hover:bg-surface-container"
        >
          <Icon name="logout" className="h-4 w-4" />
          로그아웃
        </button>
      </main>
    </div>
  )
}
