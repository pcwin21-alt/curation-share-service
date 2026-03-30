interface ExtensionSession {
  idToken: string
  email?: string
  displayName?: string
  expiresAt: number
}

interface OwnedFolder {
  id: string
  name: string
}

const titleInput = document.querySelector<HTMLInputElement>('#titleInput')!
const urlInput = document.querySelector<HTMLInputElement>('#urlInput')!
const folderSelect = document.querySelector<HTMLSelectElement>('#folderSelect')!
const noteInput = document.querySelector<HTMLTextAreaElement>('#noteInput')!
const message = document.querySelector<HTMLParagraphElement>('#message')!
const sessionStatus = document.querySelector<HTMLParagraphElement>('#sessionStatus')!
const signInButton = document.querySelector<HTMLButtonElement>('#signInButton')!
const signOutButton = document.querySelector<HTMLButtonElement>('#signOutButton')!
const saveButton = document.querySelector<HTMLButtonElement>('#saveButton')!
const refreshButton = document.querySelector<HTMLButtonElement>('#refreshButton')!

let session: ExtensionSession | null = null

function setMessage(text: string, type: 'info' | 'error' = 'info') {
  message.textContent = text
  message.classList.toggle('error', type === 'error')
}

async function sendMessage<T>(payload: unknown) {
  return (await chrome.runtime.sendMessage(payload)) as T
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

function setSessionUi(nextSession: ExtensionSession | null) {
  session = nextSession
  signOutButton.hidden = !session
  signInButton.textContent = session ? '다시 로그인' : 'Google 로그인'
  sessionStatus.textContent = session
    ? `${session.displayName || session.email || '로그인 완료'} 계정으로 저장할 수 있어요.`
    : '로그인하면 지금 보는 링크를 바로 저장할 수 있어요.'
}

async function loadFolders() {
  folderSelect.innerHTML = '<option value="">전체 컬렉션</option>'

  if (!session) return

  try {
    const result = await sendMessage<{ ok: boolean; folders?: OwnedFolder[]; error?: string }>({
      type: 'folders:list',
      idToken: session.idToken,
    })

    if (!result.ok) {
      setMessage(result.error || '폴더 목록을 불러오지 못했어요.', 'error')
      return
    }

    ;(result.folders || []).forEach((folder) => {
      const option = document.createElement('option')
      option.value = folder.id
      option.textContent = folder.name
      folderSelect.append(option)
    })
  } catch {
    setMessage('폴더 목록을 불러오지 못했어요.', 'error')
  }
}

async function hydrateFromActiveTab() {
  const tab = await getCurrentTab()
  titleInput.value = tab?.title || ''
  urlInput.value = tab?.url || ''
}

async function refreshState() {
  const result = await sendMessage<{ session: ExtensionSession | null }>({ type: 'session:get' })
  setSessionUi(result.session)
  await hydrateFromActiveTab()
  await loadFolders()
}

async function handleSignIn() {
  setMessage('로그인 창을 여는 중입니다...')

  const result = await sendMessage<{ ok: boolean; session?: ExtensionSession; error?: string }>({
    type: 'auth:sign-in',
  })

  if (!result.ok || !result.session) {
    setMessage(result.error || '로그인에 실패했어요.', 'error')
    return
  }

  setSessionUi(result.session)
  await loadFolders()
  setMessage('로그인했어요. 바로 저장할 수 있습니다.')
}

async function handleSignOut() {
  await sendMessage({ type: 'auth:sign-out' })
  setSessionUi(null)
  await loadFolders()
  setMessage('확장에서 로그아웃했어요.')
}

async function handleSave() {
  const url = urlInput.value.trim()
  const note = noteInput.value.trim()
  const folderId = folderSelect.value.trim()

  if (!session) {
    setMessage('먼저 로그인해 주세요.', 'error')
    return
  }

  if (!url) {
    setMessage('저장할 링크가 비어 있어요.', 'error')
    return
  }

  saveButton.disabled = true
  setMessage('curatio에 저장하는 중입니다...')

  const result = await sendMessage<{
    ok: boolean
    status?: 'saved' | 'saved-duplicate'
    error?: string
    title?: string
  }>({
    type: 'card:save',
    idToken: session.idToken,
    url,
    note,
    folderId,
    title: titleInput.value.trim(),
  })

  saveButton.disabled = false

  if (!result.ok) {
    setMessage(result.error || '저장에 실패했어요.', 'error')
    return
  }

  noteInput.value = ''
  setMessage(
    result.status === 'saved-duplicate'
      ? '이미 있던 링크를 현재 폴더와 연결했어요.'
      : '링크를 curatio에 저장했어요.',
  )
}

signInButton.addEventListener('click', handleSignIn)
signOutButton.addEventListener('click', handleSignOut)
saveButton.addEventListener('click', handleSave)
refreshButton.addEventListener('click', () => {
  void refreshState()
})

void refreshState()

export {}
