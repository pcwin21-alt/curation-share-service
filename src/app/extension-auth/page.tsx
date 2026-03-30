'use client'

import { useEffect, useState } from 'react'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '@/lib/firebase'

function postExtensionAuthResult(event: MessageEvent, payload: Record<string, unknown>) {
  const target = event.source
  if (!target || typeof target !== 'object' || !('postMessage' in target)) return

  ;(target as WindowProxy).postMessage(payload, { targetOrigin: event.origin })
}

export default function ExtensionAuthPage() {
  const [status, setStatus] = useState('확장 로그인 대기 중')

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type !== 'initAuth') return

      if (!auth) {
        postExtensionAuthResult(event, {
          type: 'extension-auth-result',
          ok: false,
          error: 'Firebase 인증이 아직 준비되지 않았습니다.',
        })
        return
      }

      try {
        setStatus('Google 로그인 창을 여는 중')
        const provider = new GoogleAuthProvider()
        provider.setCustomParameters({ prompt: 'select_account' })

        const credential = await signInWithPopup(auth, provider)
        const idToken = await credential.user.getIdToken()

        postExtensionAuthResult(event, {
          type: 'extension-auth-result',
          ok: true,
          idToken,
          email: credential.user.email ?? '',
          displayName: credential.user.displayName ?? '',
        })
        setStatus('로그인 완료')
      } catch (error) {
        console.error('[extension-auth] signInWithPopup failed:', error)
        const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''

        postExtensionAuthResult(event, {
          type: 'extension-auth-result',
          ok: false,
          error: code ? `로그인에 실패했습니다. (${code})` : '로그인에 실패했습니다.',
        })
        setStatus('로그인 실패')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md rounded-[28px] border border-outline-variant/20 bg-surface px-7 py-8 text-center shadow-sm">
        <p className="type-micro mb-2 font-semibold text-secondary">EXTENSION AUTH</p>
        <h1 className="font-headline text-[1.4rem] text-primary">curatio 확장 로그인</h1>
        <p className="type-body mt-3 text-on-surface-variant">
          이 페이지는 Chrome 확장프로그램에서 Google 로그인 팝업을 여는 용도로 사용됩니다.
        </p>
        <p className="type-micro mt-5 font-semibold text-on-surface-variant">{status}</p>
      </div>
    </main>
  )
}
