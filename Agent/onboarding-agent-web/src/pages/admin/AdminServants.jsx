import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { VerifiedBadge } from '../../components/ui/VerifiedBadge'
import { Button } from '../../components/ui/Button'
import {
  PageHeader,
  StatCard,
  Avatar,
  FilterBar,
  SelectFilter,
  LoadingSkeleton,
  EmptyState,
  DataTable,
  TableRow,
  MobileCard,
} from '../../components/admin/adminUi'

const STATUS_OPTIONS = [
  ['', 'All statuses'],
  ['VERIFIED', 'Verified'],
  ['PENDING', 'Pending'],
  ['UNDER_REVIEW', 'Under review'],
  ['REJECTED', 'Rejected'],
]

import { Pagination } from '../../components/ui/Pagination'

export default function AdminServants() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus)
    setPage(1)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-servants', status, page, limit],
    queryFn: async () => {
      const res = await api.get('/admin/servants', {
        params: { status: status || undefined, page, limit },
      })
      return res.data.data
    },
  })

  const { data: allServantsData } = useQuery({
    queryKey: ['admin-servants-all'],
    queryFn: async () => {
      const res = await api.get('/admin/servants', {
        params: { limit: 1000 },
      })
      return res.data.data.servants
    },
  })

  const servants = data?.servants || []
  const total = data?.pagination?.total ?? servants.length
  const allServants = allServantsData || []

  const stats = useMemo(() => {
    const verified = allServants.filter((s) => s.verificationStatus === 'VERIFIED').length
    const pending = allServants.filter((s) =>
      ['PENDING', 'UNDER_REVIEW'].includes(s.verificationStatus),
    ).length
    const avgRating =
      allServants.length > 0
        ? (
            allServants.reduce((sum, s) => sum + (s.rating || 0), 0) / allServants.length
          ).toFixed(1)
        : '—'
    return { total: allServants.length, verified, pending, avgRating }
  }, [allServants])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Servants"
        description="Every helper on the platform — agent-onboarded and app registrations."
        action={
          <Link to="/servants/new">
            <Button variant="gradient">+ Onboard servant</Button>
          </Link>
        }
      />

      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total servants" value={stats.total} />
          <StatCard label="Verified" value={stats.verified} accent="text-emerald-600" />
          <StatCard label="Pending review" value={stats.pending} accent="text-amber-600" />
          <StatCard
            label="Avg. rating"
            value={stats.avgRating === '—' ? '—' : `${stats.avgRating} ★`}
            accent="text-secondary"
          />
        </div>
      )}

      <FilterBar
        count={total}
        countLabel="total servants"
      >
        <SelectFilter value={status} onChange={handleStatusChange} options={STATUS_OPTIONS} />
      </FilterBar>

      {isLoading ? (
        <LoadingSkeleton cards={4} rows={5} />
      ) : servants.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No servants found"
          description="Adjust status filters to find helpers."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:hidden">
            {servants.map((s) => (
              <MobileCard key={s.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.user?.name} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-primary">{s.user?.name || 'Unnamed'}</span>
                        {s.verificationStatus === 'VERIFIED' && <VerifiedBadge />}
                      </div>
                      <p className="text-xs text-on-surface-variant">{s.user?.email}</p>
                    </div>
                  </div>
                  <Badge status={s.verificationStatus} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-outline-variant/20 pt-3 text-xs text-on-surface-variant">
                  <span>Rating: {(s.rating ?? 0).toFixed(1)} ★</span>
                  <Link
                    to={`/servants/${s.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    View details →
                  </Link>
                </div>
              </MobileCard>
            ))}
          </div>

          <DataTable columns={['Servant', 'Agent', 'Status', 'Rating', 'Actions']}>
            {servants.map((s) => (
              <TableRow key={s.id}>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.user?.name} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-primary">{s.user?.name || 'Unnamed'}</span>
                        {s.verificationStatus === 'VERIFIED' && <VerifiedBadge />}
                      </div>
                      <p className="text-xs text-on-surface-variant">{s.user?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  {s.agent?.user?.name ? (
                    <span className="font-medium">{s.agent.user.name}</span>
                  ) : (
                    <span className="text-on-surface-variant">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <Badge status={s.verificationStatus} />
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                    {(s.rating ?? 0).toFixed(1)} ★
                  </span>
                </td>
                <td className="px-4 py-4">
                  <Link
                    to={`/servants/${s.id}`}
                    className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
                  >
                    View
                  </Link>
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
    </div>
  )
}
