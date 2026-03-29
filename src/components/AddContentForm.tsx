'use client'

import { useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import Icon from '@/components/Icon'
import { useAuth } from '@/lib/AuthContext'
import { ApiAuthError, apiFetch } from '@/lib/apiClient'
import { db } from '@/lib/firebase'
import { ContentCard } from '@/types'

interface AddContentFormProps {
  onAdded: (id: string) => void
  onClose?: () => void
  targetFolderId?: string | null
}

interface DuplicateInfo {
  title: string
  createdAt: number
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function AddContentForm({
  onAdded,
  onClose,
  targetFolderId,
}: AddContentFormProps) {
  const { user } = useAuth()
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'url' | 'text'>('url')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null)
  const [checking, setChecking] = useState(false)

  async function checkUrlDuplicate(url: string) {
    if (!url.trim() || !user) return

    setChecking(true)

    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'cards'),
          where('ownerUid', '==', user.uid),
          where('url', '==', url.trim()),
        ),
      )

      if (!snapshot.empty) {
        const data = snapshot.docs[0].data() as ContentCard
        setDuplicate({ title: data.title, createdAt: data.createdAt })
      } else {
        setDuplicate(null)
      }
    } finally {
      setChecking(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || duplicate) return

    setLoading(true)
    setError('')

    const body = mode === 'url' ? { url: input.trim() } : { rawText: input.trim() }

    try {
      const response = await apiFetch('/api/cards', {
        method: 'POST',
        requireAuth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.status === 409) {
        setDuplicate(data.duplicate ?? null)
        setError(data.error ?? '이미 저장한 콘텐츠예요.')
        return
      }

      if (!response.ok) {
        setError(data.error ?? '저장 중 문제가 생겼어요.')
        return
      }

      if (targetFolderId) {
        await apiFetch('/api/folders', {
          method: 'PATCH',
          requireAuth: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId: targetFolderId, cardId: data.id }),
        })
      }

      setInput('')
      onAdded(data.id)
      onClose?.()
    } catch (error) {
      setError(
        error instanceof ApiAuthError
          ? '콘텐츠를 저장하려면 먼저 로그인해 주세요.'
          : '네트워크 오류가 발생했어요. 다시 시도해 주세요.',
      )
    } finally {
      setLoading(false)
    }
  }

  function handleModeChange(nextMode: 'url' | 'text') {
    setMode(nextMode)
    setInput('')
    setError('')
    setDuplicate(null)
  }

  function handleInputChange(value: string) {
    setInput(value)
    if (duplicate) setDuplicate(null)
    if (error) setError('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="type-section mb-2 text-primary">무엇을 모아둘까요?</h2>
        <p className="type-subtitle text-on-surface-variant">
          링크나 텍스트를 저장해 두고, 나중에 컬렉션으로 차분히 정리해 보세요.
        </p>
      </div>

      <div className="flex w-fit rounded-full bg-surface-container p-1">
        <button
          type="button"
          onClick={() => handleModeChange('url')}
          className={`type-body rounded-full px-6 py-2 font-semibold transition-all ${
            mode === 'url'
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          링크
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('text')}
          className={`type-body rounded-full px-6 py-2 font-medium transition-all ${
            mode === 'text'
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          텍스트
        </button>
      </div>

      <div className="group">
        <label className="type-micro mb-2 block font-bold uppercase tracking-widest text-on-surface-variant">
          {mode === 'url' ? '링크 주소' : '내용'}
        </label>

        {mode === 'url' ? (
          <input
            type="url"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={(e) => checkUrlDuplicate(e.target.value)}
            placeholder="https://..."
            className={`w-full border-0 border-b bg-transparent py-3 text-[1rem] font-body leading-7 outline-none transition-colors placeholder:text-outline-variant/50 ${
              duplicate ? 'border-error text-error' : 'border-outline-variant focus:border-secondary'
            }`}
          />
        ) : (
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="기억해 두고 싶은 문장이나 메모를 붙여 넣어 주세요."
            rows={4}
            className="w-full resize-none border-0 border-b border-outline-variant bg-transparent py-3 text-[1rem] font-body leading-7 outline-none transition-colors placeholder:text-outline-variant/50 focus:border-secondary"
          />
        )}

        {duplicate && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-error-container p-3">
            <Icon name="warning" className="mt-0.5 h-4 w-4 shrink-0 text-error" />
            <div>
              <p className="type-micro font-semibold text-on-error-container">
                이미 저장한 콘텐츠예요.
              </p>
              <p className="type-micro mt-0.5 line-clamp-1 text-on-error-container/80">
                {`"${duplicate.title}"`}
              </p>
              <p className="type-micro mt-0.5 text-on-error-container/60">
                {formatDate(duplicate.createdAt)} 저장됨
              </p>
            </div>
          </div>
        )}

        {error && !duplicate && <p className="type-micro mt-2 text-error">{error}</p>}
        {checking && <p className="type-micro mt-2 text-outline">중복 여부를 확인하고 있어요.</p>}
      </div>

      <button
        type="submit"
        disabled={loading || !input.trim() || !!duplicate || checking}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-secondary-container py-4 text-[0.98rem] font-semibold text-on-secondary-container transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
      >
        <Icon name="archive" className="h-5 w-5" />
        {loading ? '저장 중...' : targetFolderId ? '저장하고 컬렉션에 담기' : '보관함에 추가'}
      </button>
    </form>
  )
}
