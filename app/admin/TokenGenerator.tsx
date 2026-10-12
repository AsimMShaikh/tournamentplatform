'use client'

import { useState } from 'react'
import { generateToken } from '@/app/actions/admin'

export default function TokenGenerator() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setUrl('')
    const result = await generateToken()
    setUrl(result.url)
    setLoading(false)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-black text-white text-sm px-4 py-2 rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {loading ? 'Generating…' : 'Generate registration link'}
      </button>

      {url && (
        <div className="mt-3 bg-gray-50 rounded border p-3">
          <p className="text-xs text-gray-500 mb-2">Share this link with the team owner:</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={url}
              readOnly
              className="flex-1 text-xs font-mono bg-white border rounded px-2 py-1.5 text-gray-700 truncate"
            />
            <button
              onClick={handleCopy}
              className="shrink-0 text-xs px-3 py-1.5 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">This link can only be used once.</p>
        </div>
      )}
    </div>
  )
}
