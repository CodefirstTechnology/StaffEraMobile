import { useEffect, useState } from 'react'
import { Button } from './ui/Button'
import { LoginPasswordFields } from './LoginPasswordFields'
import { validateServantPassword } from '../lib/generatePassword'

export function SetPasswordModal({
  open,
  registration,
  onClose,
  onSaved,
  loading,
  saveError = '',
  onSaveErrorClear,
  missingFields = [],
}) {
  const [password, setPassword] = useState('')
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    if (!open) {
      setPassword('')
      setValidationError('')
    }
  }, [open])

  if (!open || !registration) return null

  const handlePasswordChange = (value) => {
    setPassword(value)
    setValidationError('')
    onSaveErrorClear?.()
  }

  const handleSave = () => {
    const result = validateServantPassword(password)
    if (!result.ok) {
      setValidationError(result.error)
      return
    }
    onSaved({ password: result.password })
  }

  const handleClose = () => {
    setPassword('')
    setValidationError('')
    onSaveErrorClear?.()
    onClose()
  }

  const isComplete = missingFields.length === 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="glass-card w-full max-w-md p-6 shadow-2xl">
        <h4 className="text-lg font-semibold text-primary">Set login password</h4>
        <p className="mt-1 text-sm font-medium text-violet-800">{registration.user?.name}</p>
        {!isComplete ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">⚠️ Profile Incomplete</p>
            <p className="mt-1 text-xs">
              You cannot set or generate a login password for this helper until you complete all required registration details.
            </p>
            <p className="mt-2 text-xs font-semibold text-amber-900 animate-pulse">
              Missing: {missingFields.join(', ')}
            </p>
            <p className="mt-2 text-xs">
              Please go to the servant's review/details page to edit and complete their profile.
            </p>
          </div>
        ) : (
          <LoginPasswordFields
            email={registration.user?.email}
            password={password}
            onPasswordChange={handlePasswordChange}
            error={validationError || saveError}
          />
        )}
        <div className="mt-4 flex gap-2">
          {isComplete && (
            <Button variant="success" className="flex-1" disabled={loading} onClick={handleSave}>
              {loading ? 'Saving…' : 'Save password'}
            </Button>
          )}
          <Button variant="secondary" onClick={handleClose} disabled={loading} className={!isComplete ? 'w-full' : ''}>
            {isComplete ? 'Cancel' : 'Close'}
          </Button>
        </div>
      </div>
    </div>
  )
}
