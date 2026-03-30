const APP_ORIGIN = process.env.CURATIO_APP_ORIGIN || 'https://curation-share-service-pcwin21-9855s-projects.vercel.app'
const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html'
const SESSION_KEY = 'curatio-extension-session'

interface ExtensionSession {
  idToken: string
  email?: string
  displayName?: string
  expiresAt: number
}

interface FolderListResponse {
  folders: Array<{ id: string; name: string }>
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-curatio',
    title: 'curatio에 저장',
    contexts: ['page', 'link'],
  })
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-to-curatio') return

  const session = await getSession()
  if (!session) {
    await chrome.tabs.create({ url: `${APP_ORIGIN}/workspace` })
    return
  }

  const url = info.linkUrl || tab?.url
  if (!url) return

  const result = await saveCardWithToken({
    idToken: session.idToken,
    url,
    note: '',
    folderId: '',
    title: tab?.title || '',
  })

  if (!result.ok) {
    console.error('[extension] context save failed:', result.error)
    return
  }

  await chrome.action.setBadgeBackgroundColor({ color: '#2f6f52' })
  await chrome.action.setBadgeText({ text: '저장' })
  setTimeout(() => {
    void chrome.action.setBadgeText({ text: '' })
  }, 1800)
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void (async () => {
    switch (message.type) {
      case 'session:get': {
        sendResponse({ session: await getSession() })
        return
      }
      case 'auth:sign-in': {
        const session = await runSignIn()
        sendResponse(session.ok ? { ok: true, session: session.session } : { ok: false, error: session.error })
        return
      }
      case 'auth:sign-out': {
        await chrome.storage.local.remove(SESSION_KEY)
        sendResponse({ ok: true })
        return
      }
      case 'folders:list': {
        try {
          const response = await fetch(`${APP_ORIGIN}/api/folders`, {
            headers: { Authorization: `Bearer ${message.idToken}` },
          })
          const data = (await response.json()) as FolderListResponse & { error?: string }
          if (!response.ok) {
            sendResponse({ ok: false, error: data.error || '폴더 목록을 불러오지 못했어요.' })
            return
          }
          sendResponse({ ok: true, folders: data.folders })
        } catch {
          sendResponse({ ok: false, error: '폴더 목록을 불러오지 못했어요.' })
        }
        return
      }
      case 'card:save': {
        const result = await saveCardWithToken(message)
        sendResponse(result)
        return
      }
      case 'offscreen:sign-in': {
        const session = await persistSession(message.payload)
        sendResponse({ ok: true, session })
        return
      }
      case 'offscreen:start-sign-in': {
        return
      }
      default:
        sendResponse({ ok: false, error: '알 수 없는 요청입니다.' })
    }
  })()

  return true
})

async function saveCardWithToken({
  idToken,
  url,
  note,
  folderId,
}: {
  idToken: string
  url: string
  note: string
  folderId: string
  title?: string
}) {
  try {
    const response = await fetch(`${APP_ORIGIN}/api/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        url,
        rawText: note || undefined,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      if (note) {
        await updateCardMemo(idToken, data.id, note)
      }
      if (folderId) {
        await attachCardToFolder(idToken, folderId, data.id)
      }
      return { ok: true, status: 'saved' as const, id: data.id }
    }

    if (response.status === 409 && data.duplicate?.id) {
      if (note) {
        await updateCardMemo(idToken, data.duplicate.id, note)
      }
      if (folderId && !(data.duplicate.folderIds || []).includes(folderId)) {
        await attachCardToFolder(idToken, folderId, data.duplicate.id)
        return { ok: true, status: 'saved-duplicate' as const, id: data.duplicate.id }
      }

      return { ok: true, status: 'saved-duplicate' as const, id: data.duplicate.id }
    }

    if (response.status === 401) {
      await chrome.storage.local.remove(SESSION_KEY)
      return { ok: false, error: '로그인이 만료됐어요. 다시 로그인해 주세요.' }
    }

    return { ok: false, error: data.error || '링크를 저장하지 못했어요.' }
  } catch {
    return { ok: false, error: '저장 중 네트워크 오류가 발생했어요.' }
  }
}

async function attachCardToFolder(idToken: string, folderId: string, cardId: string) {
  const response = await fetch(`${APP_ORIGIN}/api/folders`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ folderId, cardId }),
  })

  if (!response.ok) {
    throw new Error('folder_attach_failed')
  }
}

async function updateCardMemo(idToken: string, cardId: string, contextMemo: string) {
  const response = await fetch(`${APP_ORIGIN}/api/cards/${cardId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ contextMemo }),
  })

  if (!response.ok) {
    throw new Error('card_memo_update_failed')
  }
}

async function getSession(): Promise<ExtensionSession | null> {
  const stored = await chrome.storage.local.get(SESSION_KEY)
  const session = stored[SESSION_KEY] as ExtensionSession | undefined

  if (!session) return null
  if (session.expiresAt <= Date.now()) {
    await chrome.storage.local.remove(SESSION_KEY)
    return null
  }

  return session
}

async function persistSession(payload: {
  idToken: string
  email?: string
  displayName?: string
}) {
  const expiresAt = parseTokenExpiry(payload.idToken) ?? Date.now() + 55 * 60 * 1000
  const session: ExtensionSession = {
    idToken: payload.idToken,
    email: payload.email,
    displayName: payload.displayName,
    expiresAt,
  }

  await chrome.storage.local.set({ [SESSION_KEY]: session })
  return session
}

async function runSignIn() {
  await ensureOffscreenDocument()

  const result = (await chrome.runtime.sendMessage({
    type: 'offscreen:start-sign-in',
  })) as
    | { ok: true; session: ExtensionSession }
    | { ok: false; error?: string }

  if (!result.ok) {
    return { ok: false as const, error: result.error || '로그인에 실패했어요.' }
  }

  return { ok: true as const, session: result.session }
}

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)
  const matchedClients = await clients.matchAll()
  const hasDocument = matchedClients.some((client) => client.url === offscreenUrl)

  if (hasDocument) return

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
    justification: 'Google 로그인 팝업을 안전하게 열기 위해 필요합니다.',
  })
}

function parseTokenExpiry(idToken: string) {
  try {
    const payload = JSON.parse(atob(idToken.split('.')[1] || ''))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export {}
