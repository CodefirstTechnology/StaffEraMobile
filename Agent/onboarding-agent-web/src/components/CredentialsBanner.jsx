import { useState } from 'react'
import { Button } from './ui/Button'
import { useToast } from '../context/ToastContext'
import { copyText } from '../lib/copyToClipboard'

export function CredentialsBanner({ credentials, onDone }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  if (!credentials) return null

  const handleCopyAll = async () => {
    const text = `Email: ${credentials.email}\nPassword: ${credentials.password}`
    const ok = await copyText(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    if (ok) {
      toast.success('Copied')
    } else {
      toast.error('Could not copy')
    }
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
      <p className="font-semibold text-emerald-800">Password saved — share with helper</p>
      <p className="mt-2">
        Email: <strong>{credentials.email}</strong>
      </p>
      <p className="mt-1 font-mono">
        Password: <strong>{credentials.password}</strong>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={handleCopyAll}>
          {copied ? '✓ Copied' : 'Copy all'}
        </Button>
        {onDone ? (
          <Button variant="success" onClick={onDone}>
            Done
          </Button>
        ) : null}
      </div>
    </div>
  )
}
