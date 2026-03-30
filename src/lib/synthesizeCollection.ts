import OpenAI from 'openai'
import { getPersonaPreset } from '@/lib/personaPresets'
import {
  CollectionSummaryResponse,
  CollectionSummaryResult,
  ContentCard as CardType,
  PersonaPresetId,
  PersonaSummaryResult,
  SummaryMode,
  SummaryType,
} from '@/types'

interface SynthesizeCollectionParams {
  collectionName: string
  cards: CardType[]
  mode: SummaryMode
  summaryType: SummaryType
  personaPresetId?: PersonaPresetId
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
        `핵심 인사이트: ${card.keyInsight || '없음'}`,
        `메모: ${card.contextMemo || '없음'}`,
        `태그: ${card.tags.length > 0 ? card.tags.join(', ') : '없음'}`,
        `요약: ${card.summary.length > 0 ? card.summary.join(' / ') : '없음'}`,
      ]

      if (card.rawText) {
        lines.push(`본문 발췌: ${trimLine(card.rawText, 260)}`)
      }

      return lines.join('\n')
    })
    .join('\n\n')
}

function getTopTags(cards: CardType[]) {
  const tagCount = new Map<string, number>()

  cards.forEach((card) => {
    card.tags.forEach((tag) => {
      const normalized = tag.trim()
      if (!normalized) return
      tagCount.set(normalized, (tagCount.get(normalized) ?? 0) + 1)
    })
  })

  return [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tag]) => tag)
}

function buildCollectionFallbackSummary({
  collectionName,
  cards,
  mode,
}: Omit<SynthesizeCollectionParams, 'summaryType' | 'personaPresetId'>): CollectionSummaryResult {
  const topTags = getTopTags(cards)

  return {
    summaryType: 'collection',
    overview: `${collectionName} 컬렉션의 ${cards.length}개 콘텐츠를 묶어보면, ${
      topTags.length > 0 ? `${topTags.join(', ')} 같은 흐름이 반복됩니다.` : '몇 가지 공통된 관심사가 드러납니다.'
    } ${mode === 'selected' ? '선택한 콘텐츠를 중심으로 핵심만 빠르게 정리했습니다.' : '전체 흐름을 한 번에 훑을 수 있게 정리했습니다.'}`,
    keyTakeaways: cards.slice(0, 3).map((card) => ({
      point: trimLine(card.keyInsight || card.summary[0] || `${card.title}에서 핵심 포인트를 다시 살펴보세요.`, 96),
      sources: [card.title],
    })),
    sectionSummary:
      cards
        .slice(0, 4)
        .map((card) => trimLine(card.summary[0] || card.keyInsight || card.title, 72))
        .join(' ') || '아직 요약할 만한 콘텐츠가 충분하지 않습니다.',
    nextActions: [
      '겹치는 주제를 중심으로 카드 묶음을 다시 정리해 보세요.',
      '메모가 비어 있는 카드에는 왜 저장했는지와 다음 액션을 적어 두세요.',
      '대표 카드 2~3개를 골라 공개 링크 설명문에 먼저 배치해 보세요.',
    ],
    sourceSpotlights: cards.slice(0, 3).map((card) => ({
      title: card.title,
      reason: trimLine(
        card.contextMemo || card.summary[0] || '이 컬렉션의 맥락을 이해할 때 먼저 읽어볼 만한 카드입니다.',
        100,
      ),
    })),
    suggestedQuestions: [
      '이 컬렉션에서 가장 반복해서 등장하는 문제의식은 무엇인가?',
      '지금 비어 있는 보완 자료는 무엇인가?',
      '처음 보는 사람에게는 어떤 순서로 보여주는 것이 가장 이해되기 쉬운가?',
    ],
    sourceCount: cards.length,
    usedFallback: true,
  }
}

