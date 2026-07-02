import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import api from '../../lib/api'
import { LocationIcon } from '../../components/icons/LocationIcon'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import {
  PageHeader,
  StatCard,
  Avatar,
  ActivePill,
  TypePill,
  LoadingSkeleton,
  EmptyState,
  DataTable,
  TableRow,
  MobileCard,
} from '../../components/admin/adminUi'

function formatAmount(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-white/95 px-4 py-3 text-sm shadow-lg backdrop-blur-sm">
      <p className="font-semibold text-primary">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="mt-1 text-on-surface-variant">
          <span style={{ color: entry.color }}>{entry.name}:</span>{' '}
          <span className="font-medium text-on-background">
            {entry.name === 'Revenue'
              ? formatAmount(entry.value)
              : Number(entry.value || 0).toLocaleString('en-IN')}
          </span>
        </p>
      ))}
    </div>
  )
}

function SectionCard({ title, description, action, children, className = '' }) {
  return (
    <section className={`glass-card overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant/20 px-6 py-5">
        <div>
          <h3 className="text-lg font-semibold text-primary">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-on-surface-variant">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  )
}

function AgentRowCard({ agent }) {
  return (
    <MobileCard>
      <div className="flex items-start gap-3">
        <Avatar name={agent.user.name} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-primary">{agent.user.name}</p>
          <p className="truncate text-xs text-on-surface-variant">{agent.user.email}</p>
        </div>
        <ActivePill active={agent.user.isActive} />
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-on-surface-variant">Agency</span>
          <span className="font-medium">{agent.agencyName || '—'}</span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="shrink-0 text-on-surface-variant">Area</span>
          <span className="flex items-center gap-1.5 text-right font-medium">
            <LocationIcon size={14} className="shrink-0 text-secondary" />
            {agent.city || agent.address || '—'}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-on-surface-variant">Servants</span>
          <span className="font-semibold text-secondary">{agent._count?.servants ?? 0}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-on-surface-variant">Annual revenue</span>
          <span className="font-semibold text-amber-700">
            {formatAmount(agent.annualRevenue)}
          </span>
        </div>
      </div>
    </MobileCard>
  )
}

function BookingRowCard({ booking }) {
  return (
    <MobileCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-primary">
            {booking.houseOwner?.user?.name || 'Unknown owner'}
          </p>
          <p className="mt-0.5 text-sm text-on-surface-variant">
            → {booking.servant?.user?.name || 'Unassigned'}
          </p>
        </div>
        <Badge status={booking.status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TypePill type={booking.bookingType} />
        <span className="ml-auto text-sm font-semibold text-amber-700">
          {formatAmount(booking.totalAmount)}
        </span>
      </div>
    </MobileCard>
  )
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats')
      return res.data.data
    },
  })

  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ['admin-agents-dashboard'],
    queryFn: async () => {
      const res = await api.get('/admin/agents', { params: { limit: 10 } })
      return res.data.data.agents
    },
  })

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['admin-bookings-recent'],
    queryFn: async () => {
      const res = await api.get('/admin/bookings', { params: { limit: 10 } })
      return res.data.data.bookings
    },
  })

  const isLoading = statsLoading || agentsLoading || bookingsLoading
  const agentRows = agents || []
  const bookingRows = bookings || []

  const chartHasData = useMemo(() => {
    return (stats?.bookingsByMonth || []).some(
      (m) => Number(m.count) > 0 || Number(m.revenue) > 0,
    )
  }, [stats?.bookingsByMonth])

  const statCards = stats
    ? [
        {
          label: 'Total owners',
          value: stats.totalOwners?.toLocaleString('en-IN') ?? '0',
          icon: '🏠',
          accent: 'text-primary',
        },
        {
          label: 'Field agents',
          value: stats.totalAgents?.toLocaleString('en-IN') ?? '0',
          icon: '🗺',
          accent: 'text-secondary',
        },
        {
          label: 'Total servants',
          value: stats.totalServants?.toLocaleString('en-IN') ?? '0',
          icon: '👥',
          accent: 'text-violet-600',
        },
        {
          label: 'Verified servants',
          value: stats.verifiedServants?.toLocaleString('en-IN') ?? '0',
          icon: '✓',
          accent: 'text-emerald-600',
          sub: stats.totalServants
            ? `${Math.round((stats.verifiedServants / stats.totalServants) * 100)}% verified`
            : undefined,
        },
        {
          label: 'Total bookings',
          value: stats.totalBookings?.toLocaleString('en-IN') ?? '0',
          icon: '📅',
          accent: 'text-sky-600',
        },
        {
          label: 'Active bookings',
          value: stats.activeBookings?.toLocaleString('en-IN') ?? '0',
          icon: '⚡',
          accent: 'text-amber-600',
        },
        {
          label: 'Total revenue',
          value: formatAmount(stats.totalRevenue),
          icon: '₹',
          accent: 'text-amber-700',
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Platform health at a glance — users, agents, bookings, and revenue trends."
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/agents">
              <Button variant="secondary">Manage agents</Button>
            </Link>
            <Link to="/admin/bookings">
              <Button variant="gradient">View bookings</Button>
            </Link>
          </div>
        }
      />

      {isLoading ? (
        <LoadingSkeleton cards={4} rows={5} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.slice(0, 4).map((c) => (
              <StatCard key={c.label} {...c} />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {statCards.slice(4).map((c) => (
              <StatCard key={c.label} {...c} />
            ))}
          </div>

          <SectionCard
            title="Bookings & revenue"
            description="Last 12 months — volume and platform revenue."
          >
            {chartHasData ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={stats.bookingsByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: 16 }}
                    formatter={(value) => (
                      <span className="text-sm text-on-surface-variant">{value}</span>
                    )}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="count"
                    stroke="#1a6b4a"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#1a6b4a' }}
                    activeDot={{ r: 5 }}
                    name="Bookings"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#d97706' }}
                    activeDot={{ r: 5 }}
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant/40 bg-surface-low/50 px-6 py-14 text-center">
                <span className="text-4xl opacity-40" aria-hidden>
                  📈
                </span>
                <p className="mt-4 font-semibold text-primary">No booking activity yet</p>
                <p className="mt-2 max-w-sm text-sm text-on-surface-variant">
                  Trends will appear here once customers start placing bookings on the platform.
                </p>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Field agents by area"
            description="Top agents by coverage and onboarded servants."
            action={
              <Link to="/admin/agents">
                <Button variant="secondary" className="text-sm">
                  Manage agents →
                </Button>
              </Link>
            }
          >
            {agentRows.length === 0 ? (
              <EmptyState
                icon="🗺"
                title="No field agents yet"
                description="Add agents to cover areas and onboard servants nearby."
              />
            ) : (
              <>
                <div className="grid gap-4 lg:hidden">
                  {agentRows.map((a) => (
                    <AgentRowCard key={a.id} agent={a} />
                  ))}
                </div>
                <DataTable
                  columns={['Agent', 'Agency', 'Area', 'Servants', 'Annual revenue', 'Status']}
                >
                  {agentRows.map((a) => (
                    <TableRow key={a.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={a.user.name} />
                          <div>
                            <p className="font-medium text-primary">{a.user.name}</p>
                            <p className="text-xs text-on-surface-variant">{a.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {a.agencyName || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-[200px] items-center gap-1.5">
                          <LocationIcon size={14} className="shrink-0 text-secondary" />
                          <span className="truncate">{a.city || a.address || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-secondary">
                          {a._count?.servants ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-amber-700">
                        {formatAmount(a.annualRevenue)}
                      </td>
                      <td className="px-4 py-3">
                        <ActivePill active={a.user.isActive} />
                      </td>
                    </TableRow>
                  ))}
                </DataTable>
              </>
            )}
          </SectionCard>

          <SectionCard
            title="Recent bookings"
            description="Latest requests from house owners across the platform."
            action={
              <Link to="/admin/bookings">
                <Button variant="secondary" className="text-sm">
                  All bookings →
                </Button>
              </Link>
            }
          >
            {bookingRows.length === 0 ? (
              <EmptyState
                icon="📅"
                title="No bookings yet"
                description="New booking requests will show up here as customers use the platform."
              />
            ) : (
              <>
                <div className="grid gap-4 lg:hidden">
                  {bookingRows.map((b) => (
                    <BookingRowCard key={b.id} booking={b} />
                  ))}
                </div>
                <DataTable columns={['Owner', 'Servant', 'Type', 'Status', 'Amount']}>
                  {bookingRows.map((b) => (
                    <TableRow key={b.id}>
                      <td className="px-4 py-3 font-medium text-primary">
                        {b.houseOwner?.user?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {b.servant?.user?.name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <TypePill type={b.bookingType} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={b.status} />
                      </td>
                      <td className="px-4 py-3 font-semibold text-amber-700">
                        {formatAmount(b.totalAmount)}
                      </td>
                    </TableRow>
                  ))}
                </DataTable>
              </>
            )}
          </SectionCard>
        </>
      )}
    </div>
  )
}
