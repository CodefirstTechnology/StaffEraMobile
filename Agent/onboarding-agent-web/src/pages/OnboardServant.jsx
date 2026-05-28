import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { Button } from '../components/ui/Button'

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

export default function OnboardServant() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'Servant@123',
    bio: '',
    experience: '',
    hourlyRate: '',
    monthlyRate: '',
    availableFrom: '09:00',
    availableTo: '18:00',
    workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
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

  const submit = async () => {
    setError('')
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'skills' || k === 'workingDays') fd.append(k, JSON.stringify(v))
      else fd.append(k, String(v))
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
          {['name', 'email', 'phone', 'password'].map((f) => (
            <input
              key={f}
              placeholder={f}
              value={form[f]}
              onChange={(e) => update(f, e.target.value)}
              type={f === 'password' ? 'password' : 'text'}
              className="w-full rounded-lg border px-3 py-2"
            />
          ))}
        </div>
      )}

      {step === 2 && (
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
            placeholder="Bio"
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
      )}

      {step === 3 && (
        <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
          <h3 className="font-semibold">Availability</h3>
          <input
            type="time"
            value={form.availableFrom}
            onChange={(e) => update('availableFrom', e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
          />
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
      )}

      {step === 4 && (
        <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
          <h3 className="font-semibold">ID Verification</h3>
          <select
            value={form.idProofType}
            onChange={(e) => update('idProofType', e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
          >
            {['AADHAR', 'PAN', 'PASSPORT', 'VOTER_ID'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <label className="block">
            <span className="text-sm">ID Proof</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setIdProof(e.target.files[0])}
              className="mt-1 w-full"
            />
          </label>
          <label className="block">
            <span className="text-sm">Profile Photo</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProfilePhoto(e.target.files[0])}
              className="mt-1 w-full"
            />
          </label>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
          <h3 className="font-semibold">Review & Submit</h3>
          <pre className="overflow-auto rounded bg-gray-50 p-4 text-xs">
            {JSON.stringify(form, null, 2)}
          </pre>
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
        {step < 5 && (
          <Button onClick={() => setStep((s) => s + 1)}>Next</Button>
        )}
      </div>
    </div>
  )
}
