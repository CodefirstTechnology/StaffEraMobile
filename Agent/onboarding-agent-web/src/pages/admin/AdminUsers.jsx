import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { ConfirmDialog } from '../../components/ConfirmDialog'
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

import { Pagination } from '../../components/ui/Pagination'

export default function AdminUsers() {
  const [role, setRole] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const qc = useQueryClient()
  const toast = useToast()

  const handleRoleChange = (newRole) => {
    setRole(newRole)
    setPage(1)
  }

  const handleSearchChange = (newSearch) => {
    setSearch(newSearch)
    setPage(1)
  }

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats')
      return res.data.data
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', role, search, page, limit],
    queryFn: async () => {
      const res = await api.get('/admin/users', {
        params: {
          role: role || undefined,
          search: search || undefined,
          page,
          limit,
        },
      })
      return res.data.data
    },
  })

  const { data: allUsersData } = useQuery({
    queryKey: ['admin-users-all'],
    queryFn: async () => {
      const res = await api.get('/admin/users', {
        params: { limit: 1 },
      })
      return res.data.data
    },
  })

  const users = data?.users || []
  const total = data?.pagination?.total ?? users.length
  const overallTotalUsers = allUsersData?.pagination?.total ?? '—'

  const toggle = async (user) => {
    const wasActive = user.isActive
    try {
      await api.patch(`/admin/users/${user.id}/toggle`)
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-users-all'] })
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
          <StatCard label="Total users" value={overallTotalUsers} />
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

      <FilterBar count={total} countLabel="total users">
        <SelectFilter value={role} onChange={handleRoleChange} options={ROLE_OPTIONS} />
        <SearchInput
          value={search}
          onChange={handleSearchChange}
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
                      <p className="text-xs text-on-surface-variant truncate">{u.email}</p>
                    </div>
                  </div>
                  <ActivePill active={u.isActive} />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/20 pt-3">
                  <RolePill role={u.role} />
                  {u.phone && (
                    <span className="text-xs text-on-surface-variant">{u.phone}</span>
                  )}
                </div>
              </MobileCard>
            ))}
          </div>

          <DataTable
            columns={['Name', 'Email', 'Phone', 'Role', 'Status', 'Action']}
          >
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
                    onClick={() => setConfirmTarget(u)}
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

          <Pagination
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        title={confirmTarget?.isActive ? 'Deactivate User' : 'Activate User'}
        description={`Are you sure you want to ${
          confirmTarget?.isActive ? 'deactivate' : 'activate'
        } the user "${confirmTarget ? displayName(confirmTarget) : ''}"?`}
        confirmLabel={confirmTarget?.isActive ? 'Deactivate' : 'Activate'}
        cancelLabel="Cancel"
        variant={confirmTarget?.isActive ? 'danger' : 'success'}
        onConfirm={async () => {
          if (confirmTarget) {
            await toggle(confirmTarget)
            setConfirmTarget(null)
          }
        }}
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  )
}
