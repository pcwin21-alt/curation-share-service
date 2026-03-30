'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
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
  isSigningIn: boolean
  authError: string
  clearAuthError: () => void
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getFirebaseErrorCode(error: unknown) {
  return typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
}

function describeAuthError(error: unknown) {
  const code = getFirebaseErrorCode(error)

  switch (code) {
    case 'auth/unauthorized-domain':
      return 'Firebase Authorized domains에 현재 배포 도메인이 빠져 있습니다.'
    case 'auth/operation-not-allowed':
      return 'Firebase에서 Google 로그인이 아직 활성화되지 않았습니다.'
    case 'auth/popup-blocked':
      return '브라우저가 로그인 팝업을 막았습니다. 리디렉션 로그인으로 전환합니다.'
    case 'auth/popup-closed-by-user':
      return '로그인 팝업이 중간에 닫혔습니다. 다시 시도해 주세요.'
    case 'auth/cancelled-popup-request':
      return '로그인 요청이 여러 번 겹쳤습니다. 한 번만 다시 시도해 주세요.'
    case 'auth/network-request-failed':
      return '네트워크 문제로 Google 로그인에 실패했습니다.'
    default:
      return code ? `Google 로그인에 실패했습니다. (${code})` : 'Google 로그인에 실패했습니다.'
  }
}

function waitForSignedInUser(timeoutMs = 1800) {
  if (!auth) return Promise.resolve<User | null>(null)
  const authInstance = auth
  if (authInstance.currentUser) return Promise.resolve(authInstance.currentUser)

  return new Promise<User | null>((resolve) => {
    const timeoutId = window.setTimeout(() => {
      unsubscribe()
      resolve(authInstance.currentUser)
    }, timeoutMs)

    const unsubscribe = onAuthStateChanged(authInstance, (nextUser) => {
      if (!nextUser) return
      window.clearTimeout(timeoutId)
      unsubscribe()
      resolve(nextUser)
    })
  })
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [authError, setAuthError] = useState('')
  const signInPromiseRef = useRef<Promise<void> | null>(null)

  async function loadProfile(nextUser: User) {
    const ref = doc(db, 'users', nextUser.uid)
    const snap = await getDoc(ref)

    if (snap.exists()) {
      setProfile(snap.data() as UserProfile)
      return
    }

    const newProfile: UserProfile = {
      uid: nextUser.uid,
      email: nextUser.email ?? '',
      nickname: nextUser.displayName ?? nextUser.email?.split('@')[0] ?? '사용자',
      createdAt: Date.now(),
      ...(nextUser.photoURL ? { photoURL: nextUser.photoURL } : {}),
    }

    await setDoc(ref, newProfile)
    setProfile(newProfile)
  }

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser)

      try {
        if (nextUser) {
          setAuthError('')
          await loadProfile(nextUser)
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.error('[auth] Failed to load profile:', error)
        setAuthError('로그인은 되었지만 프로필을 불러오는 중 문제가 생겼습니다.')
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  async function signInWithGoogle() {
    if (!auth) {
      throw new Error('Firebase 인증 설정이 아직 준비되지 않았습니다.')
    }

    if (signInPromiseRef.current) {
      return signInPromiseRef.current
    }

    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    const signInPromise = (async () => {
      setAuthError('')
      setIsSigningIn(true)

      try {
        await signInWithPopup(auth, provider)
      } catch (error) {
        const code = getFirebaseErrorCode(error)

        if (code === 'auth/popup-blocked') {
          setAuthError(describeAuthError(error))
          await signInWithRedirect(auth, provider)
          return
        }

        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          const settledUser = await waitForSignedInUser()
          if (settledUser) return
        }

        console.error('[auth] Google sign-in failed:', error)
        setAuthError(describeAuthError(error))
        throw error
      } finally {
        setIsSigningIn(false)
        signInPromiseRef.current = null
      }
    })()

    signInPromiseRef.current = signInPromise
    return signInPromise
  }

  async function signOut() {
    if (!auth) return
    await firebaseSignOut(auth)
  }

  async function refreshProfile() {
    if (user) {
      await loadProfile(user)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isSigningIn,
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
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
