import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import {
  PageHeader,
  StatCard,
  Avatar,
  TypePill,
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
  ['PENDING', 'Pending'],
  ['CONFIRMED', 'Confirmed'],
  ['ACTIVE', 'Active'],
  ['COMPLETED', 'Completed'],
  ['CANCELLED', 'Cancelled'],
  ['REJECTED', 'Rejected'],
]

const TYPE_OPTIONS = [
  ['', 'All types'],
  ['MONTHLY', 'Monthly'],
  ['SESSION', 'Session'],
]

function formatAmount(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

import { Pagination } from '../../components/ui/Pagination'

export default function AdminBookings() {
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus)
    setPage(1)
  }

  const handleTypeChange = (newType) => {
    setType(newType)
    setPage(1)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bookings', status, type, page, limit],
    queryFn: async () => {
      const res = await api.get('/admin/bookings', {
        params: {
          status: status || undefined,
          type: type || undefined,
          page,
          limit,
        },
      })
      return res.data.data
    },
  })

  const { data: allBookingsData } = useQuery({
    queryKey: ['admin-bookings-all'],
    queryFn: async () => {
      const res = await api.get('/admin/bookings', {
        params: { limit: 1000 },
      })
      return res.data.data.bookings
    },
  })

  const bookings = data?.bookings || []
  const total = data?.pagination?.total ?? bookings.length
  const allBookings = allBookingsData || []

  const stats = useMemo(() => {
    const revenue = allBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0)
    const active = allBookings.filter((b) =>
      ['PENDING', 'CONFIRMED', 'ACTIVE'].includes(b.status),
    ).length
    const completed = allBookings.filter((b) => b.status === 'COMPLETED').length
    return { total: allBookings.length, active, completed, revenue }
  }, [allBookings])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        description="All house-owner requests across the platform — sessions and monthly contracts."
      />

      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total bookings" value={stats.total} />
          <StatCard label="In progress" value={stats.active} accent="text-sky-600" />
          <StatCard label="Completed" value={stats.completed} accent="text-emerald-600" />
          <StatCard
            label="Listed value"
            value={formatAmount(stats.revenue)}
            accent="text-amber-700"
          />
        </div>
      )}

      <FilterBar
        count={total}
        countLabel="total bookings"
      >
        <SelectFilter value={status} onChange={handleStatusChange} options={STATUS_OPTIONS} />
        <SelectFilter value={type} onChange={handleTypeChange} options={TYPE_OPTIONS} />
      </FilterBar>

      {isLoading ? (
        <LoadingSkeleton cards={4} rows={5} />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon="📅"
          title="No bookings found"
          description="Adjust filters or check back when customers place new requests."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:hidden">
            {bookings.map((b) => (
              <MobileCard key={b.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                      Booking #{b.id}
                    </p>
                    <p className="mt-1 font-semibold text-primary">
                      {b.houseOwner?.user?.name || 'Unknown owner'}
                    </p>
                  </div>
                  <Badge status={b.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <TypePill type={b.bookingType} />
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                    {formatAmount(b.totalAmount)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-on-surface-variant">
                  Helper:{' '}
                  <span className="font-medium text-on-background">
                    {b.servant?.user?.name || 'Unassigned'}
                  </span>
                </p>
              </MobileCard>
            ))}
          </div>

          <DataTable
            columns={['ID', 'House owner', 'Servant', 'Type', 'Status', 'Amount']}
          >
            {bookings.map((b) => (
              <TableRow key={b.id}>
                <td className="px-4 py-4 font-mono text-xs font-semibold text-secondary">
                  #{b.id}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Avatar name={b.houseOwner?.user?.name} variant="soft" />
                    <span className="font-medium">
                      {b.houseOwner?.user?.name || '—'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  {b.servant?.user?.name ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={b.servant.user.name} variant="soft" />
                      <span>{b.servant.user.name}</span>
                    </div>
                  ) : (
                    <span className="text-on-surface-variant">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <TypePill type={b.bookingType} />
                </td>
                <td className="px-4 py-4">
                  <Badge status={b.status} />
                </td>
                <td className="px-4 py-4 font-semibold text-amber-700">
                  {formatAmount(b.totalAmount)}
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
