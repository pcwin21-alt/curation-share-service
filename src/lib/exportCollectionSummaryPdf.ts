import { CollectionSummaryResult, ContentCard as CardType } from '@/types'

type SummaryMode = 'all' | 'selected'

interface ExportCollectionSummaryPdfParams {
  collectionName: string
  mode: SummaryMode
  result: CollectionSummaryResult
  cards: CardType[]
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDateLabel(timestamp: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function buildList(items: string[], emptyText: string, variant: 'bullet' | 'question' = 'bullet') {
  const sourceItems = items.length > 0 ? items : [emptyText]

  return sourceItems
    .map((item) => {
      const markerClass = variant === 'question' ? 'marker marker-question' : 'marker'
      return `<li class="list-row"><span class="${markerClass}"></span><span>${escapeHtml(item)}</span></li>`
    })
    .join('')
}

function buildTakeawayCards(result: CollectionSummaryResult) {
  const items =
    result.keyTakeaways.length > 0
      ? result.keyTakeaways
      : [{ point: '핵심 포인트를 정리할 만한 콘텐츠가 아직 충분하지 않습니다.', sources: [] }]

  return items
    .map(
      (item) => `
        <article class="mini-card">
          <h4>${escapeHtml(item.point)}</h4>
          ${
            item.sources.length > 0
              ? `<p>${escapeHtml(item.sources.join(' · '))}</p>`
              : '<p>출처를 추가로 묶어 보면 더 선명한 인사이트가 만들어집니다.</p>'
          }
        </article>
      `,
    )
    .join('')
}

function buildSpotlightCards(result: CollectionSummaryResult) {
  const items =
    result.sourceSpotlights.length > 0
      ? result.sourceSpotlights
      : [{ title: '추천 콘텐츠가 아직 없습니다.', reason: '카드를 더 모으면 여기서 함께 볼 만한 콘텐츠를 고를 수 있습니다.' }]

  return items
    .map(
      (item) => `
        <article class="source-card">
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.reason)}</p>
        </article>
      `,
    )
    .join('')
}

function buildReferenceCards(cards: CardType[]) {
  const sourceCards = cards.length > 0 ? cards.slice(0, 8) : []

  if (sourceCards.length === 0) {
    return `
      <article class="reference-card">
        <div class="reference-meta">
          <span class="platform-chip">기본 안내</span>
        </div>
        <h4>참고한 콘텐츠가 아직 없습니다.</h4>
        <p>컬렉션에 카드를 추가한 뒤 다시 PDF를 저장해 보세요.</p>
      </article>
    `
  }

  return sourceCards
    .map((card) => {
      const note = card.keyInsight || card.summary[0] || card.contextMemo || '원문에서 핵심 맥락을 다시 확인해 보세요.'
      const tags = card.tags.slice(0, 2).map((tag) => `#${tag}`).join(' · ')

      return `
        <article class="reference-card">
          <div class="reference-meta">
            <span class="platform-chip">${escapeHtml(card.platform.toUpperCase())}</span>
            ${tags ? `<span class="tag-line">${escapeHtml(tags)}</span>` : ''}
          </div>
          <h4>${escapeHtml(card.title)}</h4>
          <p>${escapeHtml(note)}</p>
        </article>
      `
    })
    .join('')
}

function shouldUseTwoPages(result: CollectionSummaryResult, cards: CardType[]) {
  const densityScore =
    result.keyTakeaways.length +
    result.sourceSpotlights.length +
    result.suggestedQuestions.length +
    Math.min(cards.length, 8)

  return densityScore >= 11 || result.sectionSummary.length > 240 || result.overview.length > 130
}

function buildHtml({ collectionName, mode, result, cards }: ExportCollectionSummaryPdfParams) {
  const printedAt = formatDateLabel(Date.now())
  const pageCount = shouldUseTwoPages(result, cards) ? 2 : 1
  const modeLabel = mode === 'selected' ? '선택한 콘텐츠만 정리' : '컬렉션 전체 정리'
  const fallbackLabel = result.usedFallback ? '기본 요약 기준' : 'AI 요약 기준'
  const title = `${collectionName} 요약 리포트`

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page {
        size: A4;
        margin: 11mm;
      }

      :root {
        color-scheme: light;
        --bg: #f5efe6;
        --paper: #fffdf8;
        --paper-strong: #f3efe4;
        --paper-warm: #f7f0de;
        --line: rgba(52, 70, 59, 0.14);
        --text: #171412;
        --muted: #5d5a57;
        --green: #2f6f52;
        --green-soft: #dfeee6;
        --gold: #c6922b;
        --gold-soft: #f6edd8;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: var(--bg);
        color: var(--text);
        font-family: "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif;
      }

      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .print-shell {
        padding: 10mm 0;
      }

      .page {
        width: 188mm;
        min-height: 275mm;
        margin: 0 auto 9mm;
        padding: 12mm;
        background: var(--paper);
        border-radius: 9mm;
        box-shadow: 0 16px 40px rgba(23, 20, 18, 0.12);
        display: grid;
        grid-template-rows: auto 1fr auto;
        gap: 7mm;
      }

      .hero {
        display: grid;
        grid-template-columns: 1.25fr 0.75fr;
        gap: 6mm;
        padding: 7mm;
        border-radius: 7mm;
        background: linear-gradient(135deg, var(--green-soft), #f3f1e8 72%);
        border: 1px solid rgba(47, 111, 82, 0.1);
      }

      .hero-copy {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 4mm;
      }

      .eyebrow {
        display: inline-flex;
        width: fit-content;
        padding: 2.2mm 4.4mm;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.72);
        color: var(--green);
        font-size: 10.5pt;
        font-weight: 700;
      }

      .hero h1 {
        margin: 0;
        font-size: 27pt;
        line-height: 1.02;
        letter-spacing: -0.04em;
      }

      .hero p {
        margin: 0;
        font-size: 11.4pt;
        line-height: 1.7;
        color: var(--muted);
      }

      .hero-meta {
        display: grid;
        gap: 3mm;
        align-content: start;
      }

      .stat-stack,
      .meta-card {
        border-radius: 5.2mm;
        background: rgba(255, 253, 248, 0.92);
        border: 1px solid var(--line);
        padding: 4.6mm;
      }

      .stat-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 3mm;
      }

      .stat {
        border-radius: 4.2mm;
        background: var(--paper);
        padding: 3.5mm;
      }

      .stat-label {
        display: block;
        margin-bottom: 1.3mm;
        font-size: 8.8pt;
        color: var(--muted);
      }

      .stat-value {
        display: block;
        font-size: 14pt;
        font-weight: 700;
        letter-spacing: -0.03em;
      }

      .meta-row {
        display: flex;
        justify-content: space-between;
        gap: 4mm;
        padding: 0 0 2.4mm;
        margin-bottom: 2.4mm;
        border-bottom: 1px solid var(--line);
        font-size: 9.4pt;
        color: var(--muted);
      }

      .meta-row:last-child {
        border-bottom: 0;
        margin-bottom: 0;
        padding-bottom: 0;
      }

      .meta-row strong {
        color: var(--text);
      }

      .page-body {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 6mm;
      }

      .column {
        display: grid;
        gap: 6mm;
      }

      .panel {
        height: 100%;
        border-radius: 6mm;
        border: 1px solid var(--line);
        padding: 5.2mm;
        background: var(--paper);
        display: flex;
        flex-direction: column;
      }

      .panel.overview {
        background: linear-gradient(180deg, #fffdfa, #faf5ea);
      }

      .panel.actions {
        background: linear-gradient(180deg, var(--gold-soft), #fffaf0);
      }

      .panel-label {
        margin-bottom: 2.6mm;
        font-size: 8.6pt;
        font-weight: 800;
        color: var(--green);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .panel-title {
        margin: 0 0 2.4mm;
        font-size: 12.8pt;
        font-weight: 700;
        line-height: 1.35;
      }

      .panel-text {
        margin: 0;
        font-size: 10.6pt;
        line-height: 1.78;
        color: var(--muted);
        white-space: pre-line;
      }

      .mini-grid,
      .source-grid,
      .reference-grid {
        display: grid;
        gap: 3mm;
      }

      .mini-card,
      .source-card,
      .reference-card {
        border-radius: 4.2mm;
        padding: 3.6mm;
        background: var(--paper-strong);
      }

      .mini-card h4,
      .source-card h4,
      .reference-card h4 {
        margin: 0 0 1.6mm;
        font-size: 10.6pt;
        line-height: 1.45;
      }

      .mini-card p,
      .source-card p,
      .reference-card p {
        margin: 0;
        font-size: 9.4pt;
        line-height: 1.6;
        color: var(--muted);
      }

      .list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 2.5mm;
      }

      .list-row {
        display: grid;
        grid-template-columns: 5mm 1fr;
        gap: 2mm;
        align-items: start;
        font-size: 10pt;
        line-height: 1.65;
        color: var(--text);
      }

      .marker {
        width: 2.4mm;
        height: 2.4mm;
        margin-top: 1.9mm;
        border-radius: 999px;
        background: var(--gold);
      }

      .marker-question {
        background: var(--green);
      }

      .question-list .list-row {
        font-size: 10.2pt;
      }

      .reference-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .reference-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 1.8mm;
        margin-bottom: 2mm;
      }

      .platform-chip,
      .tag-line {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 1mm 2.3mm;
        font-size: 8.3pt;
        font-weight: 700;
      }

      .platform-chip {
        background: var(--green-soft);
        color: var(--green);
      }

      .tag-line {
        background: #f1ecdf;
        color: #6c655c;
      }

      .footer {
        display: flex;
        justify-content: space-between;
        gap: 4mm;
        border-top: 1px solid var(--line);
        padding-top: 3mm;
        color: var(--muted);
        font-size: 8.6pt;
      }

      .page-two-grid {
        display: grid;
        grid-template-columns: 0.92fr 1.08fr;
        gap: 6mm;
      }

      .page-two-right {
        display: grid;
        grid-template-rows: auto 1fr;
        gap: 6mm;
      }

      .compact .hero h1 {
        font-size: 24pt;
      }

      .compact .panel-text {
        font-size: 10pt;
      }

      @media print {
        body {
          background: #ffffff;
        }

        .print-shell {
          padding: 0;
        }

        .page {
          width: auto;
          min-height: 0;
          margin: 0;
          padding: 0;
          border-radius: 0;
          box-shadow: none;
          page-break-after: always;
        }

        .page:last-child {
          page-break-after: auto;
        }
      }
    </style>
  </head>
  <body>
    <div class="print-shell">
      <section class="page ${pageCount === 2 ? 'compact' : ''}">
        <header class="hero">
          <div class="hero-copy">
            <span class="eyebrow">AI SUMMARY REPORT</span>
            <div>
              <h1>${escapeHtml(collectionName)}</h1>
              <p>컬렉션 안에 쌓인 콘텐츠를 한 번에 훑어보고, 바로 공유하거나 다음 정리로 이어갈 수 있게 만든 PDF 요약본입니다.</p>
            </div>
          </div>

          <div class="hero-meta">
            <div class="stat-stack">
              <div class="stat-grid">
                <div class="stat">
                  <span class="stat-label">정리 방식</span>
                  <span class="stat-value">${escapeHtml(modeLabel)}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">참고 콘텐츠</span>
                  <span class="stat-value">${result.sourceCount}개</span>
                </div>
                <div class="stat">
                  <span class="stat-label">핵심 포인트</span>
                  <span class="stat-value">${Math.max(result.keyTakeaways.length, 1)}개</span>
                </div>
                <div class="stat">
                  <span class="stat-label">다음 액션</span>
                  <span class="stat-value">${Math.max(result.nextActions.length, 1)}개</span>
                </div>
              </div>
            </div>

            <div class="meta-card">
              <div class="meta-row"><span>생성 시각</span><strong>${escapeHtml(printedAt)}</strong></div>
              <div class="meta-row"><span>요약 기준</span><strong>${escapeHtml(fallbackLabel)}</strong></div>
              <div class="meta-row"><span>페이지 구성</span><strong>${pageCount}페이지 리포트</strong></div>
            </div>
          </div>
        </header>

        <div class="page-body">
          <div class="column">
            <section class="panel overview">
              <span class="panel-label">Overview</span>
              <h2 class="panel-title">한눈에 보기</h2>
              <p class="panel-text">${escapeHtml(result.overview)}</p>
            </section>

            <section class="panel">
              <span class="panel-label">Takeaways</span>
              <h2 class="panel-title">핵심 포인트</h2>
              <div class="mini-grid">${buildTakeawayCards(result)}</div>
            </section>

            <section class="panel">
              <span class="panel-label">Flow</span>
              <h2 class="panel-title">전체 흐름</h2>
              <p class="panel-text">${escapeHtml(result.sectionSummary)}</p>
            </section>
          </div>

          <div class="column">
            <section class="panel actions">
              <span class="panel-label">Action</span>
              <h2 class="panel-title">다음에 해볼 일</h2>
              <ul class="list">${buildList(result.nextActions, '컬렉션 소개 문장을 먼저 정리해 보세요.')}</ul>
            </section>

            <section class="panel">
              <span class="panel-label">Spotlight</span>
              <h2 class="panel-title">${pageCount === 1 ? '눈여겨볼 콘텐츠' : '이번 묶음의 포인트'}</h2>
              ${
                pageCount === 1
                  ? `<div class="source-grid">${buildSpotlightCards(result)}</div>`
                  : `<ul class="list">${buildList(
                      result.sourceSpotlights.map((item) => `${item.title} - ${item.reason}`),
                      '참고할 대표 콘텐츠를 곧 추천할 수 있습니다.',
                    )}</ul>`
              }
            </section>

            ${
              pageCount === 1
                ? `
                  <section class="panel">
                    <span class="panel-label">Question</span>
                    <h2 class="panel-title">생각해볼 질문</h2>
                    <ul class="list question-list">${buildList(
                      result.suggestedQuestions,
                      '이 묶음을 어떤 순서로 보여주면 가장 이해하기 쉬울까요?',
                      'question',
                    )}</ul>
                  </section>
                `
                : ''
            }
          </div>
        </div>

        <footer class="footer">
          <span>curatio AI 요약 PDF</span>
          <span>1 / ${pageCount}</span>
        </footer>
      </section>

      ${
        pageCount === 2
          ? `
            <section class="page compact">
              <header class="hero">
                <div class="hero-copy">
                  <span class="eyebrow">REFERENCE BOARD</span>
                  <div>
                    <h1>${escapeHtml(collectionName)}</h1>
                    <p>대표 콘텐츠, 질문거리, 참고 목록을 한 장에 모아 두 번째 페이지에서 바로 훑어볼 수 있게 구성했습니다.</p>
                  </div>
                </div>

                <div class="hero-meta">
                  <div class="meta-card">
                    <div class="meta-row"><span>페이지 목적</span><strong>근거와 보조 정리</strong></div>
                    <div class="meta-row"><span>대표 콘텐츠</span><strong>${Math.max(result.sourceSpotlights.length, 1)}개</strong></div>
                    <div class="meta-row"><span>질문거리</span><strong>${Math.max(result.suggestedQuestions.length, 1)}개</strong></div>
                  </div>
                </div>
              </header>

              <div class="page-two-grid">
                <section class="panel">
                  <span class="panel-label">Highlights</span>
                  <h2 class="panel-title">눈여겨볼 콘텐츠</h2>
                  <div class="source-grid">${buildSpotlightCards(result)}</div>
                </section>

                <div class="page-two-right">
                  <section class="panel">
                    <span class="panel-label">Question</span>
                    <h2 class="panel-title">생각해볼 질문</h2>
                    <ul class="list question-list">${buildList(
                      result.suggestedQuestions,
                      '이 컬렉션을 처음 보는 사람에게 어떤 순서로 보여주는 편이 좋을까요?',
                      'question',
                    )}</ul>
                  </section>

                  <section class="panel">
                    <span class="panel-label">Reference</span>
                    <h2 class="panel-title">참고한 콘텐츠</h2>
                    <div class="reference-grid">${buildReferenceCards(cards)}</div>
                  </section>
                </div>
              </div>

              <footer class="footer">
                <span>curatio AI 요약 PDF</span>
                <span>2 / 2</span>
              </footer>
            </section>
          `
          : ''
      }
    </div>

    <script>
      window.addEventListener('load', function () {
        window.setTimeout(function () {
          window.focus()
          window.print()
        }, 300)

        window.addEventListener('afterprint', function () {
          window.setTimeout(function () {
            window.close()
          }, 120)
        })
      })
    </script>
  </body>
</html>`
}

export function exportCollectionSummaryPdf(params: ExportCollectionSummaryPdfParams) {
  const popup = window.open('', '_blank', 'width=1240,height=960')

  if (!popup) {
    throw new Error('PDF 창을 열지 못했습니다.')
  }

  popup.document.open()
  popup.document.write(buildHtml(params))
  popup.document.close()
}
