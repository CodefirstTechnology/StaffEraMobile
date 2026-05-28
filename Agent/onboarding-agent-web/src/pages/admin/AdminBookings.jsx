import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { Badge } from '../../components/ui/Badge'

export default function AdminBookings() {
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bookings', status, type],
    queryFn: async () => {
      const res = await api.get('/admin/bookings', {
        params: {
          status: status || undefined,
          type: type || undefined,
        },
      })
      return res.data.data.bookings
    },
  })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">All Bookings</h2>
      <div className="flex gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'REJECTED'].map(
            (s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ),
          )}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="MONTHLY">Monthly</option>
          <option value="SESSION">Session</option>
        </select>
      </div>
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <table className="w-full rounded-xl bg-surface text-sm shadow-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-4 text-left">ID</th>
              <th className="p-4 text-left">Owner</th>
              <th className="p-4 text-left">Servant</th>
              <th className="p-4 text-left">Type</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((b) => (
              <tr key={b.id} className="border-b">
                <td className="p-4">#{b.id}</td>
                <td className="p-4">{b.houseOwner?.user?.name}</td>
                <td className="p-4">{b.servant?.user?.name}</td>
                <td className="p-4">{b.bookingType}</td>
                <td className="p-4">
                  <Badge status={b.status} />
                </td>
                <td className="p-4">₹{b.totalAmount || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
