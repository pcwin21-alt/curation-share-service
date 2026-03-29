import OpenAI from 'openai'

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
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured.')
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const prompt = `Analyze the content below and respond only as JSON.

Title: ${title}
Content: ${content.slice(0, 3000)}

Return this JSON shape only:
{
  "summary": ["One-line summary 1", "One-line summary 2", "One-line summary 3"],
  "keyInsight": "The single most important takeaway from the content",
  "contextMemo": "A short note about why this content may be worth saving",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
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
    summary: parsed.summary ?? ['Summary could not be generated.'],
    keyInsight: parsed.keyInsight ?? '',
    contextMemo: parsed.contextMemo ?? '',
    tags: parsed.tags ?? [],
  }
}
