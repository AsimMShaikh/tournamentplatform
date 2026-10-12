'use client'

import { useState } from 'react'

interface Props {
  text: string
  label?: string
}

export default function CopyButton({ text, label = 'Copy' }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors ml-2"
    >
      {copied ? '✓ Copied!' : label}
    </button>
  )
}
