'use client'

import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export function useUnreadNotificationsCount(uid?: string) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!uid) return

    const unreadQuery = query(
      collection(db, 'users', uid, 'notifications'),
      where('unread', '==', true),
    )

    const unsubscribe = onSnapshot(unreadQuery, (snapshot) => {
      setCount(snapshot.size)
    })

    return unsubscribe
  }, [uid])

  return uid ? count : 0
}
