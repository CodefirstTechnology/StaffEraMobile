import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'

const API_HOST = 'http://localhost:5000'

const parseWorkingDays = (wd) => {
  if (!wd) return []
  if (Array.isArray(wd)) return wd
  try {
    const parsed = JSON.parse(wd)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return String(wd)
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)
  }
}

export default function ServantDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [idModal, setIdModal] = useState(false)

  const { data: servant, isLoading } = useQuery({
    queryKey: ['servant', id],
    queryFn: async () => {
      const res = await api.get(`/agent/servants/${id}`)
      return res.data.data.servant
    },
  })

  const verify = async (status, rejectionReason) => {
    await api.patch(`/agent/servants/${id}/verify`, {
      status,
      reason: rejectionReason,
    })
    qc.invalidateQueries({ queryKey: ['servant', id] })
    qc.invalidateQueries({ queryKey: ['agent-servants'] })
    setRejectOpen(false)
  }

  if (isLoading) return <p>Loading…</p>
  if (!servant) return <p>Not found</p>

  const canReview = ['PENDING', 'UNDER_REVIEW'].includes(
    servant.verificationStatus,
  )

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="flex gap-6 rounded-xl bg-surface p-6 shadow-sm">
          {servant.profilePhoto ? (
            <img
              src={`${API_HOST}${servant.profilePhoto}`}
              alt=""
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-2xl text-primary">
              {servant.user.name[0]}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold">{servant.user.name}</h2>
            <p className="text-subtext">{servant.user.email}</p>
            <p>{servant.user.phone}</p>
            <p className="mt-2">{servant.bio}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {servant.skills?.map((s) => (
                <span
                  key={s.id}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                >
                  {s.skillName}
                </span>
              ))}
            </div>
            {servant.zones?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {servant.zones.map((z) => (
                  <span
                    key={z.id}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-subtext"
                  >
                    {z.name}
                    {z.city ? ` · ${z.city}` : ''}
                  </span>
                ))}
              </div>
            )}
            {(servant.experience != null ||
              servant.hourlyRate != null ||
              servant.monthlyRate != null) && (
              <p className="mt-2 text-sm text-subtext">
                {servant.experience != null ? `${servant.experience} yrs exp` : ''}
                {servant.hourlyRate != null ? ` · ₹${servant.hourlyRate}/hr` : ''}
                {servant.monthlyRate != null ? ` · ₹${servant.monthlyRate}/mo` : ''}
              </p>
            )}
            {(servant.availableFrom || servant.availableTo) && servant.offersSession !== false && (
              <p className="text-sm text-subtext">
                Session: {servant.availableFrom || '—'} – {servant.availableTo || '—'}
              </p>
            )}
            {servant.offersMonthly !== false && (
              <>
                {servant.workingDays && (
                  <p className="text-sm text-subtext">
                    Monthly working days: {parseWorkingDays(servant.workingDays).join(', ') || '—'}
                  </p>
                )}
                {servant.hoursPerDay != null && (
                  <p className="text-sm text-subtext">{servant.hoursPerDay} hrs/day</p>
                )}
                {servant.availabilityNotes && (
                  <p className="text-sm text-subtext">{servant.availabilityNotes}</p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-surface p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Booking history</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-subtext">
                <th className="pb-2">Date</th>
                <th className="pb-2">Owner</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(servant.bookings || []).map((b) => (
                <tr key={b.id} className="border-b">
                  <td className="py-2">
                    {new Date(b.createdAt).toLocaleDateString()}
                  </td>
                  <td>{b.houseOwner?.user?.name}</td>
                  <td>{b.bookingType}</td>
                  <td>
                    <Badge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
        <h3 className="font-semibold">Verification</h3>
        <Badge status={servant.verificationStatus} />
        {servant.verifiedAt && (
          <p className="text-sm text-subtext">
            Verified: {new Date(servant.verifiedAt).toLocaleString()}
          </p>
        )}
        {servant.rejectionReason && (
          <p className="text-sm text-error">{servant.rejectionReason}</p>
        )}

        {servant.idProofUrl && (
          <button
            type="button"
            onClick={() => setIdModal(true)}
            className="text-sm text-primary underline"
          >
            View ID proof
          </button>
        )}

        {canReview && (
          <div className="space-y-2 pt-4">
            <Button
              variant="success"
              className="w-full"
              onClick={() => {
                if (window.confirm('Approve this servant?')) verify('VERIFIED')
              }}
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => verify('UNDER_REVIEW')}
            >
              Mark Under Review
            </Button>
            <Button
              variant="danger"
              className="w-full"
              onClick={() => setRejectOpen(true)}
            >
              Reject
            </Button>
          </div>
        )}
      </div>

      {idModal && servant.idProofUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setIdModal(false)}
        >
          <img
            src={`${API_HOST}${servant.idProofUrl}`}
            alt="ID"
            className="max-h-[90vh] rounded-lg"
          />
        </div>
      )}

      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-surface p-6">
            <h4 className="font-semibold">Rejection reason</h4>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 w-full rounded-lg border p-3"
              rows={4}
            />
            <div className="mt-4 flex gap-2">
              <Button variant="danger" onClick={() => verify('REJECTED', reason)}>
                Confirm Reject
              </Button>
              <Button variant="secondary" onClick={() => setRejectOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
