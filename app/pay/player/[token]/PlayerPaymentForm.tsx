'use client'

import { useState } from 'react'
import { submitPublicPayment } from '@/app/actions/payment'

interface Props {
  token: string
  upiId: string | null
  playerFeeDisplay: string
}

export default function PlayerPaymentForm({ token, upiId, playerFeeDisplay }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadedPath, setUploadedPath] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  async function handleUpload() {
    if (!selectedFile) return
    setUploading(true)
    setUploadError('')

    const fd = new FormData()
    fd.append('file', selectedFile)
    fd.append('payment_token', token)

    const res = await fetch('/api/uploads/player-payment', { method: 'POST', body: fd })
    const json = await res.json()

    setUploading(false)
    if (!res.ok) {
      setUploadError(json.error ?? 'Upload failed. Please try again.')
    } else {
      setUploadedPath(json.path as string)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!uploadedPath) return

    setSubmitting(true)
    setSubmitError('')

    const transactionRef = (e.currentTarget.elements.namedItem('transaction_ref') as HTMLInputElement)?.value?.trim()

    const result = await submitPublicPayment(token, uploadedPath, transactionRef || undefined)

    setSubmitting(false)
    if (result.error) {
      setSubmitError(result.error)
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="text-green-600 text-4xl mb-3">✓</div>
        <h2 className="font-semibold text-lg text-gray-800">Payment submitted!</h2>
        <p className="text-gray-500 text-sm mt-2">
          Your payment proof is under review. Your team captain will be notified.
        </p>
        <p className="text-gray-400 text-xs mt-4">You can close this page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* UPI details */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="font-medium text-gray-800 mb-1">Pay {playerFeeDisplay} via UPI</p>
        {upiId && (
          <p className="text-gray-600 text-sm">
            UPI ID: <span className="font-mono font-medium select-all">{upiId}</span>
          </p>
        )}
        <p className="text-gray-500 text-xs mt-2">
          After completing the payment, upload your screenshot below.
        </p>
      </div>

      {/* File upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Payment screenshot{' '}
          <span className="font-normal text-gray-400">(JPG, PNG or PDF — max 2 MB)</span>
        </label>
        <input
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          onChange={(e) => {
            setUploadedPath('')
            setUploadError('')
            setSelectedFile(e.target.files?.[0] ?? null)
          }}
          className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
        {uploadError && <p className="text-red-600 text-sm mt-1">{uploadError}</p>}
        {uploadedPath ? (
          <p className="text-green-600 text-sm mt-2">✓ Screenshot uploaded</p>
        ) : (
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="mt-2 px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading…' : 'Upload screenshot'}
          </button>
        )}
      </div>

      {/* Submit form — shown after upload */}
      {uploadedPath && (
        <form onSubmit={handleSubmit} className="space-y-3">
          {submitError && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-3">
              {submitError}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              UPI transaction reference{' '}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              name="transaction_ref"
              maxLength={100}
              placeholder="e.g. 123456789012"
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-black text-white py-2 rounded text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit payment for review →'}
          </button>
        </form>
      )}
    </div>
  )
}
