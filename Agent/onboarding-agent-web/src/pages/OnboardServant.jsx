import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { Button } from '../components/ui/Button'
import { useSkills } from '../hooks/useSkills'
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

const PERSONAL_FIELDS = [
  { key: 'name', label: 'Full name', placeholder: 'Enter full name', type: 'text' },
  { key: 'email', label: 'Email', placeholder: 'Enter email address', type: 'email' },
  { key: 'phone', label: 'Phone', placeholder: 'Enter mobile number', type: 'tel' },
  { key: 'password', label: 'Password', placeholder: 'Create login password', type: 'password' },
]

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

function ReviewItem({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="w-36 shrink-0 text-sm text-subtext">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  )
}

function ReviewSection({ title, children }) {
  return (
    <section className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
      <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
      <dl className="space-y-2">{children}</dl>
    </section>
  )
}

function ReviewChips({ items }) {
  if (!items?.length) return <span className="text-subtext">—</span>
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
        >
          {item.replace(/_/g, ' ')}
        </span>
      ))}
    </div>
  )
}

export default function OnboardServant() {
  const navigate = useNavigate()
  const { data: skills = [], isLoading: skillsLoading } = useSkills()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    bio: '',
    experience: '',
    hourlyRate: '',
    monthlyRate: '',
    availableFrom: '09:00',
    availableTo: '18:00',
    workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    hoursPerDay: '8',
    availabilityNotes: '',
    offersSession: true,
    offersMonthly: true,
    skills: [],
    idProofType: 'AADHAR',
  })
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [idProof, setIdProof] = useState(null)

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

  const validateDocuments = () => {
    if (!idProof) {
      setError('ID proof document is required (JPEG, PNG, or WebP, max 5 MB)')
      return false
    }
    if (!profilePhoto) {
      setError('Profile photo is required (JPEG, PNG, or WebP, max 5 MB)')
      return false
    }
    return true
  }

  const goNext = () => {
    setError('')
    if (step === 4 && !validateDocuments()) return
    setStep((s) => s + 1)
  }

  const submit = async () => {
    setError('')
    if (!form.offersSession && !form.offersMonthly) {
      setError('Select at least one booking type: Session or Monthly')
      return
    }
    if (!validateDocuments()) return
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'skills' || k === 'workingDays') {
        fd.append(k, JSON.stringify(v))
      } else if (typeof v === 'boolean') {
        fd.append(k, v ? 'true' : 'false')
      } else {
        fd.append(k, String(v))
      }
    })
    if (profilePhoto) fd.append('profilePhoto', profilePhoto)
    if (idProof) fd.append('idProof', idProof)

    try {
      const res = await api.post('/agent/servants', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      navigate(`/servants/${res.data.data.servant.id}`)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create servant')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">Onboard New Servant</h2>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded ${step >= s ? 'bg-primary' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
          <h3 className="font-semibold">Personal Info</h3>
          {PERSONAL_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <input
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={(e) => update(f.key, e.target.value)}
                type={f.type}
                className={inputClassName()}
              />
            </Field>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
          <h3 className="font-semibold">Skills & Rates</h3>
          <div className="space-y-1.5">
            <FieldLabel>Skills</FieldLabel>
            {skillsLoading ? (
              <p className="text-sm text-subtext">Loading skills…</p>
            ) : skills.length === 0 ? (
              <p className="text-sm text-subtext">
                No skills available. Ask an admin to add skills first.
              </p>
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
      )}

      {step === 3 && (
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
      )}

      {step === 4 && (
        <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
          <h3 className="font-semibold">ID Verification</h3>
          <p className="text-sm text-subtext">
            Images are stored on the server; only the file path is saved in the
            database.
          </p>
          {error && <p className="text-error text-sm">{error}</p>}
          <Field label="ID proof type">
            <select
              value={form.idProofType}
              onChange={(e) => update('idProofType', e.target.value)}
              className={inputClassName()}
            >
              {['AADHAR', 'PAN', 'PASSPORT', 'VOTER_ID'].map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ID proof document (required)">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={(e) => setIdProof(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
          </Field>
          <Field label="Profile photo (required)">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
          </Field>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
          <h3 className="font-semibold">Review & Submit</h3>
          <p className="text-sm text-subtext">
            Please confirm the details below before submitting.
          </p>

          <ReviewSection title="Personal Info">
            <ReviewItem label="Name">{form.name || '—'}</ReviewItem>
            <ReviewItem label="Email">{form.email || '—'}</ReviewItem>
            <ReviewItem label="Phone">{form.phone || '—'}</ReviewItem>
            <ReviewItem label="Password">
              {form.password ? '•'.repeat(Math.min(form.password.length, 8)) : '—'}
            </ReviewItem>
          </ReviewSection>

          <ReviewSection title="Skills & Rates">
            <ReviewItem label="Skills">
              <ReviewChips
                items={form.skills.map(
                  (code) =>
                    skills.find((s) => s.code === code)?.label ||
                    code.replace(/_/g, ' '),
                )}
              />
            </ReviewItem>
            <ReviewItem label="Experience">
              {form.experience ? `${form.experience} year(s)` : '—'}
            </ReviewItem>
            <ReviewItem label="Bio">{form.bio || '—'}</ReviewItem>
            <ReviewItem label="Hourly rate">
              {form.hourlyRate ? `₹${form.hourlyRate}/hr` : '—'}
            </ReviewItem>
            <ReviewItem label="Monthly rate">
              {form.monthlyRate ? `₹${form.monthlyRate}/mo` : '—'}
            </ReviewItem>
          </ReviewSection>

          <ReviewSection title="Availability">
            <ReviewItem label="Booking types">
              {[
                form.offersSession && 'Session',
                form.offersMonthly && 'Monthly',
              ]
                .filter(Boolean)
                .join(', ') || '—'}
            </ReviewItem>
            {form.offersSession && (
              <ReviewItem label="Session hours">
                {form.availableFrom && form.availableTo
                  ? `${form.availableFrom} – ${form.availableTo}`
                  : '—'}
              </ReviewItem>
            )}
            {form.offersMonthly && (
              <>
                <ReviewItem label="Working days">
                  <ReviewChips items={form.workingDays} />
                </ReviewItem>
                <ReviewItem label="Hours per day">
                  {form.hoursPerDay || '—'}
                </ReviewItem>
                <ReviewItem label="Notes">
                  {form.availabilityNotes || '—'}
                </ReviewItem>
              </>
            )}
          </ReviewSection>

          <ReviewSection title="ID Verification">
            <ReviewItem label="ID type">
              {form.idProofType?.replace(/_/g, ' ') || '—'}
            </ReviewItem>
            <ReviewItem label="ID proof">
              {idProof?.name || 'Not uploaded'}
            </ReviewItem>
            <ReviewItem label="Profile photo">
              {profilePhoto?.name || 'Not uploaded'}
            </ReviewItem>
          </ReviewSection>

          {error && <p className="text-error text-sm">{error}</p>}
          <Button onClick={submit}>Submit</Button>
        </div>
      )}

      <div className="flex justify-between">
        <Button
          variant="secondary"
          disabled={step === 1}
          onClick={() => setStep((s) => s - 1)}
        >
          Back
        </Button>
        {step < 5 && <Button onClick={goNext}>Next</Button>}
      </div>
    </div>
  )
}
