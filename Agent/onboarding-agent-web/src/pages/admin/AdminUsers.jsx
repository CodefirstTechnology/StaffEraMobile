import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { Badge } from '../../components/ui/Badge'

export default function AdminUsers() {
  const [role, setRole] = useState('')
  const [search, setSearch] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', role, search],
    queryFn: async () => {
      const res = await api.get('/admin/users', {
        params: { role: role || undefined, search: search || undefined },
      })
      return res.data.data.users
    },
  })

  const toggle = async (id) => {
    await api.patch(`/admin/users/${id}/toggle`)
    qc.invalidateQueries({ queryKey: ['admin-users'] })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Users</h2>
      <div className="flex gap-3">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">All roles</option>
          <option value="HOUSE_OWNER">House Owner</option>
          <option value="SERVANT">Servant</option>
          <option value="AGENT">Agent</option>
          <option value="ADMIN">Admin</option>
        </select>
        <input
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        />
      </div>
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <table className="w-full rounded-xl bg-surface text-sm shadow-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Email</th>
              <th className="p-4 text-left">Role</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((u) => (
              <tr key={u.id} className="border-b">
                <td className="p-4">{u.name}</td>
                <td className="p-4">{u.email}</td>
                <td className="p-4">
                  <Badge status={u.role} />
                </td>
                <td className="p-4">{u.isActive ? 'Active' : 'Inactive'}</td>
                <td className="p-4">
                  <button
                    type="button"
                    onClick={() => toggle(u.id)}
                    className="text-primary underline text-sm"
                  >
                    Toggle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
