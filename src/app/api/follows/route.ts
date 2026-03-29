import { NextRequest, NextResponse } from 'next/server'
import { doc, runTransaction } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { readBearerToken, verifyFirebaseIdToken } from '@/lib/serverAuth'
import { CurationFolder, FollowingCollection } from '@/types'

async function requireUser(req: NextRequest) {
  const token = readBearerToken(req.headers.get('authorization'))
  const user = await verifyFirebaseIdToken(token)

  if (!user) {
    return null
  }

  return user
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req)

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = await req.json()
  const folderId = String(body.folderId ?? '').trim()

  if (!folderId) {
    return NextResponse.json({ error: 'folderId가 필요합니다.' }, { status: 400 })
  }

  const folderRef = doc(db, 'folders', folderId)
  const followerRef = doc(db, 'folders', folderId, 'followers', user.uid)
  const followingRef = doc(db, 'users', user.uid, 'followingCollections', folderId)

  await runTransaction(db, async (transaction) => {
    const [folderSnapshot, followerSnapshot] = await Promise.all([
      transaction.get(folderRef),
      transaction.get(followerRef),
    ])

    if (!folderSnapshot.exists()) {
      throw new Error('NOT_FOUND')
    }

    const folder = folderSnapshot.data() as CurationFolder

    if (!folder.isPublic) {
      throw new Error('NOT_PUBLIC')
    }

    if (followerSnapshot.exists()) {
      return
    }

    const now = Date.now()
    const following: FollowingCollection = {
      id: folderId,
      folderId,
      collectionName: folder.name,
      shareSlug: folder.shareSlug,
      ownerName: folder.ownerName,
      followedAt: now,
    }

    transaction.set(followerRef, {
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? '',
      followedAt: now,
    })
    transaction.set(followingRef, following)
    transaction.update(folderRef, {
      followerCount: (folder.followerCount ?? 0) + 1,
      updatedAt: now,
    })
  })

  return NextResponse.json({ ok: true, following: true })
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser(req)

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = await req.json()
  const folderId = String(body.folderId ?? '').trim()

  if (!folderId) {
    return NextResponse.json({ error: 'folderId가 필요합니다.' }, { status: 400 })
  }

  const folderRef = doc(db, 'folders', folderId)
  const followerRef = doc(db, 'folders', folderId, 'followers', user.uid)
  const followingRef = doc(db, 'users', user.uid, 'followingCollections', folderId)

  await runTransaction(db, async (transaction) => {
    const [folderSnapshot, followerSnapshot] = await Promise.all([
      transaction.get(folderRef),
      transaction.get(followerRef),
    ])

    if (!folderSnapshot.exists()) {
      throw new Error('NOT_FOUND')
    }

    if (!followerSnapshot.exists()) {
      return
    }

    const folder = folderSnapshot.data() as CurationFolder

    transaction.delete(followerRef)
    transaction.delete(followingRef)
    transaction.update(folderRef, {
      followerCount: Math.max((folder.followerCount ?? 1) - 1, 0),
      updatedAt: Date.now(),
    })
  })

  return NextResponse.json({ ok: true, following: false })
}
