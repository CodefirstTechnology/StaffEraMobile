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
import { Badge } from '../../components/ui/Badge'

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats')
      return res.data.data
    },
  })

  const { data: bookings } = useQuery({
    queryKey: ['admin-bookings-recent'],
    queryFn: async () => {
      const res = await api.get('/admin/bookings', { params: { limit: 10 } })
      return res.data.data.bookings
    },
  })

  if (isLoading) return <p>Loading…</p>

  const cards = [
    { label: 'Total Owners', value: stats.totalOwners },
    { label: 'Total Servants', value: stats.totalServants },
    { label: 'Verified Servants', value: stats.verifiedServants },
    { label: 'Total Bookings', value: stats.totalBookings },
    { label: 'Active Bookings', value: stats.activeBookings },
    { label: 'Total Revenue', value: `₹${stats.totalRevenue?.toLocaleString()}` },
  ]

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-surface p-6 shadow-sm">
            <p className="text-sm text-subtext">{c.label}</p>
            <p className="mt-2 text-2xl font-bold text-primary">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-surface p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Bookings & Revenue (12 months)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.bookingsByMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="count" stroke="#1a6b4a" name="Bookings" />
            <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#f5a623" name="Revenue" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl bg-surface p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Recent bookings</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-subtext">
              <th className="pb-2">Owner</th>
              <th className="pb-2">Servant</th>
              <th className="pb-2">Type</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(bookings || []).map((b) => (
              <tr key={b.id} className="border-b">
                <td className="py-2">{b.houseOwner?.user?.name}</td>
                <td>{b.servant?.user?.name}</td>
                <td>{b.bookingType}</td>
                <td>
                  <Badge status={b.status} />
                </td>
                <td>₹{b.totalAmount || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
