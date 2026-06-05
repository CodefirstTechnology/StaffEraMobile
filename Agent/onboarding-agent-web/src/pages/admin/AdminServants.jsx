import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { Badge } from '../../components/ui/Badge'

export default function AdminServants() {
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-servants', status],
    queryFn: async () => {
      const res = await api.get('/admin/servants', {
        params: { status: status || undefined },
      })
      return res.data.data.servants
    },
  })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">All Servants</h2>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="rounded-lg border px-3 py-2 text-sm"
      >
        <option value="">All</option>
        <option value="VERIFIED">Verified</option>
        <option value="PENDING">Pending</option>
        <option value="REJECTED">Rejected</option>
      </select>
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <table className="w-full rounded-xl bg-surface text-sm shadow-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Agent</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Rating</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((s) => (
              <tr key={s.id} className="border-b">
                <td className="p-4">
                  <Link to={`/servants/${s.id}`} className="text-primary">
                    {s.user.name}
                  </Link>
                </td>
                <td className="p-4">{s.agent?.user?.name || '—'}</td>
                <td className="p-4">
                  <Badge status={s.verificationStatus} />
                </td>
                <td className="p-4">{s.rating.toFixed(1)} ★</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
