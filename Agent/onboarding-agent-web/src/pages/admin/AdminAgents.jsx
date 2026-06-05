import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { AgentLocationPicker } from '../../components/AgentLocationPicker'
import { CredentialsBanner } from '../../components/CredentialsBanner'

export default function AdminAgents() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [credentials, setCredentials] = useState(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [password, setPassword] = useState('')
  const [generatePassword, setGeneratePassword] = useState(true)
  const [location, setLocation] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-agents', search],
    queryFn: async () => {
      const res = await api.get('/admin/agents', {
        params: { search: search || undefined, limit: 100 },
      })
      return res.data.data.agents
    },
  })

  const resetForm = () => {
    setName('')
    setEmail('')
    setPhone('')
    setAgencyName('')
    setPassword('')
    setGeneratePassword(true)
    setLocation(null)
    setError('')
  }

  const toggleActive = async (userId) => {
    await api.patch(`/admin/users/${userId}/toggle`)
    qc.invalidateQueries({ queryKey: ['admin-agents'] })
    qc.invalidateQueries({ queryKey: ['admin-stats'] })
  }

  const createAgent = async (e) => {
    e.preventDefault()
    setError('')

    if (!location?.address?.trim() || location.latitude == null || location.longitude == null) {
      setError('Pick the agent area / office location from search or GPS.')
      return
    }

    setSaving(true)
    try {
      const res = await api.post('/admin/agents', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        agencyName: agencyName.trim() || undefined,
        password: generatePassword ? undefined : password,
        generatePassword,
        address: location.address,
        city: location.city,
        latitude: location.latitude,
        longitude: location.longitude,
      })
      setCredentials(res.data?.data?.credentials || null)
      resetForm()
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['admin-agents'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create agent')
    } finally {
      setSaving(false)
    }
  }

  const rows = data || []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Field agents</h2>
          <p className="mt-1 text-sm text-subtext">
            Only admins can add agents. Each agent is assigned to a particular area.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Add agent'}
        </Button>
      </div>

      <CredentialsBanner
        credentials={credentials}
        onDone={() => setCredentials(null)}
      />

      {showForm && (
        <form
          onSubmit={createAgent}
          className="rounded-xl bg-surface p-6 shadow-sm space-y-4"
        >
          <h3 className="font-semibold text-primary">New agent</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium">Full name *</span>
              <input
                required
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Email *</span>
              <input
                required
                type="email"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Phone</span>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Agency name</span>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
              />
            </label>
          </div>

          <AgentLocationPicker
            label="Agent area / office location"
            required
            value={location}
            onChange={setLocation}
          />

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={generatePassword}
                onChange={(e) => setGeneratePassword(e.target.checked)}
              />
              Auto-generate login password
            </label>
            {!generatePassword && (
              <input
                type="password"
                minLength={6}
                placeholder="Login password (min 6 chars)"
                className="w-full max-w-sm rounded-lg border px-3 py-2 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create agent'}
          </Button>
        </form>
      )}

      <input
        placeholder="Search by name, email, agency, or area…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md rounded-lg border px-3 py-2 text-sm"
      />

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <table className="w-full rounded-xl bg-surface text-sm shadow-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Agency</th>
              <th className="p-4 text-left">Area</th>
              <th className="p-4 text-left">Servants</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-subtext">
                  No agents yet. Use &quot;Add agent&quot; to onboard a field agent for an area.
                </td>
              </tr>
            ) : (
              rows.map((a) => (
                <tr key={a.id} className="border-b">
                  <td className="p-4">
                    <p className="font-medium">{a.user.name}</p>
                    <p className="text-xs text-subtext">{a.user.email}</p>
                  </td>
                  <td className="p-4">{a.agencyName || '—'}</td>
                  <td className="p-4">
                    <p>{a.address || '—'}</p>
                    {a.city && <p className="text-xs text-subtext">{a.city}</p>}
                  </td>
                  <td className="p-4">{a._count?.servants ?? 0}</td>
                  <td className="p-4">
                    {a.user.isActive ? 'Active' : 'Inactive'}
                  </td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => toggleActive(a.user.id)}
                      className="text-primary underline text-sm"
                    >
                      {a.user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
