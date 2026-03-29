import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface SummaryResult {
  summary: string[]
  keyInsight: string
  contextMemo: string
  tags: string[]
}

export async function summarize(
  title: string,
  content: string,
): Promise<SummaryResult> {
  const prompt = `아래 콘텐츠를 분석해서 JSON으로 응답해줘. 반드시 한국어로.

제목: ${title}
내용: ${content.slice(0, 3000)}

응답 형식 (JSON만, 다른 텍스트 없이):
{
  "summary": ["1줄 요약", "2줄 요약", "3줄 요약"],
  "keyInsight": "핵심 인사이트 1문장 (이 콘텐츠의 가장 중요한 주장/발견)",
  "contextMemo": "이 콘텐츠를 저장한 이유를 추측한 짧은 메모 (큐레이터 관점)",
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"]
}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const raw = response.choices[0].message.content ?? '{}'
  const parsed = JSON.parse(raw)

  return {
    summary: parsed.summary ?? ['요약을 생성하지 못했습니다.'],
    keyInsight: parsed.keyInsight ?? '',
    contextMemo: parsed.contextMemo ?? '',
    tags: parsed.tags ?? [],
  }
}
