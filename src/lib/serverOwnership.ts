import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getUserDisplayName, VerifiedUser } from '@/lib/serverAuth'
import { ContentCard, CurationFolder } from '@/types'

function now() {
  return Date.now()
}

function isOwnedByUser(ownerUid: string | undefined, user: VerifiedUser) {
  return !ownerUid || ownerUid === user.uid
}

export async function requireOwnedFolder(folderId: string, user: VerifiedUser) {
  const folderRef = doc(db, 'folders', folderId)
  const folderSnapshot = await getDoc(folderRef)

  if (!folderSnapshot.exists()) {
    throw new Error('FOLDER_NOT_FOUND')
  }

  const folder = folderSnapshot.data() as CurationFolder

  if (!isOwnedByUser(folder.ownerUid, user)) {
    throw new Error('FOLDER_FORBIDDEN')
  }

  if (!folder.ownerUid) {
    const ownerName = folder.ownerName || getUserDisplayName(user)
    await updateDoc(folderRef, {
      ownerUid: user.uid,
      ownerName,
      updatedAt: now(),
    })

    return {
      ref: folderRef,
      folder: {
        ...folder,
        ownerUid: user.uid,
        ownerName,
      },
    }
  }

  return { ref: folderRef, folder }
}

export async function requireOwnedCard(cardId: string, user: VerifiedUser) {
  const cardRef = doc(db, 'cards', cardId)
  const cardSnapshot = await getDoc(cardRef)

  if (!cardSnapshot.exists()) {
    throw new Error('CARD_NOT_FOUND')
  }

  const card = cardSnapshot.data() as ContentCard

  if (!isOwnedByUser(card.ownerUid, user)) {
    throw new Error('CARD_FORBIDDEN')
  }

  if (!card.ownerUid) {
    const ownerName = card.ownerName || getUserDisplayName(user)
    await updateDoc(cardRef, {
      ownerUid: user.uid,
      ownerName,
      updatedAt: now(),
    })

    return {
      ref: cardRef,
      card: {
        ...card,
        ownerUid: user.uid,
        ownerName,
      },
    }
  }

  return { ref: cardRef, card }
}
