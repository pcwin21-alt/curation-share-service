import OpenAI from 'openai'
import { CollectionSummaryResult, ContentCard as CardType } from '@/types'

interface SynthesizeCollectionParams {
  collectionName: string
  cards: CardType[]
  mode: 'all' | 'selected'
}

function trimLine(value: string, maxLength = 180) {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function buildSourcePayload(cards: CardType[]) {
  return cards
    .map((card, index) => {
      const lines = [
        `[${index + 1}] 제목: ${card.title}`,
        `플랫폼: ${card.platform}`,
        `키 인사이트: ${card.keyInsight || '없음'}`,
        `메모: ${card.contextMemo || '없음'}`,
        `태그: ${card.tags.length > 0 ? card.tags.join(', ') : '없음'}`,
        `요약: ${card.summary.length > 0 ? card.summary.join(' / ') : '없음'}`,
      ]

      if (card.rawText) {
        lines.push(`원문 일부: ${trimLine(card.rawText, 260)}`)
      }

      return lines.join('\n')
    })
    .join('\n\n')
}

function buildFallbackSummary({
  collectionName,
  cards,
  mode,
}: SynthesizeCollectionParams): CollectionSummaryResult {
  const tagCount = new Map<string, number>()

  cards.forEach((card) => {
    card.tags.forEach((tag) => {
      tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1)
    })
  })

  const topTags = [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tag]) => tag)

  const keyTakeaways = cards.slice(0, 3).map((card) => ({
    point: trimLine(card.keyInsight || card.summary[0] || `${card.title}에서 핵심 포인트를 확인해 보세요.`, 80),
    sources: [card.title],
  }))

  const sourceSpotlights = cards.slice(0, 3).map((card) => ({
    title: card.title,
    reason: trimLine(
      card.contextMemo || card.summary[0] || '컬렉션의 흐름을 이해할 때 함께 보면 좋은 콘텐츠입니다.',
      90,
    ),
  }))

  return {
    overview: `${collectionName} 컬렉션의 ${cards.length}개 콘텐츠를 바탕으로 묶어보면, ${
      topTags.length > 0 ? `${topTags.join(', ')} 같은 흐름이 두드러집니다.` : '몇 가지 공통된 관점이 반복됩니다.'
    } ${mode === 'selected' ? '선택한 콘텐츠 중심으로 빠르게 핵심을 묶었습니다.' : '전체 흐름을 한 번에 훑을 수 있게 정리했습니다.'}`,
    keyTakeaways,
    sectionSummary:
      cards
        .slice(0, 4)
        .map((card) => trimLine(card.summary[0] || card.keyInsight || card.title, 60))
        .join(' ') || '아직 요약할 만한 콘텐츠가 충분하지 않습니다.',
    nextActions: [
      '겹치는 주제를 가진 콘텐츠끼리 다시 한 번 폴더 구조를 정리해 보세요.',
      '메모가 비어 있는 카드에는 저장 이유나 활용 계획을 짧게 남겨두세요.',
      '컬렉션의 대표가 될 카드 2~3개를 골라 공개 링크 설명에 활용해 보세요.',
    ],
    sourceSpotlights,
    suggestedQuestions: [
      '이 컬렉션에서 가장 반복해서 등장하는 관점은 무엇인가요?',
      '지금 빠져 있는 반대 사례나 보완 자료는 무엇인가요?',
      '이 내용을 누군가에게 소개한다면 어떤 순서로 보여주면 좋을까요?',
    ],
    sourceCount: cards.length,
    usedFallback: true,
  }
}

function normalizeResult(
  parsed: Partial<CollectionSummaryResult>,
  sourceCount: number,
): CollectionSummaryResult {
  return {
    overview: parsed.overview?.trim() || '컬렉션 전체 흐름을 한눈에 볼 수 있게 정리했습니다.',
    keyTakeaways:
      parsed.keyTakeaways?.filter((item) => item?.point)?.slice(0, 4).map((item) => ({
        point: trimLine(item.point, 120),
        sources: (item.sources ?? []).slice(0, 3),
      })) ?? [],
    sectionSummary:
      parsed.sectionSummary?.trim() || '주요 흐름과 공통된 키워드를 중심으로 묶었습니다.',
    nextActions:
      parsed.nextActions?.filter(Boolean).slice(0, 4).map((item) => trimLine(item, 120)) ?? [],
    sourceSpotlights:
      parsed.sourceSpotlights
        ?.filter((item) => item?.title)
        .slice(0, 4)
        .map((item) => ({
          title: trimLine(item.title, 80),
          reason: trimLine(item.reason, 100),
        })) ?? [],
    suggestedQuestions:
      parsed.suggestedQuestions
        ?.filter(Boolean)
        .slice(0, 4)
        .map((item) => trimLine(item, 120)) ?? [],
    sourceCount,
    usedFallback: false,
  }
}

export async function synthesizeCollection({
  collectionName,
  cards,
  mode,
}: SynthesizeCollectionParams): Promise<CollectionSummaryResult> {
  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackSummary({ collectionName, cards, mode })
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const prompt = `당신은 여러 자료를 모아 읽기 쉽게 정리해주는 리서치 어시스턴트다.
아래는 "${collectionName}" 컬렉션에 담긴 콘텐츠들이다.
선택 모드: ${mode === 'selected' ? '선택 콘텐츠만 요약' : '컬렉션 전체 요약'}

반드시 한국어 JSON으로만 응답해라.
NotebookLM처럼 "여러 출처를 종합한 설명" 톤으로, 과장 없이 출처에 근거해 정리해라.
출처 제목은 실제 자료 제목만 사용하고, 존재하지 않는 내용을 만들지 마라.

응답 형식:
{
  "overview": "컬렉션 전체를 한 문단으로 설명",
  "keyTakeaways": [
    { "point": "핵심 포인트", "sources": ["출처 제목1", "출처 제목2"] }
  ],
  "sectionSummary": "공통 흐름을 3~5문장으로 풀어쓴 설명",
  "nextActions": ["다음에 살펴보면 좋은 방향", "활용 아이디어"],
  "sourceSpotlights": [
    { "title": "출처 제목", "reason": "왜 눈여겨보면 좋은지" }
  ],
  "suggestedQuestions": ["이 컬렉션을 더 읽어볼 때 던질 질문"]
}

자료:
${buildSourcePayload(cards)}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.35,
    })

    const raw = response.choices[0].message.content ?? '{}'
    const parsed = JSON.parse(raw)
    return normalizeResult(parsed, cards.length)
  } catch (error) {
    console.error('[synthesizeCollection] 컬렉션 요약 실패:', error)
    return buildFallbackSummary({ collectionName, cards, mode })
  }
}