function buildPersonaFallbackSummary({
  collectionName,
  cards,
  personaPresetId = 'toegye',
}: Pick<SynthesizeCollectionParams, 'collectionName' | 'cards' | 'personaPresetId'>): PersonaSummaryResult {
  const preset = getPersonaPreset(personaPresetId)
  const topTags = getTopTags(cards)
  const strengths = cards
    .slice(0, 3)
    .map(
      (card) =>
        trimLine(card.keyInsight || card.summary[0] || `${card.title}는 ${preset.shortLabel} 렌즈에서 의미 있는 실마리를 줍니다.`, 110),
    )
  const cautions = [
    `${preset.shortLabel}의 기준으로 보면 빠른 소비보다 오래 남는 기준을 더 분명히 해야 합니다.`,
    '도구적 효율만 강조된 카드가 있다면 왜 중요한지의 근거를 더 붙이는 편이 좋습니다.',
    '대표 카드 사이의 연결 맥락이 약하면 읽는 사람에게는 개별 링크 묶음처럼 보일 수 있습니다.',
  ]

  return {
    summaryType: 'persona',
    personaPresetId: preset.id,
    personaLabel: preset.label,
    personaDescription: preset.description,
    lensSummary: `${preset.shortLabel}의 렌즈로 ${collectionName} 컬렉션을 읽으면, ${
      topTags.length > 0 ? `${topTags.join(', ')} 흐름이 특히 눈에 들어옵니다.` : '자료 사이에 깔린 태도와 기준이 먼저 보입니다.'
    } 이 관점은 단순한 정보 묶음보다 어떤 기준으로 묶였는지를 더 중요하게 봅니다.`,
    strengths: strengths.length > 0 ? strengths : ['컬렉션 안에서 높이 볼 점을 정리할 카드가 아직 충분하지 않습니다.'],
    cautions,
    reframingCriteria: [
      `${preset.shortLabel}의 기준으로 가장 중요한 질문을 제목과 소개 문장에 드러냅니다.`,
      '카드 순서를 다시 정해 읽는 사람이 자연스럽게 기준과 흐름을 따라가게 합니다.',
      '대표 카드마다 왜 이 컬렉션에 들어왔는지 메모를 더 분명하게 붙입니다.',
    ],
    suggestedQuestions:
      preset.guidingQuestions.length > 0
        ? preset.guidingQuestions
        : ['이 렌즈로 다시 읽을 때 가장 중요하게 남는 질문은 무엇인가?'],
    sourceSpotlights: cards.slice(0, 3).map((card) => ({
      title: card.title,
      reason: trimLine(card.summary[0] || card.contextMemo || '이 카드가 이 렌즈의 핵심을 가장 잘 드러냅니다.', 100),
    })),
    sourceCount: cards.length,
    usedFallback: true,
  }
}

function normalizeCollectionResult(
  parsed: Partial<CollectionSummaryResult>,
  sourceCount: number,
): CollectionSummaryResult {
  return {
    summaryType: 'collection',
    overview: parsed.overview?.trim() || '컬렉션 전체를 빠르게 훑어볼 수 있게 정리했습니다.',
    keyTakeaways:
      parsed.keyTakeaways?.filter((item) => item?.point)?.slice(0, 4).map((item) => ({
        point: trimLine(item.point, 120),
        sources: (item.sources ?? []).slice(0, 3),
      })) ?? [],
    sectionSummary:
      parsed.sectionSummary?.trim() || '주요 흐름과 공통 키워드를 중심으로 묶었습니다.',
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
      parsed.suggestedQuestions?.filter(Boolean).slice(0, 4).map((item) => trimLine(item, 120)) ?? [],
    sourceCount,
    usedFallback: false,
  }
}

function normalizePersonaResult(
  parsed: Partial<PersonaSummaryResult>,
  sourceCount: number,
  personaPresetId: PersonaPresetId,
): PersonaSummaryResult {
  const preset = getPersonaPreset(personaPresetId)

  return {
    summaryType: 'persona',
    personaPresetId: preset.id,
    personaLabel: parsed.personaLabel?.trim() || preset.label,
    personaDescription: parsed.personaDescription?.trim() || preset.description,
    lensSummary:
      parsed.lensSummary?.trim() || `${preset.shortLabel} 렌즈로 컬렉션을 다시 읽은 관점 요약입니다.`,
    strengths: parsed.strengths?.filter(Boolean).slice(0, 3).map((item) => trimLine(item, 120)) ?? [],
    cautions: parsed.cautions?.filter(Boolean).slice(0, 3).map((item) => trimLine(item, 120)) ?? [],
    reframingCriteria:
      parsed.reframingCriteria?.filter(Boolean).slice(0, 3).map((item) => trimLine(item, 120)) ?? [],
    suggestedQuestions:
      parsed.suggestedQuestions?.filter(Boolean).slice(0, 4).map((item) => trimLine(item, 120)) ??
      preset.guidingQuestions,
    sourceSpotlights:
      parsed.sourceSpotlights
        ?.filter((item) => item?.title)
        .slice(0, 4)
        .map((item) => ({
          title: trimLine(item.title, 80),
          reason: trimLine(item.reason, 100),
        })) ?? [],
    sourceCount,
    usedFallback: false,
  }
}

