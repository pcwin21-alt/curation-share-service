'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/apiClient'
import { CurationFolder } from '@/types'

interface FolderCreateFormProps {
  onCreated: (folder: CurationFolder) => void
}

export default function FolderCreateForm({ onCreated }: FolderCreateFormProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await apiFetch('/api/folders', {
        method: 'POST',
        requireAuth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const folder = await res.json()
      onCreated(folder)
      setName('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="새 폴더 이름"
        className="flex-1 text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-300"
      />
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="text-sm px-4 py-2 bg-zinc-900 text-white rounded-lg disabled:opacity-40"
      >
        {loading ? '생성 중...' : '+ 폴더'}
      </button>
    </form>
  )
}
