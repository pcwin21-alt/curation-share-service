export interface VerificationEmailOptions {
  collectionName: string
  confirmUrl: string
}

export interface WeeklyDigestEmailOptions {
  collectionName: string
  shareUrl: string
  addedCardTitles: string[]
  unsubscribeUrl: string
}

export function buildVerificationEmail({
  collectionName,
  confirmUrl,
}: VerificationEmailOptions) {
  return {
    subject: `[curatio] ${collectionName} 업데이트 구독을 확인해 주세요`,
    text: `${collectionName} 컬렉션 구독을 완료하려면 아래 링크를 눌러 주세요.\n${confirmUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f1a17;">
        <h2 style="margin-bottom: 12px;">${collectionName} 업데이트를 받아보시겠어요?</h2>
        <p>아래 버튼을 눌러 구독을 확인하면, 컬렉션에 새 콘텐츠가 추가될 때 주간 요약 메일을 받게 됩니다.</p>
        <p style="margin: 24px 0;">
          <a href="${confirmUrl}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#1f1a17;color:#fff;text-decoration:none;font-weight:600;">
            구독 확인하기
          </a>
        </p>
        <p style="word-break: break-all; color: #4d5c52;">${confirmUrl}</p>
      </div>
    `,
  }
}

export function buildWeeklyDigestEmail({
  collectionName,
  shareUrl,
  addedCardTitles,
  unsubscribeUrl,
}: WeeklyDigestEmailOptions) {
  const listHtml = addedCardTitles.map((title) => `<li style="margin-bottom:8px;">${title}</li>`).join('')
  const listText = addedCardTitles.map((title) => `- ${title}`).join('\n')

  return {
    subject: `[curatio] ${collectionName}에 이번 주 새 콘텐츠가 추가됐어요`,
    text: `${collectionName} 컬렉션에 새 콘텐츠가 추가됐습니다.\n\n${listText}\n\n컬렉션 보기: ${shareUrl}\n구독 해지: ${unsubscribeUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f1a17;">
        <h2 style="margin-bottom: 12px;">${collectionName}에 새 콘텐츠가 들어왔어요</h2>
        <p>이번 주에 추가된 콘텐츠를 한 번에 확인해 보세요.</p>
        <ul style="padding-left: 20px;">${listHtml}</ul>
        <p style="margin: 24px 0;">
          <a href="${shareUrl}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#1f1a17;color:#fff;text-decoration:none;font-weight:600;">
            컬렉션 보러 가기
          </a>
        </p>
        <p><a href="${unsubscribeUrl}" style="color:#1e6b45;">구독 해지하기</a></p>
      </div>
    `,
  }
}

export async function sendEmailNow({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from) {
    return { sent: false, reason: 'missing-config' as const }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`resend_failed:${body}`)
  }

  return { sent: true as const }
}
