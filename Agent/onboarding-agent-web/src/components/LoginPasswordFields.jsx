import { useState } from 'react'
import { Button } from './ui/Button'
import { useToast } from '../context/ToastContext'
import { copyText } from '../lib/copyToClipboard'
import { generateServantPassword, checkPasswordStrength } from '../lib/generatePassword'

export function LoginPasswordFields({ email, password, onPasswordChange, hint, error }) {
  const { showToast } = useToast()
  const [showPassword, setShowPassword] = useState(false)

  const handleCopyPassword = async () => {
    if (!password) return
    const ok = await copyText(password)
    showToast(ok ? 'Copied' : 'Could not copy')
  }
  return (
    <div className="space-y-3 rounded-lg border border-violet-100 bg-violet-50/50 p-4">
      <p className="text-sm text-violet-900">
        {hint ||
          'Set or generate a login password for this app registration. Share it with the helper after you approve them.'}
      </p>
      {email ? (
        <p className="text-sm">
          <span className="text-on-surface-variant">Email: </span>
          <span className="font-medium text-primary">{email}</span>
        </p>
      ) : null}
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Login password</span>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Min 6 characters"
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'login-password-error' : undefined}
            className={`w-full rounded-lg border pl-3 pr-14 py-2 ${error ? 'border-error' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-violet-600 hover:text-violet-800 focus:outline-none cursor-pointer select-none"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {password && (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-xs text-on-surface-variant font-medium">Strength:</span>
            <span className={`text-xs font-bold ${checkPasswordStrength(password).color}`}>
              {checkPasswordStrength(password).label}
            </span>
          </div>
        )}
      </label>
      {error ? (
        <div
          id="login-password-error"
          className="rounded-lg border border-error/20 bg-red-50 px-3 py-2 text-sm text-error"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onPasswordChange(generateServantPassword())}
        >
          Generate password
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleCopyPassword}
          disabled={!password}
        >
          Copy password
        </Button>
      </div>
    </div>
  )
}
