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
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

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
    await signInWithPopup(auth, provider)
  }

  async function signOut() {
    if (!auth) return
    await firebaseSignOut(auth)
  }

  async function refreshProfile() {
    if (user) await loadProfile(user)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
