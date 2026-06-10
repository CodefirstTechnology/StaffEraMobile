import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { uploadUrl } from '../lib/mediaUrl'
import { Badge } from '../components/ui/Badge'
import { VerifiedBadge } from '../components/ui/VerifiedBadge'
import { Button } from '../components/ui/Button'

const CATEGORY_OPTIONS = [
  { value: '', label: 'My servants' },
  { value: 'onboarded', label: 'Agent onboarded' },
]

export default function ServantList() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(searchParams.get('category') || '')

  useEffect(() => {
    const fromUrl = searchParams.get('category') || ''
    setCategory(fromUrl)
  }, [searchParams])

  const { data, isLoading } = useQuery({
    queryKey: ['agent-servants', status, search, category],
    queryFn: async () => {
      const res = await api.get('/agent/servants', {
        params: {
          status: status || undefined,
          search: search || undefined,
          category: category || undefined,
          limit: 100,
        },
      })
      return res.data.data.servants
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Servants</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Staff you onboarded and verified. App sign-ups are managed separately under{' '}
            <Link to="/registrations" className="font-medium text-violet-700 hover:underline">
              App registrations
            </Link>
            .
          </p>
        </div>
        <Link to="/servants/new">
          <Button>Onboard New Servant</Button>
        </Link>
      </div>
      <div className="flex flex-wrap gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
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
              {!isLoading && (data || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                    No servants in this category.
                  </td>
                </tr>
              ) : null}
              {(data || []).map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="p-4">
                    {s.profilePhoto ? (
                      <img
                        src={uploadUrl(s.profilePhoto)}
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
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/servants/${s.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {s.user.name}
                      </Link>
                      {s.verificationStatus === 'VERIFIED' ? <VerifiedBadge /> : null}
                    </div>
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