export async function synthesizeCollection({
  collectionName,
  cards,
  mode,
  summaryType,
  personaPresetId = 'toegye',
}: SynthesizeCollectionParams): Promise<CollectionSummaryResponse> {
  if (!process.env.OPENAI_API_KEY) {
    return summaryType === 'persona'
      ? buildPersonaFallbackSummary({ collectionName, cards, personaPresetId })
      : buildCollectionFallbackSummary({ collectionName, cards, mode })
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    if (summaryType === 'persona') {
      const preset = getPersonaPreset(personaPresetId)
      const prompt = `당신은 여러 자료를 한 인물의 지식과 철학의 렌즈로 다시 읽어주는 편집자다.
아래는 "${collectionName}" 컬렉션에 담긴 콘텐츠들이다.
이번 작업은 단순 요약이 아니라 "${preset.label}"의 관점으로 이 묶음을 다시 해석하는 것이다.

중요 규칙:
- 실제 인물의 말투를 흉내 내지 말고, 그 인물의 기준과 사고방식만 렌즈처럼 사용한다.
- 과장 없이, 카드에 담긴 정보와 메모를 바탕으로만 정리한다.
- 반드시 JSON으로만 답한다.

렌즈 설명: ${preset.description}
핵심 키워드: ${preset.lensKeywords.join(', ')}
가이드 질문: ${preset.guidingQuestions.join(' / ')}

응답 형식:
{
  "personaLabel": "${preset.label}",
  "personaDescription": "${preset.description}",
  "lensSummary": "이 렌즈에서 컬렉션 전체를 다시 보는 한 문단",
  "strengths": ["높이 볼 점 1", "높이 볼 점 2", "높이 볼 점 3"],
  "cautions": ["경계할 점 1", "경계할 점 2", "경계할 점 3"],
  "reframingCriteria": ["이 관점에서 다시 묶는 기준 1", "기준 2", "기준 3"],
  "suggestedQuestions": ["다음 질문 1", "다음 질문 2", "다음 질문 3"],
  "sourceSpotlights": [
    { "title": "출처 제목", "reason": "왜 이 카드가 이 렌즈에서 중요한지" }
  ]
}

자료:
${buildSourcePayload(cards)}`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.45,
      })

      const raw = response.choices[0].message.content ?? '{}'
      const parsed = JSON.parse(raw)
      return normalizePersonaResult(parsed, cards.length, personaPresetId)
    }

    const prompt = `당신은 여러 자료를 모아 읽기 좋게 정리해주는 리서치 어시스턴트다.
아래는 "${collectionName}" 컬렉션에 담긴 콘텐츠들이다.
선택 모드: ${mode === 'selected' ? '선택 콘텐츠만 요약' : '컬렉션 전체 요약'}

반드시 JSON으로만 답하라.
NotebookLM처럼 "여러 출처를 종합해 설명"하되 과장 없이 출처의 근거를 정리해라.
출처 제목은 실제 자료 제목만 사용하고, 존재하지 않는 내용을 만들지 마라.

응답 형식:
{
  "overview": "컬렉션 전체를 한 문단으로 설명",
  "keyTakeaways": [
    { "point": "핵심 포인트", "sources": ["출처 제목1", "출처 제목2"] }
  ],
  "sectionSummary": "공통 흐름을 3~5문장으로 자연스럽게 설명",
  "nextActions": ["다음에 해볼 일 1", "다음에 해볼 일 2"],
  "sourceSpotlights": [
    { "title": "출처 제목", "reason": "왜 주목해서 보면 좋은지" }
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
    return normalizeCollectionResult(parsed, cards.length)
  } catch (error) {
    console.error('[synthesizeCollection] 컬렉션 요약 실패:', error)

    return summaryType === 'persona'
      ? buildPersonaFallbackSummary({ collectionName, cards, personaPresetId })
      : buildCollectionFallbackSummary({ collectionName, cards, mode })
  }
}
