import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

const API_HOST = import.meta.env.VITE_API_HOST || 'http://localhost:5000'

const SKILLS = [
  'COOKING',
  'CLEANING',
  'CHILDCARE',
  'DRIVING',
  'LAUNDRY',
  'ELDERLY_CARE',
  'GARDENING',
]
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const ID_TYPES = ['AADHAR', 'PAN', 'PASSPORT', 'VOTER_ID']

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

export default function EditServant() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [idProof, setIdProof] = useState(null)

  const { data: servant, isLoading } = useQuery({
    queryKey: ['servant', id],
    queryFn: async () => {
      const res = await api.get(`/agent/servants/${id}`)
      return res.data.data.servant
    },
  })

  const [form, setForm] = useState({
    name: '',
    phone: '',
    bio: '',
    experience: '',
    hourlyRate: '',
    monthlyRate: '',
    availableFrom: '09:00',
    availableTo: '18:00',
    workingDays: [],
    skills: [],
    idProofType: 'AADHAR',
  })

  useEffect(() => {
    if (!servant) return
    setForm({
      name: servant.user?.name || '',
      phone: servant.user?.phone || '',
      bio: servant.bio || '',
      experience: servant.experience ?? '',
      hourlyRate: servant.hourlyRate ?? '',
      monthlyRate: servant.monthlyRate ?? '',
      availableFrom: servant.availableFrom || '09:00',
      availableTo: servant.availableTo || '18:00',
      workingDays: parseWorkingDays(servant.workingDays),
      skills: servant.skills?.map((s) => s.skillName) || [],
      idProofType: servant.idProofType || 'AADHAR',
    })
  }, [servant])

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }))
  const toggleSkill = (s) =>
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(s)
        ? f.skills.filter((x) => x !== s)
        : [...f.skills, s],
    }))
  const toggleDay = (d) =>
    setForm((f) => ({
      ...f,
      workingDays: f.workingDays.includes(d)
        ? f.workingDays.filter((x) => x !== d)
        : [...f.workingDays, d],
    }))

  const save = async () => {
    setError('')
    setSaving(true)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'skills' || k === 'workingDays') fd.append(k, JSON.stringify(v))
      else if (v !== '' && v !== null && v !== undefined) fd.append(k, String(v))
    })
    if (profilePhoto) fd.append('profilePhoto', profilePhoto)
    if (idProof) fd.append('idProof', idProof)

    try {
      await api.patch(`/agent/servants/${id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      navigate(`/servants/${id}`)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update servant')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !servant) return <p>Loading…</p>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">Edit Servant</h2>

      <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
        <h3 className="font-semibold">Personal Info</h3>
        <input
          placeholder="Full name"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />
        <input
          placeholder="Email (read-only)"
          value={servant.user?.email || ''}
          readOnly
          className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-subtext"
        />
        <input
          placeholder="Mobile number"
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />
      </div>

      <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
        <h3 className="font-semibold">Skills & Rates</h3>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.skills.includes(s)}
                onChange={() => toggleSkill(s)}
              />
              {s}
            </label>
          ))}
        </div>
        <input
          placeholder="Years of experience"
          type="number"
          value={form.experience}
          onChange={(e) => update('experience', e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />
        <textarea
          placeholder="Bio / description"
          value={form.bio}
          onChange={(e) => update('bio', e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
          rows={3}
        />
        <input
          placeholder="Hourly rate"
          type="number"
          value={form.hourlyRate}
          onChange={(e) => update('hourlyRate', e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />
        <input
          placeholder="Monthly rate"
          type="number"
          value={form.monthlyRate}
          onChange={(e) => update('monthlyRate', e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />
      </div>

      <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
        <h3 className="font-semibold">Availability</h3>
        <label className="block text-sm text-subtext">Available from</label>
        <input
          type="time"
          value={form.availableFrom}
          onChange={(e) => update('availableFrom', e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />
        <label className="block text-sm text-subtext">Available to</label>
        <input
          type="time"
          value={form.availableTo}
          onChange={(e) => update('availableTo', e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              className={`rounded-full px-3 py-1 text-sm ${form.workingDays.includes(d) ? 'bg-primary text-white' : 'bg-gray-100'}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
        <h3 className="font-semibold">ID & Documents</h3>
        <select
          value={form.idProofType}
          onChange={(e) => update('idProofType', e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        >
          {ID_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {servant.idProofUrl && (
          <a
            href={`${API_HOST}${servant.idProofUrl}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary underline"
          >
            View current ID proof
          </a>
        )}
        <label className="block">
          <span className="text-sm">Replace ID proof</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setIdProof(e.target.files?.[0] || null)}
            className="mt-1 w-full"
          />
        </label>
        {servant.profilePhoto && (
          <img
            src={`${API_HOST}${servant.profilePhoto}`}
            alt=""
            className="h-20 w-20 rounded-full object-cover"
          />
        )}
        <label className="block">
          <span className="text-sm">Replace profile photo</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
            className="mt-1 w-full"
          />
        </label>
      </div>

      <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
        <h3 className="font-semibold">Status (read-only)</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-subtext">Verification:</span>
          <Badge status={servant.verificationStatus} />
        </div>
        <p className="text-sm text-subtext">
          Rating: ★ {servant.rating?.toFixed(1) || '0.0'} ({servant.totalRatings || 0}{' '}
          reviews)
        </p>
        {servant.verifiedAt && (
          <p className="text-sm text-subtext">
            Verified: {new Date(servant.verifiedAt).toLocaleString()}
          </p>
        )}
        {servant.rejectionReason && (
          <p className="text-sm text-error">Rejection: {servant.rejectionReason}</p>
        )}
      </div>

      {(servant.zones?.length > 0) && (
        <div className="space-y-2 rounded-xl bg-surface p-6 shadow-sm">
          <h3 className="font-semibold">Service zones</h3>
          <p className="text-xs text-subtext">
            Managed by the servant in the Servant app
          </p>
          <div className="flex flex-wrap gap-2">
            {servant.zones.map((z) => (
              <span
                key={z.id}
                className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
              >
                {z.name}
                {z.city ? ` · ${z.city}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="secondary" onClick={() => navigate(`/servants/${id}`)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
