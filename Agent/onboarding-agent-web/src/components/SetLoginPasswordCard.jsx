import { useState } from 'react'
import api from '../lib/api'
import { Button } from './ui/Button'
import { LoginPasswordFields } from './LoginPasswordFields'
import { CredentialsBanner } from './CredentialsBanner'
import { validateServantPassword } from '../lib/generatePassword'

export function SetLoginPasswordCard({ servantId, email, passwordAlreadySet, onSaved }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [credentials, setCredentials] = useState(null)
  const [error, setError] = useState('')

  const handlePasswordChange = (value) => {
    setPassword(value)
    setError('')
  }

  const save = async () => {
    const result = validateServantPassword(password)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.patch(`/agent/servants/${servantId}/password`, {
        password: result.password,
      })
      setCredentials(res.data?.data?.credentials || null)
      setPassword('')
      onSaved?.()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="glass-card border border-violet-100 p-6">
      <h3 className="text-lg font-semibold text-violet-900">Login password (Gmail / app signup)</h3>
      <p className="mt-1 text-sm text-on-surface-variant">
        {passwordAlreadySet
          ? 'Password was set. You can change it below before or after approval.'
          : 'This helper registered from the app and needs a password before they can sign in after approval.'}
      </p>
      <div className="mt-4">
        <CredentialsBanner credentials={credentials} onDone={() => setCredentials(null)} />
      </div>
      {!credentials ? (
        <>
          <LoginPasswordFields
            email={email}
            password={password}
            onPasswordChange={handlePasswordChange}
            error={error}
          />
          <Button className="mt-4 w-full" variant="success" disabled={loading} onClick={save}>
            {loading ? 'Saving…' : passwordAlreadySet ? 'Update password' : 'Save password'}
          </Button>
        </>
      ) : null}
    </section>
  )
}
