const APP_ORIGIN = process.env.CURATIO_APP_ORIGIN || 'https://curation-share-service-pcwin21-9855s-projects.vercel.app'

const iframe = document.createElement('iframe')
iframe.src = `${APP_ORIGIN}/extension-auth`
iframe.style.display = 'none'
document.body.appendChild(iframe)

let pending:
  | {
      sendResponse: (response: { ok: boolean; session?: unknown; error?: string }) => void
      timeoutId: number
    }
  | null = null

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'offscreen:start-sign-in') {
    return false
  }

  if (pending) {
    sendResponse({ ok: false, error: '이미 로그인 창을 열고 있어요.' })
    return true
  }

  const timeoutId = window.setTimeout(() => {
    pending?.sendResponse({ ok: false, error: '로그인 응답이 지연되고 있어요. 다시 시도해 주세요.' })
    pending = null
  }, 60_000)

  pending = { sendResponse, timeoutId }
  iframe.contentWindow?.postMessage({ type: 'initAuth' }, APP_ORIGIN)
  return true
})

window.addEventListener('message', async (event) => {
  if (event.origin !== APP_ORIGIN) return
  if (!pending) return

  const data = event.data
  if (!data || data.type !== 'extension-auth-result') return

  window.clearTimeout(pending.timeoutId)

  if (!data.ok || !data.idToken) {
    pending.sendResponse({ ok: false, error: data.error || '로그인에 실패했어요.' })
    pending = null
    return
  }

  const result = (await chrome.runtime.sendMessage({
    type: 'offscreen:sign-in',
    payload: {
      idToken: data.idToken,
      email: data.email,
      displayName: data.displayName,
    },
  })) as { ok: boolean; session?: unknown; error?: string }

  pending.sendResponse(result.ok ? { ok: true, session: result.session } : { ok: false, error: result.error })
  pending = null
})

export {}
