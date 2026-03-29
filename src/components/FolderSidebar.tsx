'use client'

import { useState } from 'react'
import Icon from '@/components/Icon'
import { apiFetch } from '@/lib/apiClient'
import { CurationFolder } from '@/types'

interface FolderSidebarProps {
  folders: CurationFolder[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onCreated: (folder: CurationFolder) => void
  isManaging?: boolean
  onDropToFolder?: (folderId: string, cardIds: string[]) => void
  unassignedCount?: number
}

const FOLDER_COLORS = [
  { label: '기본', value: '' },
  { label: '빨강', value: '#EF4444' },
  { label: '주황', value: '#F97316' },
  { label: '노랑', value: '#EAB308' },
  { label: '초록', value: '#22C55E' },
  { label: '민트', value: '#14B8A6' },
  { label: '파랑', value: '#3B82F6' },
  { label: '보라', value: '#8B5CF6' },
  { label: '분홍', value: '#EC4899' },
]

const DEFAULT_COLOR = '#1e6b45'

export default function FolderSidebar({
  folders,
  selectedId,
  onSelect,
  onCreated,
  isManaging = false,
  onDropToFolder,
  unassignedCount = 0,
}: FolderSidebarProps) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [colorPickerId, setColorPickerId] = useState<string | null>(null)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [renaming, setRenaming] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return

    setLoading(true)

