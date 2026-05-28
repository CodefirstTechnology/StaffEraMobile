import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['agent-servants'],
    queryFn: async () => {
      const res = await api.get('/agent/servants', { params: { limit: 100 } })
      return res.data.data.servants
    },
  })

  const servants = data || []
  const pending = servants.filter((s) =>
    ['PENDING', 'UNDER_REVIEW'].includes(s.verificationStatus),
  )
  const verified = servants.filter((s) => s.verificationStatus === 'VERIFIED')
  const rejected = servants.filter((s) => s.verificationStatus === 'REJECTED')

  const stats = [
    { label: 'My servants', value: servants.length, accent: 'text-primary' },
    { label: 'Pending verification', value: pending.length, accent: 'text-tertiary-accent' },
    { label: 'Verified', value: verified.length, accent: 'text-emerald-600' },
    { label: 'Rejected', value: rejected.length, accent: 'text-error' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-primary">Pipeline overview</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Verify ID quickly — families book only verified staff.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((c) => (
          <div key={c.label} className="glass-card p-6">
            <p className="text-sm text-on-surface-variant">{c.label}</p>
            <p className={`mt-2 text-3xl font-bold ${c.accent}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-primary">Pending verification</h3>
        <Link to="/servants/new" className="btn-gradient px-6 py-2.5 text-sm">
          Onboard new servant
        </Link>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container text-on-surface-variant">
            <tr>
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Phone</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-on-surface-variant">
                  Loading…
                </td>
              </tr>
            ) : pending.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-on-surface-variant">
                  No pending verifications — great work!
                </td>
              </tr>
            ) : (
              pending.slice(0, 10).map((s) => (
                <tr key={s.id} className="border-t border-outline-variant/30">
                  <td className="p-4 font-medium">{s.user.name}</td>
                  <td className="p-4">{s.user.phone || '—'}</td>
                  <td className="p-4">
                    <span className="rounded-full bg-tertiary-accent/20 px-2.5 py-0.5 text-xs font-semibold text-tertiary">
                      {s.verificationStatus}
                    </span>
                  </td>
                  <td className="p-4">
                    <Link
                      to={`/servants/${s.id}`}
                      className="text-secondary font-semibold hover:underline"
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
