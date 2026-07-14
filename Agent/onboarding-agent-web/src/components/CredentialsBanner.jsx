import { Button } from './ui/Button'
import { useToast } from '../context/ToastContext'
import { copyText } from '../lib/copyToClipboard'

export function CredentialsBanner({ credentials, onDone }) {
  const { showToast } = useToast()

  if (!credentials) return null

  const handleCopyAll = async () => {
    const text = `Email: ${credentials.email}\nPassword: ${credentials.password}`
    const ok = await copyText(text)
    showToast(ok ? 'Copied' : 'Could not copy')
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
          Copy all
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