    try {
      const response = await apiFetch('/api/folders', {
        method: 'POST',
        requireAuth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
        }),
      })

      const folder = await response.json()
      onCreated(folder)
      setName('')
      setCreating(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleColorSelect(folderId: string, color: string) {
    setColorPickerId(null)

    await apiFetch('/api/folders', {
      method: 'PUT',
      requireAuth: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId, color }),
    })
  }

  function startEditing(folder: CurationFolder) {
    setColorPickerId(null)
    setEditingFolderId(folder.id)
    setEditingName(folder.name)
  }

  function stopEditing() {
    setEditingFolderId(null)
    setEditingName('')
  }

  async function handleRename(folderId: string) {
    if (!editingName.trim()) return

    setRenaming(true)

    try {
      await apiFetch('/api/folders', {
        method: 'PUT',
        requireAuth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, name: editingName.trim() }),
      })
      stopEditing()
    } finally {
      setRenaming(false)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e: React.DragEvent, folderId: string) {
    e.preventDefault()
    setDragOverId(null)

    const raw = e.dataTransfer.getData('cardIds')
    if (!raw) return

    const cardIds: string[] = JSON.parse(raw)
    onDropToFolder?.(folderId, cardIds)
  }

  return (
    <aside className="w-full">
      <h2 className="type-section mb-3 text-primary">컬렉션</h2>
      <p className="type-subtitle mb-7 max-w-[18rem] text-on-surface-variant">
        모아둔 콘텐츠를 주제별로 나눠 정리해보세요.
      </p>

      <nav className="space-y-2">
        {!isManaging && (
          <button
            onClick={() => onSelect(null)}
            className={`w-full rounded-2xl px-4 py-4 text-left transition-colors ${
              selectedId === null
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-secondary-container/45 text-primary hover:bg-secondary-container/65'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-headline text-[1.05rem] leading-none">전체</span>
              {unassignedCount > 0 && (
                <span className="type-micro rounded-full bg-white/70 px-2.5 py-1 font-semibold text-[#7A5A11]">
                  미분류 {unassignedCount}
                </span>
              )}
            </div>
          </button>
        )}

        {folders.map((folder) => {
          const accentColor = folder.color || DEFAULT_COLOR
          const isSelected = selectedId === folder.id
          const isEditing = editingFolderId === folder.id
          const isColorOpen = colorPickerId === folder.id
          const isActionVisible = isEditing || isColorOpen

          if (isManaging) {
            return (
              <div
                key={folder.id}
                onDragOver={handleDragOver}
                onDragEnter={() => setDragOverId(folder.id)}
                onDragLeave={() => setDragOverId(null)}
                onDrop={(e) => handleDrop(e, folder.id)}
                className={`rounded-2xl border-2 border-dashed px-4 py-4 transition-all ${
                  dragOverId === folder.id
                    ? 'scale-[1.02] bg-surface-container/40'
                    : 'border-outline-variant/30 text-on-surface-variant'
                }`}
                style={dragOverId === folder.id ? { borderColor: accentColor } : {}}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                    <span className="min-w-0 break-words whitespace-normal font-headline text-[1.02rem] leading-[1.3]">
                      {folder.name}
                    </span>
                  </div>
                  <span className="type-micro shrink-0 font-semibold">
                    {dragOverId === folder.id ? '놓기' : '드롭'}
                  </span>
                </div>
              </div>
            )
          }

          return (
            <div key={folder.id} className="group relative">
              <div
                className={`rounded-2xl border px-3 py-3 transition-colors ${
                  isSelected
                    ? 'border-outline bg-surface-container-lowest'
                    : 'border-transparent hover:bg-surface-container/50'
                }`}
              >
                <button
                  onClick={() => onSelect(folder.id)}
                  className="flex w-full items-start gap-3 text-left"
                  disabled={isEditing}
                >
                  <span
                    className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span
                    className={`min-w-0 flex-1 break-words whitespace-normal font-headline text-[1.02rem] leading-[1.3] ${
                      isSelected ? 'text-primary' : 'text-on-surface'
                    }`}
                  >
                    {folder.name}
                  </span>
                </button>

                <div
                  className={`overflow-hidden pl-6 transition-all ${
                    isActionVisible
                      ? 'mt-3 max-h-32 opacity-100'
                      : 'pointer-events-none max-h-0 opacity-0 group-hover:pointer-events-auto group-hover:mt-3 group-hover:max-h-32 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:mt-3 group-focus-within:max-h-32 group-focus-within:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditing(folder)}
                      className="type-micro rounded-full border border-outline-variant/50 bg-surface px-3 py-1.5 font-semibold text-on-surface-variant transition-colors hover:border-outline hover:text-primary"
                      title={`${folder.name} 이름 수정`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Icon name="pencil" className="h-3.5 w-3.5" />
                        이름 수정
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingFolderId(null)
                        setEditingName('')
                        setColorPickerId(isColorOpen ? null : folder.id)
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/50 bg-surface transition-colors hover:border-outline"
                      title={`${folder.name} 색상 변경`}
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-black/10"
                        style={{ backgroundColor: accentColor }}
                      />
                    </button>
                  </div>

                  {isEditing && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(folder.id)
                          if (e.key === 'Escape') stopEditing()
                        }}
                        maxLength={50}
                        className="type-body min-w-0 flex-1 rounded-xl border border-outline-variant/40 bg-surface px-3 py-2.5 text-on-surface focus:border-secondary focus:outline-none"
                      />
                      <button
                        onClick={() => handleRename(folder.id)}
                        disabled={renaming || !editingName.trim()}
                        className="type-micro rounded-full bg-secondary px-3 py-2 font-semibold text-on-secondary disabled:opacity-40"
                      >
                        {renaming ? '저장 중' : '저장'}
                      </button>
                      <button
                        onClick={stopEditing}
                        className="type-micro font-semibold text-on-surface-variant"
                      >
                        취소
                      </button>
                    </div>
                  )}
                </div>

                {isColorOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setColorPickerId(null)} />
                    <div className="absolute right-0 top-full z-20 mt-2 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-3 shadow-xl">
                      <div className="grid grid-cols-3 gap-2">
                        {FOLDER_COLORS.map((color) => {
                          const isActive = (folder.color || '') === color.value

                          return (
                            <button
                              key={color.value || 'default'}
                              onClick={() => handleColorSelect(folder.id, color.value)}
                              className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                                isActive
                                  ? 'border-outline bg-surface-container'
                                  : 'border-outline-variant/30 hover:border-outline-variant hover:bg-surface'
                              }`}
                              title={color.label}
                            >
                              <span
                                className="flex h-5 w-5 items-center justify-center rounded-full border border-black/10"
                                style={{ backgroundColor: color.value || '#e7e5df' }}
                              >
                                {isActive && <Icon name="check" className="h-3 w-3 text-white" />}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </nav>

      {!isManaging &&
        (creating ? (
          <div className="mt-4 flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="컬렉션 이름..."
              className="type-body flex-1 border-b border-outline-variant bg-transparent py-2 text-on-surface placeholder:text-outline-variant/70 focus:border-secondary focus:outline-none"
            />
            <button
              onClick={handleCreate}
              disabled={loading}
              className="type-body font-semibold text-secondary"
            >
              {loading ? '...' : '저장'}
            </button>
            <button onClick={() => setCreating(false)} className="type-body text-on-surface-variant">
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="mt-6 flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-surface-container"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-high text-primary">
              <Icon name="plus" className="h-5 w-5" />
            </div>
            <span className="type-body font-medium text-on-surface-variant">새 컬렉션</span>
          </button>
        ))}

      {isManaging && folders.length > 0 && (
        <p className="type-micro mt-4 text-center text-outline">
          카드를 끌어다 원하는 폴더 위에 놓아주세요.
        </p>
      )}
    </aside>
  )
}
