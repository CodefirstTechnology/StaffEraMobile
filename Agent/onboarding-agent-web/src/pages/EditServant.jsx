import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import api from '../lib/api'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useSkills } from '../hooks/useSkills'
import { uploadUrl } from '../lib/mediaUrl'

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const ID_TYPES = ['AADHAR', 'PAN', 'PASSPORT', 'VOTER_ID']

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  )
}

function FieldLabel({ children }) {
  return <span className="text-sm font-medium text-gray-700">{children}</span>
}

function inputClassName() {
  return 'w-full rounded-lg border px-3 py-2'
}

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
  const { data: skills = [], isLoading: skillsLoading } = useSkills()
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
    hoursPerDay: '',
    availabilityNotes: '',
    offersSession: true,
    offersMonthly: true,
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
      hoursPerDay: servant.hoursPerDay ?? '',
      availabilityNotes: servant.availabilityNotes || '',
      offersSession: servant.offersSession ?? true,
      offersMonthly: servant.offersMonthly ?? true,
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
    if (!form.offersSession && !form.offersMonthly) {
      setError('Select at least one booking type: Session or Monthly')
      return
    }
    setSaving(true)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'skills' || k === 'workingDays') {
        fd.append(k, JSON.stringify(v))
      } else if (typeof v === 'boolean') {
        fd.append(k, v ? 'true' : 'false')
      } else if (v !== '' && v !== null && v !== undefined) {
        fd.append(k, String(v))
      }
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
        <Field label="Full name">
          <input
            placeholder="Enter full name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className={inputClassName()}
          />
        </Field>
        <Field label="Email">
          <input
            value={servant.user?.email || ''}
            readOnly
            className={`${inputClassName()} bg-gray-50 text-subtext`}
          />
        </Field>
        <Field label="Phone">
          <input
            placeholder="Enter mobile number"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            className={inputClassName()}
          />
        </Field>
      </div>

      <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
        <h3 className="font-semibold">Skills & Rates</h3>
        <div className="space-y-1.5">
          <FieldLabel>Skills</FieldLabel>
          {skillsLoading ? (
            <p className="text-sm text-subtext">Loading skills…</p>
          ) : skills.length === 0 ? (
            <p className="text-sm text-subtext">No skills available.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <label key={s.code} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.skills.includes(s.code)}
                    onChange={() => toggleSkill(s.code)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          )}
        </div>
        <Field label="Years of experience">
          <input
            placeholder="e.g. 3"
            type="number"
            value={form.experience}
            onChange={(e) => update('experience', e.target.value)}
            className={inputClassName()}
          />
        </Field>
        <Field label="Bio">
          <textarea
            placeholder="Short description about the servant"
            value={form.bio}
            onChange={(e) => update('bio', e.target.value)}
            className={inputClassName()}
            rows={3}
          />
        </Field>
        <Field label="Hourly rate (₹)">
          <input
            placeholder="e.g. 150"
            type="number"
            value={form.hourlyRate}
            onChange={(e) => update('hourlyRate', e.target.value)}
            className={inputClassName()}
          />
        </Field>
        <Field label="Monthly rate (₹)">
          <input
            placeholder="e.g. 15000"
            type="number"
            value={form.monthlyRate}
            onChange={(e) => update('monthlyRate', e.target.value)}
            className={inputClassName()}
          />
        </Field>
      </div>

      <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
        <h3 className="font-semibold">Availability</h3>
        <p className="text-sm text-subtext">
          Choose which booking types this servant accepts and set the schedule for each.
        </p>

        <div className="space-y-2">
          <FieldLabel>Booking types offered</FieldLabel>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.offersSession}
                onChange={(e) => update('offersSession', e.target.checked)}
              />
              Session (one visit)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.offersMonthly}
                onChange={(e) => update('offersMonthly', e.target.checked)}
              />
              Monthly contract
            </label>
          </div>
        </div>

        {form.offersSession && (
          <div className="space-y-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <h4 className="text-sm font-semibold text-gray-700">Session</h4>
            <Field label="Session start time">
              <input
                type="time"
                value={form.availableFrom}
                onChange={(e) => update('availableFrom', e.target.value)}
                className={inputClassName()}
              />
            </Field>
            <Field label="Session end time">
              <input
                type="time"
                value={form.availableTo}
                onChange={(e) => update('availableTo', e.target.value)}
                className={inputClassName()}
              />
            </Field>
          </div>
        )}

        {form.offersMonthly && (
          <div className="space-y-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <h4 className="text-sm font-semibold text-gray-700">Monthly</h4>
            <div className="space-y-1.5">
              <FieldLabel>Working days</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`rounded-full px-3 py-1 text-sm ${
                      form.workingDays.includes(d)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Hours per day">
              <input
                type="number"
                min="1"
                max="24"
                placeholder="e.g. 8"
                value={form.hoursPerDay}
                onChange={(e) => update('hoursPerDay', e.target.value)}
                className={inputClassName()}
              />
            </Field>
            <Field label="Monthly availability notes">
              <textarea
                placeholder="e.g. Second Saturday off, half day on Friday…"
                value={form.availabilityNotes}
                onChange={(e) => update('availabilityNotes', e.target.value)}
                className={inputClassName()}
                rows={3}
              />
            </Field>
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
        <h3 className="font-semibold">ID & Documents</h3>
        <Field label="ID proof type">
          <select
            value={form.idProofType}
            onChange={(e) => update('idProofType', e.target.value)}
            className={inputClassName()}
          >
            {ID_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </Field>
        {servant.idProofUrl && (
          <div className="space-y-1.5">
            <FieldLabel>Current ID proof</FieldLabel>
            <a
              href={uploadUrl(servant.idProofUrl)}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary underline"
            >
              View current ID proof
            </a>
          </div>
        )}
        <Field label="Replace ID proof">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setIdProof(e.target.files?.[0] || null)}
            className="w-full text-sm"
          />
        </Field>
        {servant.profilePhoto && (
          <div className="space-y-1.5">
            <FieldLabel>Current profile photo</FieldLabel>
            <img
              src={uploadUrl(servant.profilePhoto)}
              alt=""
              className="h-20 w-20 rounded-full object-cover"
            />
          </div>
        )}
        <Field label="Replace profile photo">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
            className="w-full text-sm"
          />
        </Field>
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
