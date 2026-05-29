import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'

export default function ServantList() {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['agent-servants', status, search],
    queryFn: async () => {
      const res = await api.get('/agent/servants', {
        params: { status: status || undefined, search: search || undefined },
      })
      return res.data.data.servants
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Servants</h2>
        <Link to="/servants/new">
          <Button>Onboard New Servant</Button>
        </Link>
      </div>
      <div className="flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-4">Photo</th>
                <th className="p-4">Name</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Skills</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="p-4">
                    {s.profilePhoto ? (
                      <img
                        src={`http://localhost:5000${s.profilePhoto}`}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {s.user.name[0]}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <Link
                      to={`/servants/${s.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {s.user.name}
                    </Link>
                  </td>
                  <td className="p-4">{s.user.phone || '—'}</td>
                  <td className="p-4">
                    {s.skills?.map((sk) => sk.skillName).join(', ')}
                  </td>
                  <td className="p-4">
                    <Badge status={s.verificationStatus} />
                  </td>
                  <td className="p-4 space-x-2">
                    <Link to={`/servants/${s.id}`}>
                      <Button variant="secondary">View</Button>
                    </Link>
                    <Link to={`/servants/${s.id}/edit`}>
                      <Button variant="secondary">Edit</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
