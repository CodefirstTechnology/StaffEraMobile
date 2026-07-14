import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import {
  PageHeader,
  StatCard,
  Avatar,
  ActivePill,
  RolePill,
  FilterBar,
  SelectFilter,
  SearchInput,
  LoadingSkeleton,
  EmptyState,
  DataTable,
  TableRow,
  MobileCard,
} from '../../components/admin/adminUi'

const ROLE_OPTIONS = [
  ['', 'All roles'],
  ['HOUSE_OWNER', 'House owners'],
  ['SERVANT', 'Servants'],
  ['AGENT', 'Agents'],
  ['ADMIN', 'Admins'],
]

function displayName(user) {
  const trimmed = user?.name?.trim()
  if (trimmed) return trimmed
  if (user?.email) return user.email.split('@')[0]
  return 'Unnamed user'
}

function houseOwnerMeta(user) {
  if (user?.role !== 'HOUSE_OWNER') return null
  const parts = [user.houseOwner?.city, user.houseOwner?.address].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

export default function AdminUsers() {
  const [role, setRole] = useState('')
  const [search, setSearch] = useState('')
  const qc = useQueryClient()
  const toast = useToast()

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats')
      return res.data.data
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', role, search],
    queryFn: async () => {
      const res = await api.get('/admin/users', {
        params: {
          role: role || undefined,
          search: search || undefined,
          limit: 200,
        },
      })
      return res.data.data
    },
  })

  const users = data?.users || []
  const total = data?.pagination?.total ?? users.length

  const toggle = async (user) => {
    const wasActive = user.isActive
    try {
      await api.patch(`/admin/users/${user.id}/toggle`)
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success(
        wasActive
          ? `User "${displayName(user)}" deactivated`
          : `User "${displayName(user)}" activated`,
      )
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="All platform accounts — house owners, servants, agents, and admins."
      />

      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total users" value={total} />
          <StatCard
            label="House owners"
            value={stats?.totalOwners ?? '—'}
            accent="text-blue-600"
          />
          <StatCard
            label="Servants"
            value={stats?.totalServants ?? '—'}
            accent="text-violet-600"
          />
          <StatCard
            label="Field agents"
            value={stats?.totalAgents ?? '—'}
            accent="text-secondary"
          />
        </div>
      )}

      <FilterBar count={users.length} countLabel={`of ${total} users`}>
        <SelectFilter value={role} onChange={setRole} options={ROLE_OPTIONS} />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email…"
        />
      </FilterBar>

      {isLoading ? (
        <LoadingSkeleton cards={4} rows={5} />
      ) : users.length === 0 ? (
        <EmptyState
          icon="👤"
          title="No users found"
          description={
            role === 'HOUSE_OWNER'
              ? 'No house owner accounts match this filter.'
              : 'Try a different search or filter to find accounts.'
          }
        />
      ) : (
        <>
          <div className="grid gap-4 lg:hidden">
            {users.map((u) => (
              <MobileCard key={u.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={displayName(u)} />
                    <div className="min-w-0">
                      <p className="font-semibold text-primary truncate">{displayName(u)}</p>
                      <p className="text-sm text-on-surface-variant truncate">{u.email}</p>
                      {u.phone && (
                        <p className="text-xs text-on-surface-variant">{u.phone}</p>
                      )}
                      {houseOwnerMeta(u) && (
                        <p className="text-xs text-on-surface-variant">{houseOwnerMeta(u)}</p>
                      )}
                    </div>
                  </div>
                  <ActivePill active={u.isActive} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <RolePill role={u.role} />
                </div>
                <button
                  type="button"
                  onClick={() => toggle(u)}
                  disabled={u.role === 'ADMIN' && u.isActive}
                  title={u.role === 'ADMIN' && u.isActive ? 'Admin users cannot be deactivated' : undefined}
                  className={`mt-4 w-full rounded-xl border py-2 text-sm font-medium ${
                    u.role === 'ADMIN' && u.isActive
                      ? 'border-outline-variant/20 text-on-surface-variant/40 cursor-not-allowed bg-gray-50'
                      : 'border-outline-variant/40 text-on-surface-variant hover:bg-surface-low'
                  }`}
                >
                  {u.isActive ? 'Deactivate account' : 'Activate account'}
                </button>
              </MobileCard>
            ))}
          </div>

          <DataTable columns={['User', 'Email', 'Phone', 'Role', 'Status', 'Actions']}>
            {users.map((u) => (
              <TableRow key={u.id}>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={displayName(u)} />
                    <div>
                      <span className="font-semibold text-primary">{displayName(u)}</span>
                      {houseOwnerMeta(u) && (
                        <p className="text-xs text-on-surface-variant">{houseOwnerMeta(u)}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-on-surface-variant">{u.email}</td>
                <td className="px-4 py-4 text-on-surface-variant">{u.phone || '—'}</td>
                <td className="px-4 py-4">
                  <RolePill role={u.role} />
                </td>
                <td className="px-4 py-4">
                  <ActivePill active={u.isActive} />
                </td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    onClick={() => toggle(u)}
                    disabled={u.role === 'ADMIN' && u.isActive}
                    title={u.role === 'ADMIN' && u.isActive ? 'Admin users cannot be deactivated' : undefined}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      u.role === 'ADMIN' && u.isActive
                        ? 'border border-outline-variant/20 text-on-surface-variant/40 cursor-not-allowed'
                        : u.isActive
                          ? 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-low'
                          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    }`}
                  >
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </TableRow>
            ))}
          </DataTable>
        </>
      )}
    </div>
  )
}
