import { useEffect, useState } from 'react'
import { Button } from './ui/Button'
import { LoginPasswordFields } from './LoginPasswordFields'
import { validateServantPassword } from '../lib/generatePassword'

export function ApprovePasswordModal({
  open,
  servant,
  onClose,
  onConfirm,
  loading,
  actionError = '',
  onActionErrorClear,
}) {
  const [password, setPassword] = useState('')
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    if (!open) {
      setPassword('')
      setValidationError('')
    }
  }, [open])

  if (!open || !servant) return null

  const handlePasswordChange = (value) => {
    setPassword(value)
    setValidationError('')
    onActionErrorClear?.()
  }

  const handleClose = () => {
    setPassword('')
    setValidationError('')
    onActionErrorClear?.()
    onClose()
  }

  const handleApprove = () => {
    const result = validateServantPassword(password)
    if (!result.ok) {
      setValidationError(result.error)
      return
    }
    onConfirm({ password: result.password })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="approve-password-title"
    >
      <div className="glass-card w-full max-w-md p-6 shadow-2xl">
        <h4 id="approve-password-title" className="text-lg font-semibold text-primary">
          Approve & set login password
        </h4>
        <LoginPasswordFields
          email={servant.user?.email}
          password={password}
          onPasswordChange={handlePasswordChange}
          hint="This helper registered from the Servant app. Set their password and share it so they can sign in."
          error={validationError || actionError}
        />
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            variant="success"
            className="flex-1"
            disabled={loading}
            onClick={handleApprove}
          >
            {loading ? 'Saving…' : 'Approve with this password'}
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            disabled={loading}
            onClick={() => onConfirm({ generatePassword: true })}
          >
            {loading ? 'Saving…' : 'Generate & approve'}
          </Button>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
