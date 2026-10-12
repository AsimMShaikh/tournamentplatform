'use client'

import { useState } from 'react'
import { addPlayersAction } from '@/app/actions/players'

interface PlayerRow {
  key: string
  name: string
  phone: string
  duprType: 'no_dupr' | 'has_dupr'
  duprId: string
  submittedRating: string
}

function emptyRow(): PlayerRow {
  return { key: crypto.randomUUID(), name: '', phone: '', duprType: 'no_dupr', duprId: '', submittedRating: '' }
}

interface Props {
  teamId: string
}

export default function AddPlayersForm({ teamId }: Props) {
  const [rows, setRows] = useState<PlayerRow[]>([emptyRow()])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function updateRow(key: string, patch: Partial<PlayerRow>) {
    setRows(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r))
  }

  function addRow() {
    setRows(prev => [...prev, emptyRow()])
  }

  function removeRow(key: string) {
    setRows(prev => prev.filter(r => r.key !== key))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    for (const row of rows) {
      if (!row.name.trim()) {
        setError('Every player must have a name.')
        return
      }
      if (row.duprType === 'has_dupr') {
        const rating = parseFloat(row.submittedRating)
        if (isNaN(rating) || rating < 1 || rating > 8) {
          setError(`"${row.name}": DUPR rating must be between 1.0 and 8.0.`)
          return
        }
      }
    }

    const players = rows.map(row => ({
      name: row.name.trim(),
      phone: row.phone.trim() || null,
      email: null,
      dupr_id: row.duprType === 'has_dupr' && row.duprId.trim() ? row.duprId.trim() : null,
      submitted_rating: row.duprType === 'has_dupr' ? parseFloat(row.submittedRating) : null,
      rating_status: row.duprType === 'no_dupr' ? ('no_dupr' as const) : ('verified' as const),
    }))

    setLoading(true)
    const result = await addPlayersAction(players, teamId)
    setLoading(false)

    if (result?.error) {
      setError(result.error)
    }
    // On success, addPlayersAction redirects — no need to handle here
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div key={row.key} className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Player {idx + 1}</p>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Full name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={row.name}
                  onChange={e => updateRow(row.key, { name: e.target.value })}
                  required
                  maxLength={80}
                  placeholder="Player name"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Phone <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={row.phone}
                  onChange={e => updateRow(row.key, { phone: e.target.value })}
                  maxLength={20}
                  placeholder="+91 98765 43210"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            {/* DUPR classification */}
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-600 mb-2">DUPR rating</p>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={row.duprType === 'no_dupr'}
                    onChange={() => updateRow(row.key, { duprType: 'no_dupr' })}
                    className="accent-black"
                  />
                  No DUPR (counts as 3.75)
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={row.duprType === 'has_dupr'}
                    onChange={() => updateRow(row.key, { duprType: 'has_dupr' })}
                    className="accent-black"
                  />
                  Has DUPR
                </label>
              </div>

              {row.duprType === 'has_dupr' && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      DUPR ID <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={row.duprId}
                      onChange={e => updateRow(row.key, { duprId: e.target.value })}
                      maxLength={40}
                      placeholder="e.g. 1234567"
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Rating <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={row.submittedRating}
                      onChange={e => updateRow(row.key, { submittedRating: e.target.value })}
                      step="0.01"
                      min="1"
                      max="8"
                      required={row.duprType === 'has_dupr'}
                      placeholder="e.g. 3.75"
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={addRow}
          className="text-sm text-gray-600 border rounded px-3 py-2 hover:bg-gray-50 transition-colors"
        >
          + Add another player
        </button>

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white text-sm px-5 py-2 rounded font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {loading ? 'Adding…' : `Add ${rows.length} player${rows.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </form>
  )
}
