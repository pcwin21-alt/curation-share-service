import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { analyzeCard, ANALYSIS_VERSION } from '@/lib/analyzeCard'
import { detectPlatform, isValidUrl } from '@/lib/detectPlatform'
import { db } from '@/lib/firebase'
import { getUserDisplayName, readBearerToken, verifyFirebaseIdToken } from '@/lib/serverAuth'
import { ContentCard } from '@/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const token = readBearerToken(req.headers.get('authorization'))
  const user = await verifyFirebaseIdToken(token)

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = await req.json()
  const { url, rawText } = body

  const isUrl = Boolean(url && isValidUrl(url))
  const isText = !isUrl && Boolean(rawText && rawText.trim().length > 10)

  if (!isUrl && !isText) {
    return NextResponse.json(
      { error: '올바른 링크 또는 충분한 길이의 텍스트를 입력해 주세요.' },
      { status: 400 },
    )
  }

  if (isUrl) {
    const duplicateSnapshot = await getDocs(
      query(
        collection(db, 'cards'),
        where('ownerUid', '==', user.uid),
        where('url', '==', url),
      ),
    )

    if (!duplicateSnapshot.empty) {
      const duplicate = duplicateSnapshot.docs[0].data() as ContentCard

      return NextResponse.json(
        {
          error: '이미 저장한 링크입니다.',
          duplicate: { title: duplicate.title, createdAt: duplicate.createdAt },
        },
        { status: 409 },
      )
    }
  }

  if (isText) {
    const prefix = rawText.trim().slice(0, 100)
    const textSnapshot = await getDocs(
      query(
        collection(db, 'cards'),
        where('ownerUid', '==', user.uid),
        where('platform', '==', 'text'),
      ),
    )

    const duplicate = textSnapshot.docs.find((item) => {
      const savedText: string = item.data().rawText ?? ''
      return savedText.slice(0, 100) === prefix
    })

    if (duplicate) {
      const duplicateData = duplicate.data() as ContentCard

      return NextResponse.json(
        {
          error: '비슷한 텍스트가 이미 저장돼 있습니다.',
          duplicate: { title: duplicateData.title, createdAt: duplicateData.createdAt },
        },
        { status: 409 },
      )
    }
  }

  const id = uuidv4()
  const platform = isUrl ? detectPlatform(url) : 'text'
  const now = Date.now()

  const initialCard: ContentCard = {
    id,
    platform,
    ownerUid: user.uid,
    ownerName: getUserDisplayName(user),
    title: isUrl ? url : `${rawText.slice(0, 60)}...`,
    summary: [],
    keyInsight: '',
    contextMemo: '',
    tags: [],
    folderIds: [],
    status: 'saving',
    createdAt: now,
    updatedAt: now,
    analysisError: '',
    analysisWarnings: [],
    analysisVersion: ANALYSIS_VERSION,
    ...(isUrl ? { url } : {}),
    ...(isText ? { rawText } : {}),
  }

  await setDoc(doc(db, 'cards', id), initialCard)

  analyzeCard({
    id,
    url: isUrl ? url : undefined,
    rawText,
    platform,
  }).catch(console.error)

  return NextResponse.json({ id, status: 'saving' })
}
