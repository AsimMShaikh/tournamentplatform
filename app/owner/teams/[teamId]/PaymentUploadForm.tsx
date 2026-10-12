'use client'

import { useState } from 'react'
import { submitPayment } from '@/app/actions/payment'

interface Props {
  teamId: string
  upiId: string | null
  teamFeeDisplay: string
}

export default function PaymentUploadForm({ teamId, upiId, teamFeeDisplay }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadedPath, setUploadedPath] = useState('')

  async function handleUpload() {
    if (!selectedFile) return
    setUploading(true)
    setUploadError('')

    const fd = new FormData()
    fd.append('file', selectedFile)
    fd.append('team_id', teamId)

    const res = await fetch('/api/uploads', { method: 'POST', body: fd })
    const json = await res.json()

    setUploading(false)
    if (!res.ok) {
      setUploadError(json.error ?? 'Upload failed. Please try again.')
    } else {
      setUploadedPath(json.path as string)
    }
  }

  return (
    <div className="space-y-6">
      {/* Payment instructions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="font-medium text-gray-800 mb-1">Pay {teamFeeDisplay} via UPI</p>
        {upiId && (
          <p className="text-gray-600 text-sm">
            UPI ID:{' '}
            <span className="font-mono font-medium select-all">{upiId}</span>
          </p>
        )}
        <p className="text-gray-500 text-xs mt-2">
          After completing payment, upload your screenshot or enter the transaction
          reference below. Your team slot is reserved only after admin approval.
        </p>
      </div>

      {/* Screenshot upload */}
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

        {uploadError && (
          <p className="text-red-600 text-sm mt-1">{uploadError}</p>
        )}

        {uploadedPath ? (
          <p className="text-green-600 text-sm mt-2">✓ Screenshot uploaded successfully</p>
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

      {/* Payment submission form — shown after upload */}
      {uploadedPath && (
        <form action={submitPayment} className="space-y-3">
          <input type="hidden" name="team_id" value={teamId} />
          <input type="hidden" name="screenshot_path" value={uploadedPath} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              UPI transaction reference{' '}
              <span className="font-normal text-gray-400">(optional but recommended)</span>
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
            className="w-full bg-black text-white py-2 rounded text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Submit payment for review →
          </button>
        </form>
      )}
    </div>
  )
}
