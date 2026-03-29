import { doc, updateDoc } from 'firebase/firestore'
import { deriveHeuristicAnalysis } from '@/lib/deriveHeuristicAnalysis'
import { fetchMeta } from '@/lib/fetchMeta'
import { fetchReadableContent } from '@/lib/fetchReadableContent'
import { fetchRenderedContent } from '@/lib/fetchRenderedContent'
import { db } from '@/lib/firebase'
import { summarize } from '@/lib/summarize'
import { ContentCard } from '@/types'

export const ANALYSIS_VERSION = 2

const RENDER_FALLBACK_PLATFORMS = new Set<ContentCard['platform']>([
  'brunch',
  'facebook',
  'linkedin',
  'naver',
  'other',
])

function trimText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value
}

function dedupeWarnings(warnings: string[]) {
  return [...new Set(warnings.filter(Boolean))]
}

interface AnalyzeCardParams {
  id: string
  url?: string
  rawText?: string
  platform: ContentCard['platform']
}

export async function analyzeCard({
  id,
  url,
  rawText,
  platform,
}: AnalyzeCardParams) {
  const cardRef = doc(db, 'cards', id)
  const isUrl = Boolean(url)
  const startedAt = Date.now()

  try {
    await updateDoc(cardRef, {
      status: 'analyzing',
      analysisError: '',
      analysisWarnings: [],
      analysisVersion: ANALYSIS_VERSION,
      updatedAt: startedAt,
    })

    let title = ''
    let description = ''
    let thumbnailUrl: string | undefined
    let extractedText = ''
    let renderedExcerpt = ''
    let metaSuccess = false
    const warnings: string[] = []

    if (isUrl && url) {
      const [metaResult, readableResult] = await Promise.allSettled([
        fetchMeta(url),
        fetchReadableContent(url, platform),
      ])

      const meta =
        metaResult.status === 'fulfilled'
          ? metaResult.value
          : { title: '', description: '', thumbnailUrl: undefined, success: false }
      const readable =
        readableResult.status === 'fulfilled'
          ? readableResult.value
          : { title: '', excerpt: '', text: '', thumbnailUrl: undefined, success: false }

      metaSuccess = meta.success
      title = meta.title || readable.title || url
      description = readable.excerpt || meta.description || ''
      thumbnailUrl = meta.thumbnailUrl || readable.thumbnailUrl
      extractedText = readable.text || description

      if (!readable.text && RENDER_FALLBACK_PLATFORMS.has(platform)) {
        const rendered = await fetchRenderedContent(url, platform)

        title = title || rendered.title || url
        renderedExcerpt = rendered.excerpt
        description = rendered.excerpt || description
        thumbnailUrl = thumbnailUrl || rendered.thumbnailUrl
        extractedText = rendered.text || extractedText
      }

      if (!thumbnailUrl) {
        warnings.push('썸네일을 찾지 못했습니다.')
      }

      if (!metaSuccess) {
        warnings.push('메타 정보를 찾지 못해 기본 정보로 정리했습니다.')
      }

      if (!extractedText) {
        warnings.push('본문 추출에 실패해 제한된 정보로 정리했습니다.')
      }
    } else if (rawText) {
      title = trimText(rawText, 80)
      description = trimText(rawText, 280)
      extractedText = rawText.trim()
    }

    const heuristic = deriveHeuristicAnalysis({
      title,
      description,
      text: extractedText,
      platform,
    })

    const nextWarnings = dedupeWarnings([
      ...warnings,
      ...(!process.env.OPENAI_API_KEY ? ['AI 연결 없이 기본 요약으로 정리했습니다.'] : []),
    ])

    const baseUpdate: Record<string, unknown> = {
      title,
      summary: heuristic.summary,
      keyInsight: heuristic.keyInsight,
      tags: heuristic.tags,
      status: 'done',
      updatedAt: Date.now(),
      analysisError: '',
      analysisWarnings: nextWarnings,
      analysisVersion: ANALYSIS_VERSION,
    }

    if (thumbnailUrl) {
      baseUpdate.thumbnailUrl = thumbnailUrl
    }

    if (extractedText) {
      baseUpdate.rawText = extractedText
    }

    if (!process.env.OPENAI_API_KEY) {
      await updateDoc(cardRef, baseUpdate)
      return
    }

    try {
      const content = extractedText || renderedExcerpt || description || rawText || title
      const result = await summarize(title, content)

      await updateDoc(cardRef, {
        ...baseUpdate,
        summary: result.summary?.length ? result.summary : heuristic.summary,
        keyInsight: result.keyInsight || heuristic.keyInsight,
        contextMemo: result.contextMemo || '',
        tags: result.tags?.length ? result.tags : heuristic.tags,
        analysisWarnings: nextWarnings,
      })
    } catch (error) {
      console.error('[analyzeCard] AI summarize failed:', error)

      await updateDoc(cardRef, {
        ...baseUpdate,
        analysisWarnings: dedupeWarnings([...nextWarnings, 'AI 요약에 실패해 기본 요약으로 대체했습니다.']),
      })
    }
  } catch (error) {
    console.error('[analyzeCard] failed:', error)

    await updateDoc(cardRef, {
      status: 'error',
      title: rawText ? trimText(rawText, 80) : url || '콘텐츠 분석 실패',
      updatedAt: Date.now(),
      analysisError: '링크를 분석하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      analysisWarnings: [],
      analysisVersion: ANALYSIS_VERSION,
    })
  }
}
