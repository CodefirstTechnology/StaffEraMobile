import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { SetPasswordModal } from '../components/SetPasswordModal'
import { CredentialsBanner } from '../components/CredentialsBanner'

export default function AppRegistrationList() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [passwordTarget, setPasswordTarget] = useState(null)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [credentials, setCredentials] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['agent-registrations', status, search],
    queryFn: async () => {
      const res = await api.get('/agent/servants', {
        params: {
          category: 'registered',
          status: status || undefined,
          search: search || undefined,
          limit: 100,
        },
      })
      return {
        servants: res.data.data.servants,
        locationNotice: res.data.data.locationNotice,
      }
    },
  })

  const rows = data?.servants || []
  const locationNotice = data?.locationNotice

  const savePassword = async ({ password }) => {
    if (!passwordTarget) return
    setPasswordLoading(true)
    try {
      const res = await api.patch(`/agent/servants/${passwordTarget.id}/password`, {
        password,
      })
      qc.invalidateQueries({ queryKey: ['agent-registrations'] })
      qc.invalidateQueries({ queryKey: ['servant', String(passwordTarget.id)] })
      setCredentials(res.data?.data?.credentials || null)
      setPasswordTarget(null)
    } catch (e) {
      window.alert(e.response?.data?.message || 'Failed to save password')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-violet-900">App registrations</h2>
          <p className="mt-1 max-w-xl text-sm text-on-surface-variant">
            Helpers who signed up in the Servant app within 3 km of your agency location.
            Set your office location in Profile to receive nearby requests.
          </p>
        </div>
        <Link to="/servants">
          <Button variant="secondary">View servants</Button>
        </Link>
      </div>

      <CredentialsBanner credentials={credentials} onDone={() => setCredentials(null)} />

      {locationNotice && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          {locationNotice}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="UNDER_REVIEW">Under Review</option>
        </select>
        <input
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-violet-100 bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-violet-50">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Email (Gmail / other)</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Password</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                    No app registrations yet.
                  </td>
                </tr>
              ) : (
                rows.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="p-4 font-medium">{s.user.name}</td>
                    <td className="p-4">{s.user.email}</td>
                    <td className="p-4">{s.user.phone || '—'}</td>
                    <td className="p-4">
                      {s.user.agentSetPassword ? (
                        <span className="text-emerald-700 font-medium">Set</span>
                      ) : (
                        <span className="text-amber-700">Not set</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge status={s.verificationStatus} />
                    </td>
                    <td className="p-4 space-x-2">
                      <Button
                        variant="secondary"
                        onClick={() => setPasswordTarget(s)}
                      >
                        {s.user.agentSetPassword ? 'Change password' : 'Set password'}
                      </Button>
                      <Link to={`/servants/${s.id}?from=registrations`}>
                        <Button variant="secondary">Review</Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <SetPasswordModal
        open={!!passwordTarget}
        registration={passwordTarget}
        loading={passwordLoading}
        onClose={() => setPasswordTarget(null)}
        onSaved={savePassword}
      />
    </div>
  )
}
