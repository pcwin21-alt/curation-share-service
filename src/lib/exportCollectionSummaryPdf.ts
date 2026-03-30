import {
  CollectionSummaryResponse,
  CollectionSummaryResult,
  ContentCard as CardType,
  PersonaSummaryResult,
  SummaryMode,
} from '@/types'

interface ExportCollectionSummaryPdfParams {
  collectionName: string
  mode: SummaryMode
  result: CollectionSummaryResponse
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

function buildList(items: string[], emptyText: string, markerClass = 'marker') {
  const sourceItems = items.length > 0 ? items : [emptyText]

  return sourceItems
    .map(
      (item) =>
        `<li class="list-row"><span class="${markerClass}"></span><span>${escapeHtml(item)}</span></li>`,
    )
    .join('')
}

function buildSourceSpotlights(cards: Array<{ title: string; reason: string }>) {
  const sourceCards =
    cards.length > 0
      ? cards
      : [{ title: '대표 콘텐츠가 아직 없습니다.', reason: '카드가 더 쌓이면 여기에서 먼저 보여줄 포인트가 정리됩니다.' }]

  return sourceCards
    .map(
      (card) => `
        <article class="mini-card">
          <h4>${escapeHtml(card.title)}</h4>
          <p>${escapeHtml(card.reason)}</p>
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
          <span class="platform-chip">참고 카드</span>
        </div>
        <h4>카드가 아직 충분하지 않습니다.</h4>
        <p>컬렉션에 카드를 더 추가한 뒤 다시 PDF로 저장해 보세요.</p>
      </article>
    `
  }

  return sourceCards
    .map((card) => {
      const note = card.keyInsight || card.summary[0] || card.contextMemo || '이 카드의 요점이 여기에 표시됩니다.'
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

function buildCollectionPrimary(result: CollectionSummaryResult) {
  return `
    <section class="panel">
      <span class="panel-label">Overview</span>
      <h2 class="panel-title">한눈에 보기</h2>
      <p class="panel-text">${escapeHtml(result.overview)}</p>
    </section>
    <section class="panel">
      <span class="panel-label">Takeaways</span>
      <h2 class="panel-title">핵심 포인트</h2>
      <div class="mini-grid">
        ${buildSourceSpotlights(
          result.keyTakeaways.map((item) => ({
            title: item.point,
            reason: item.sources.length > 0 ? item.sources.join(' · ') : '출처 정보를 더 모아볼 수 있습니다.',
          })),
        )}
      </div>
    </section>
    <section class="panel">
      <span class="panel-label">Flow</span>
      <h2 class="panel-title">전체 흐름</h2>
      <p class="panel-text">${escapeHtml(result.sectionSummary)}</p>
    </section>
  `
}

function buildCollectionSecondary(result: CollectionSummaryResult) {
  return `
    <section class="panel warm">
      <span class="panel-label">Action</span>
      <h2 class="panel-title">다음에 해볼 일</h2>
      <ul class="list">${buildList(result.nextActions, '대표 카드부터 다시 정리해 보세요.')}</ul>
    </section>
    <section class="panel">
      <span class="panel-label">Spotlight</span>
      <h2 class="panel-title">눈여겨볼 콘텐츠</h2>
      <div class="mini-grid">${buildSourceSpotlights(result.sourceSpotlights)}</div>
    </section>
    <section class="panel">
      <span class="panel-label">Question</span>
      <h2 class="panel-title">생각해볼 질문</h2>
      <ul class="list">${buildList(result.suggestedQuestions, '이 컬렉션을 누구에게 어떤 순서로 보여줄지부터 정리해 보세요.', 'marker marker-green')}</ul>
    </section>
  `
}

function buildPersonaPrimary(result: PersonaSummaryResult) {
  return `
    <section class="panel">
      <span class="panel-label">Lens</span>
      <h2 class="panel-title">${escapeHtml(result.personaLabel)}</h2>
      <p class="panel-text">${escapeHtml(result.lensSummary)}</p>
    </section>
    <section class="panel">
      <span class="panel-label">Strengths</span>
      <h2 class="panel-title">높이 볼 점</h2>
      <ul class="list">${buildList(result.strengths, '이 렌즈에서 높이 볼 만한 지점을 더 만들 카드가 필요합니다.')}</ul>
    </section>
    <section class="panel">
      <span class="panel-label">Caution</span>
      <h2 class="panel-title">경계할 점</h2>
      <ul class="list">${buildList(result.cautions, '이 렌즈에서 경계할 점을 더 구체화해 보세요.', 'marker marker-gold')}</ul>
    </section>
  `
}

function buildPersonaSecondary(result: PersonaSummaryResult) {
  return `
    <section class="panel warm">
      <span class="panel-label">Reframe</span>
      <h2 class="panel-title">이 관점에서 다시 묶는 기준</h2>
      <ul class="list">${buildList(result.reframingCriteria, '대표 카드를 먼저 고르고 그 이유를 메모로 붙여 보세요.')}</ul>
    </section>
    <section class="panel">
      <span class="panel-label">Spotlight</span>
      <h2 class="panel-title">이 렌즈에서 중요한 카드</h2>
      <div class="mini-grid">${buildSourceSpotlights(result.sourceSpotlights)}</div>
    </section>
    <section class="panel">
      <span class="panel-label">Question</span>
      <h2 class="panel-title">다음 질문</h2>
      <ul class="list">${buildList(result.suggestedQuestions, '이 렌즈가 강조하는 기준을 소개 문장에 먼저 녹여 보세요.', 'marker marker-green')}</ul>
    </section>
  `
}

function shouldUseTwoPages(result: CollectionSummaryResponse, cards: CardType[]) {
  const cardDensity = Math.min(cards.length, 8)
  const listDensity =
    result.summaryType === 'persona'
      ? result.strengths.length + result.cautions.length + result.suggestedQuestions.length
      : result.keyTakeaways.length + result.sourceSpotlights.length + result.suggestedQuestions.length

  return cardDensity + listDensity >= 12
}

function buildHtml({ collectionName, mode, result, cards }: ExportCollectionSummaryPdfParams) {
  const printedAt = formatDateLabel(Date.now())
  const pageCount = shouldUseTwoPages(result, cards) ? 2 : 1
  const modeLabel = mode === 'selected' ? '선택 콘텐츠 정리' : '컬렉션 전체 정리'
  const fallbackLabel = result.usedFallback ? '기본 요약 기준' : 'AI 요약 기준'
  const introLabel = result.summaryType === 'persona' ? 'PERSONA LENS REPORT' : 'AI SUMMARY REPORT'
  const title = `${collectionName} 요약 리포트`
  const metaTitle = result.summaryType === 'persona' ? result.personaLabel : '컬렉션 전체 요약'
  const metaDescription =
    result.summaryType === 'persona'
      ? result.personaDescription
      : '컬렉션 안에 쌓인 콘텐츠를 한 번에 훑어보고 핵심 흐름을 빠르게 정리한 리포트입니다.'

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4; margin: 11mm; }
      :root {
        color-scheme: light;
        --bg: #f5efe6;
        --paper: #fffdf8;
        --paper-soft: #f6f2e9;
        --line: rgba(52, 70, 59, 0.14);
        --text: #171412;
        --muted: #5d5a57;
        --green: #2f6f52;
        --green-soft: #dfeee6;
        --gold: #c6922b;
        --gold-soft: #f6edd8;
      }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        background: var(--bg);
        color: var(--text);
        font-family: "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .print-shell { padding: 10mm 0; }
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
        grid-template-columns: 1.2fr 0.8fr;
        gap: 6mm;
        padding: 7mm;
        border-radius: 7mm;
        background: linear-gradient(135deg, var(--green-soft), #f3f1e8 72%);
        border: 1px solid rgba(47, 111, 82, 0.1);
      }
      .eyebrow {
        display: inline-flex;
        width: fit-content;
        padding: 2.2mm 4.4mm;
        border-radius: 999px;
        background: rgba(255,255,255,0.72);
        color: var(--green);
        font-size: 10.5pt;
        font-weight: 700;
      }
      .hero h1 {
        margin: 3mm 0 2mm;
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
      .meta-card {
        border-radius: 5.2mm;
        background: rgba(255,253,248,0.92);
        border: 1px solid var(--line);
        padding: 4.6mm;
        display: grid;
        gap: 2.6mm;
        align-content: start;
      }
      .meta-row {
        display: flex;
        justify-content: space-between;
        gap: 4mm;
        padding-bottom: 2.4mm;
        border-bottom: 1px solid var(--line);
        font-size: 9.4pt;
        color: var(--muted);
      }
      .meta-row:last-child { border-bottom: 0; padding-bottom: 0; }
      .meta-row strong { color: var(--text); }
      .page-body {
        display: grid;
        grid-template-columns: 1.04fr 0.96fr;
        gap: 6mm;
      }
      .column { display: grid; gap: 6mm; }
      .panel {
        border-radius: 6mm;
        border: 1px solid var(--line);
        padding: 5.2mm;
        background: var(--paper);
        display: flex;
        flex-direction: column;
        gap: 2.2mm;
      }
      .panel.warm { background: linear-gradient(180deg, var(--gold-soft), #fffaf0); }
      .panel-label {
        font-size: 8.6pt;
        font-weight: 800;
        color: var(--green);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .panel-title {
        margin: 0;
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
      .mini-grid, .reference-grid {
        display: grid;
        gap: 3mm;
      }
      .mini-card, .reference-card {
        border-radius: 4.2mm;
        padding: 3.6mm;
        background: var(--paper-soft);
      }
      .mini-card h4, .reference-card h4 {
        margin: 0 0 1.6mm;
        font-size: 10.6pt;
        line-height: 1.45;
      }
      .mini-card p, .reference-card p {
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
      }
      .marker {
        width: 2.4mm;
        height: 2.4mm;
        margin-top: 1.9mm;
        border-radius: 999px;
        background: var(--gold);
      }
      .marker-green { background: var(--green); }
      .reference-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .reference-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 1.8mm;
        margin-bottom: 2mm;
      }
      .platform-chip, .tag-line {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 1mm 2.3mm;
        font-size: 8.3pt;
        font-weight: 700;
      }
      .platform-chip { background: var(--green-soft); color: var(--green); }
      .tag-line { background: #f1ecdf; color: #6c655c; }
      .footer {
        display: flex;
        justify-content: space-between;
        gap: 4mm;
        border-top: 1px solid var(--line);
        padding-top: 3mm;
        color: var(--muted);
        font-size: 8.6pt;
      }
      @media print {
        body { background: #ffffff; }
        .print-shell { padding: 0; }
        .page {
          width: auto;
          min-height: 0;
          margin: 0;
          padding: 0;
          border-radius: 0;
          box-shadow: none;
          page-break-after: always;
        }
        .page:last-child { page-break-after: auto; }
      }
    </style>
  </head>
  <body>
    <div class="print-shell">
      <section class="page">
        <header class="hero">
          <div>
            <span class="eyebrow">${escapeHtml(introLabel)}</span>
            <h1>${escapeHtml(collectionName)}</h1>
            <p>${escapeHtml(metaDescription)}</p>
          </div>
          <div class="meta-card">
            <div class="meta-row"><span>정리 방식</span><strong>${escapeHtml(modeLabel)}</strong></div>
            <div class="meta-row"><span>리포트 타입</span><strong>${escapeHtml(metaTitle)}</strong></div>
            <div class="meta-row"><span>참고 콘텐츠</span><strong>${result.sourceCount}개</strong></div>
            <div class="meta-row"><span>요약 기준</span><strong>${escapeHtml(fallbackLabel)}</strong></div>
            <div class="meta-row"><span>생성 시각</span><strong>${escapeHtml(printedAt)}</strong></div>
          </div>
        </header>

        <div class="page-body">
          <div class="column">
            ${result.summaryType === 'persona' ? buildPersonaPrimary(result) : buildCollectionPrimary(result)}
          </div>
          <div class="column">
            ${result.summaryType === 'persona' ? buildPersonaSecondary(result) : buildCollectionSecondary(result)}
          </div>
        </div>

        <footer class="footer">
          <span>curatio PDF export</span>
          <span>1 / ${pageCount}</span>
        </footer>
      </section>

      ${
        pageCount === 2
          ? `
            <section class="page">
              <header class="hero">
                <div>
                  <span class="eyebrow">REFERENCE BOARD</span>
                  <h1>${escapeHtml(collectionName)}</h1>
                  <p>대표 카드와 참고 메모를 한 번에 훑어보는 보조 페이지입니다.</p>
                </div>
                <div class="meta-card">
                  <div class="meta-row"><span>페이지 목적</span><strong>참고 카드 정리</strong></div>
                  <div class="meta-row"><span>대표 카드</span><strong>${Math.min(cards.length, 8)}개</strong></div>
                  <div class="meta-row"><span>요약 타입</span><strong>${escapeHtml(metaTitle)}</strong></div>
                </div>
              </header>

              <div class="panel">
                <span class="panel-label">Reference</span>
                <h2 class="panel-title">참고 카드</h2>
                <div class="reference-grid">${buildReferenceCards(cards)}</div>
              </div>

              <footer class="footer">
                <span>curatio PDF export</span>
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
          window.focus();
          window.print();
        }, 300);
        window.addEventListener('afterprint', function () {
          window.setTimeout(function () {
            window.close();
          }, 120);
        });
      });
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
