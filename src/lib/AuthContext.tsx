'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

export interface UserProfile {
  uid: string
  email: string
  nickname: string
  photoURL?: string
  createdAt: number
}

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  authError: string
  clearAuthError: () => void
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  function describeAuthError(error: unknown) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''

    switch (code) {
      case 'auth/unauthorized-domain':
        return 'Firebase Authorized domains에 현재 배포 도메인이 빠져 있습니다.'
      case 'auth/operation-not-allowed':
        return 'Firebase에서 Google 로그인이 아직 활성화되지 않았습니다.'
      case 'auth/popup-blocked':
        return '브라우저가 로그인 팝업을 차단했습니다.'
      case 'auth/popup-closed-by-user':
        return '로그인 팝업이 닫혀서 인증이 중단되었습니다.'
      case 'auth/cancelled-popup-request':
        return '이전 로그인 팝업 요청이 취소되었습니다. 다시 시도해 주세요.'
      default:
        return code ? `Google 로그인에 실패했습니다. (${code})` : 'Google 로그인에 실패했습니다.'
    }
  }

  async function loadProfile(u: User) {
    const ref = doc(db, 'users', u.uid)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      setProfile(snap.data() as UserProfile)
    } else {
      const newProfile: UserProfile = {
        uid: u.uid,
        email: u.email ?? '',
        nickname: u.displayName ?? u.email?.split('@')[0] ?? '사용자',
        photoURL: u.photoURL ?? undefined,
        createdAt: Date.now(),
      }
      await setDoc(ref, newProfile)
      setProfile(newProfile)
    }
  }

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        setAuthError('')
        await loadProfile(u)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function signInWithGoogle() {
    if (!auth) throw new Error('Firebase 인증 설정이 아직 준비되지 않았습니다.')

    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    try {
      setAuthError('')
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.error('[auth] Google sign-in failed:', error)
      setAuthError(describeAuthError(error))
      throw error
    }
  }

  async function signOut() {
    if (!auth) return
    await firebaseSignOut(auth)
  }

  async function refreshProfile() {
    if (user) await loadProfile(user)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        authError,
        clearAuthError: () => setAuthError(''),
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
