import { ContentCard as CardType, CurationFolder } from '@/types'

interface ExportInstagramStoryParams {
  folder: CurationFolder
  cards: CardType[]
  shareUrl: string
}

function cleanLine(value: string, maxLength: number) {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function buildTopTags(cards: CardType[]) {
  const counts = new Map<string, number>()

  cards.forEach((card) => {
    card.tags.forEach((tag) => {
      const normalized = tag.trim()
      if (!normalized) return
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
    })
  })

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag)
}

function buildHook(folder: CurationFolder, cards: CardType[]) {
  if (folder.description.trim()) {
    return cleanLine(folder.description, 76)
  }

  const firstCard = cards[0]
  if (firstCard?.summary?.[0]) {
    return cleanLine(firstCard.summary[0], 76)
  }

  const topTags = buildTopTags(cards)
  if (topTags.length > 0) {
    return `${topTags.join(' · ')} 흐름으로 읽는 큐레이션`
  }

  return '링크만 쌓아두지 않고, 다시 꺼내 읽기 좋게 정리한 컬렉션'
}

function buildHighlights(cards: CardType[]) {
  const candidates = cards
    .map((card) => cleanLine(card.keyInsight || card.summary[0] || card.title, 54))
    .filter(Boolean)

  return candidates.slice(0, 3)
}

export function buildInstagramStoryCaption({ folder, cards, shareUrl }: ExportInstagramStoryParams) {
  const topTags = buildTopTags(cards)

  return [
    `${folder.name}`,
    buildHook(folder, cards),
    '',
    topTags.length > 0 ? topTags.map((tag) => `#${tag}`).join(' ') : '',
    '',
    `컬렉션 보기 ${shareUrl}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export async function exportInstagramStory({ folder, cards, shareUrl }: ExportInstagramStoryParams) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('인스타 스토리 이미지를 만들지 못했습니다.')
  }

  const hook = buildHook(folder, cards)
  const highlights = buildHighlights(cards)
  const creatorName = folder.ownerName?.trim() || 'curatio curator'
  const cta = '프로필 링크에서 컬렉션 보기'
  const dateLabel = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const gradient = context.createLinearGradient(0, 0, 1080, 1920)
  gradient.addColorStop(0, '#efe8dc')
  gradient.addColorStop(0.52, '#dfe9df')
  gradient.addColorStop(1, '#f7f1e2')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.fillStyle = 'rgba(255, 253, 248, 0.86)'
  roundRect(context, 72, 74, 936, 1772, 42)
  context.fill()

  context.strokeStyle = 'rgba(47, 111, 82, 0.12)'
  context.lineWidth = 2
  roundRect(context, 72, 74, 936, 1772, 42)
  context.stroke()

  context.fillStyle = '#2f6f52'
  roundRect(context, 122, 124, 292, 68, 34)
  context.fill()

  context.fillStyle = '#f8f7f2'
  context.font = '700 28px "Pretendard", "Apple SD Gothic Neo", sans-serif'
  context.fillText('CURATIO STORY', 154, 168)

  context.fillStyle = '#171412'
  context.font = '800 98px "Pretendard", "Apple SD Gothic Neo", sans-serif'
  drawMultilineText(context, folder.name, 122, 286, 836, 112)

  context.fillStyle = '#47524b'
  context.font = '500 38px "Pretendard", "Apple SD Gothic Neo", sans-serif'
  drawMultilineText(context, hook, 122, 560, 820, 56)

  context.fillStyle = '#f7f1e2'
  roundRect(context, 122, 780, 836, 612, 38)
  context.fill()

  context.fillStyle = '#7a5a11'
  context.font = '700 30px "Pretendard", "Apple SD Gothic Neo", sans-serif'
  context.fillText('핵심 포인트', 166, 848)

  context.fillStyle = '#171412'
  context.font = '600 40px "Pretendard", "Apple SD Gothic Neo", sans-serif'

  const storyHighlights =
    highlights.length > 0 ? highlights : ['이 컬렉션의 핵심 흐름을 짧고 선명하게 정리했습니다.']

  storyHighlights.forEach((line, index) => {
    const y = 946 + index * 138
    context.fillStyle = '#c6922b'
    context.beginPath()
    context.arc(176, y - 16, 8, 0, Math.PI * 2)
    context.fill()

    context.fillStyle = '#171412'
    drawMultilineText(context, line, 204, y, 680, 52, 2)
  })

  context.fillStyle = '#2f6f52'
  roundRect(context, 122, 1494, 836, 194, 34)
  context.fill()

  context.fillStyle = '#f8f7f2'
  context.font = '700 26px "Pretendard", "Apple SD Gothic Neo", sans-serif'
  context.fillText('큐레이터', 166, 1560)
  context.font = '800 52px "Pretendard", "Apple SD Gothic Neo", sans-serif'
  context.fillText(cleanLine(creatorName, 24), 166, 1636)
  context.font = '500 30px "Pretendard", "Apple SD Gothic Neo", sans-serif'
  context.fillText(cta, 166, 1690)

  context.fillStyle = '#5b605d'
  context.font = '600 24px "Pretendard", "Apple SD Gothic Neo", sans-serif'
  context.fillText(dateLabel, 122, 1770)
  context.fillText(`링크: ${cleanLine(shareUrl, 48)}`, 430, 1770)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) {
    throw new Error('인스타 스토리 이미지를 저장하지 못했습니다.')
  }

  const fileName = `curatio-story-${folder.shareSlug || folder.slug || folder.id}.png`
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)

  return {
    fileName,
    caption: buildInstagramStoryCaption({ folder, cards, shareUrl }),
  }
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.arcTo(x + width, y, x + width, y + height, radius)
  context.arcTo(x + width, y + height, x, y + height, radius)
  context.arcTo(x, y + height, x, y, radius)
  context.arcTo(x, y, x + width, y, radius)
  context.closePath()
}

function drawMultilineText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3,
) {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word
    if (context.measureText(nextLine).width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = nextLine
    }
  })

  if (currentLine) {
    lines.push(currentLine)
  }

  lines.slice(0, maxLines).forEach((line, index) => {
    const isLastVisibleLine = index === maxLines - 1 && lines.length > maxLines
    const output = isLastVisibleLine ? `${line.slice(0, Math.max(0, line.length - 2)).trim()}…` : line
    context.fillText(output, x, y + index * lineHeight)
  })
}
