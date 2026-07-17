import { useParams, useNavigate, useBlocker, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useMemo } from 'react'
import api from '../lib/api'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { LoginPasswordFields } from '../components/LoginPasswordFields'
import { validateServantPassword } from '../lib/generatePassword'
import { SkillDropdown } from '../components/SkillDropdown'
import { useSkills } from '../hooks/useSkills'
import { uploadUrl } from '../lib/mediaUrl'
import {
  BankDetailsFields,
  EMPTY_BANK_FORM,
  validateBankDetails,
} from '../components/BankDetailsFields'
import { AadhaarXmlVerify } from '../components/AadhaarXmlVerify'
import { ServiceZonesEditor } from '../components/ServiceZonesEditor'
import { useToast } from '../context/ToastContext'
import { copyText } from '../lib/copyToClipboard'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { validatePhoneRequired, digitsOnlyPhone } from '../lib/phone'
import {
  emptySkillsRateErrors,
  sanitizeNonNegativeInput,
  validateSkillsRateFields,
  SKILLS_RATE_FIELDS,
} from '../lib/nonNegativeNumber'

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const ID_TYPES = ['AADHAR', 'PAN', 'PASSPORT', 'VOTER_ID']

const TIME_12_OPTIONS = (() => {
  const options = []
  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  for (let h of hours) {
    for (let m of ['00', '30']) {
      options.push(`${String(h).padStart(2, '0')}:${m}`)
    }
  }
  return options
})()

const parseTimeTo12Hour = (timeStr) => {
  if (!timeStr) return { time12: '09:00', period: 'AM' }
  const [hStr, mStr] = timeStr.split(':')
  let h = Number(hStr)
  const m = mStr || '00'
  if (isNaN(h)) return { time12: '09:00', period: 'AM' }
  const period = h < 12 ? 'AM' : 'PM'
  let h12 = h % 12
  if (h12 === 0) h12 = 12
  const time12 = `${String(h12).padStart(2, '0')}:${m}`
  return { time12, period }
}

const formatTo24Hour = (time12, period) => {
  if (!time12) return '09:00'
  const [hStr, mStr] = time12.split(':')
  let h = Number(hStr)
  const m = mStr || '00'
  if (period === 'PM' && h < 12) {
    h += 12
  } else if (period === 'AM' && h === 12) {
    h = 0
  }
  return `${String(h).padStart(2, '0')}:${m}`
}

function TimePicker({ value, onChange, className }) {
  const { time12, period } = parseTimeTo12Hour(value)

  const get12HourOptions = () => {
    const options = [...TIME_12_OPTIONS]
    if (time12 && !options.includes(time12)) {
      options.push(time12)
      options.sort((a, b) => {
        const parse = (t) => {
          const [h, sm] = t.split(':').map(Number)
          return (h === 12 ? 0 : h) * 60 + sm
        }
        return parse(a) - parse(b)
      })
    }
    return options
  }

  const handleTimeChange = (newTime12) => {
    onChange(formatTo24Hour(newTime12, period))
  }

  const handlePeriodChange = (newPeriod) => {
    onChange(formatTo24Hour(time12, newPeriod))
  }

  const isInvalid = className?.includes('border-error')
  const borderClass = isInvalid ? 'border-error' : 'border-gray-200'

  return (
    <div className="flex gap-2 max-w-xs">
      <select
        value={time12}
        onChange={(e) => handleTimeChange(e.target.value)}
        className={`flex-1 rounded-lg border ${borderClass} px-3 py-2 bg-white`}
      >
        {get12HourOptions().map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <select
        value={period}
        onChange={(e) => handlePeriodChange(e.target.value)}
        className={`w-28 shrink-0 rounded-lg border ${borderClass} px-3 py-2 bg-white`}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  )
}

const calculateHours = (start, end) => {
  if (!start || !end) return '0'
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return '0'
  let diffMin = (eh * 60 + em) - (sh * 60 + sm)
  if (diffMin <= 0) {
    diffMin += 24 * 60
  }
  const hours = diffMin / 60
  return String(Math.round(hours * 10) / 10)
}

function Field({ label, required, children }) {
  return (
    <div className="block space-y-1.5">
      <span className="text-sm font-medium text-gray-700">
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </span>
      {children}
    </div>
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
  const [savedCredentials, setSavedCredentials] = useState(null)
  const [loginPassword, setLoginPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [idProof, setIdProof] = useState(null)
  const [bankAccountConfirm, setBankAccountConfirm] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [skillsRateErrors, setSkillsRateErrors] = useState(emptySkillsRateErrors)
  const [loginPasswordError, setLoginPasswordError] = useState('')
  const [copied, setCopied] = useState(false)
  const toast = useToast()

  const { data: servant, isLoading } = useQuery({
    queryKey: ['servant', id],
    queryFn: async () => {
      const res = await api.get(`/agent/servants/${id}`)
      return res.data.data.servant
    },
  })

  const [countryCode, setCountryCode] = useState('+91')

  const reactLocation = useLocation()

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
    address: '',
    idProofType: 'AADHAR',
    ...EMPTY_BANK_FORM,
  })

  const isFormDirty = useMemo(() => {
    if (!servant) return false
    const initialName = servant.user?.name || ''
    let initialPhoneVal = servant.user?.phone || ''
    if (initialPhoneVal.startsWith('91') && initialPhoneVal.length > 10) {
      initialPhoneVal = initialPhoneVal.substring(2)
    } else if (initialPhoneVal.startsWith('+91')) {
      initialPhoneVal = initialPhoneVal.substring(3)
    }
    
    return (
      form.name !== initialName ||
      form.phone !== initialPhoneVal ||
      form.bio !== (servant.bio || '') ||
      form.experience !== (servant.experience ?? '') ||
      form.hourlyRate !== (servant.hourlyRate ?? '') ||
      form.monthlyRate !== (servant.monthlyRate ?? '') ||
      form.address !== (servant.address || '') ||
      form.availabilityNotes !== (servant.availabilityNotes || '') ||
      profilePhoto !== null ||
      idProof !== null
    )
  }, [form, servant, profilePhoto, idProof])

  const blocker = useBlocker(
    ({ nextLocation }) =>
      isFormDirty && !saving && nextLocation.pathname !== reactLocation.pathname
  )

  useEffect(() => {
    if (!servant) return
    let phoneVal = servant.user?.phone || ''
    let ccVal = servant.user?.phoneCountryCode || '+91'
    setCountryCode(ccVal)
    setForm({
      name: servant.user?.name || '',
      phone: phoneVal,
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
      address: servant.address || '',
      idProofType: servant.idProofType || 'AADHAR',
      bankAccountHolder: servant.bankAccountHolder || '',
      bankAccountNumber: '',
      bankName: servant.bankName || '',
      bankIfsc: servant.bankIfsc || '',
      bankUpiId: servant.bankUpiId || '',
    })
  }, [servant])

  useEffect(() => {
    if (form.availableFrom && form.availableTo) {
      const calculated = calculateHours(form.availableFrom, form.availableTo)
      setForm((f) => {
        if (f.hoursPerDay !== calculated) {
          return { ...f, hoursPerDay: calculated }
        }
        return f
      })
    }
  }, [form.availableFrom, form.availableTo])

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }))
  const toggleDay = (d) =>
    setForm((f) => ({
      ...f,
      workingDays: f.workingDays.includes(d)
        ? f.workingDays.filter((x) => x !== d)
        : [...f.workingDays, d],
    }))

  const save = async () => {
    setError('')
    const phoneErr = validatePhoneRequired(form.phone, countryCode)
    if (phoneErr) {
      setPhoneError(phoneErr)
      return
    }
    setPhoneError('')
    if (form.bio && form.bio.length > 500) {
      setError('Bio cannot exceed 500 characters')
      return
    }
    if (form.address && form.address.length > 500) {
      setError('Address cannot exceed 500 characters')
      return
    }
    if (form.availabilityNotes && form.availabilityNotes.length > 500) {
      setError('Availability notes cannot exceed 500 characters')
      return
    }
    const rateErrors = validateSkillsRateFields(form, { required: false })
    setSkillsRateErrors(rateErrors)
    if (Object.values(rateErrors).some(Boolean)) return
    if (!form.offersSession && !form.offersMonthly) {
      setError('Select at least one booking type: Session or Monthly')
      return
    }
    if (form.offersMonthly && (!form.workingDays || form.workingDays.length === 0)) {
      setError('Select at least one working day for Monthly bookings')
      return
    }
    const bankErr = validateBankDetails(form, bankAccountConfirm, {
      existingAccountNumber: servant?.bankAccountNumber,
    })
    if (bankErr) {
      setError(bankErr)
      return
    }
    setSaving(true)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'bankAccountNumber' && !v && servant?.bankAccountNumber) return
      if (k === 'skills' || k === 'workingDays') {
        fd.append(k, JSON.stringify(v))
      } else if (typeof v === 'boolean') {
        fd.append(k, v ? 'true' : 'false')
      } else if (k === 'phone') {
        fd.append('phone', v)
        fd.append('phoneCountryCode', countryCode)
      } else if (v !== '' && v !== null && v !== undefined) {
        fd.append(k, String(v))
      }
    })
    if (profilePhoto) fd.append('profilePhoto', profilePhoto)
    if (idProof) fd.append('idProof', idProof)
    try {
      let newCredentials = null
      if (loginPassword.trim()) {
        const pwVal = validateServantPassword(loginPassword)
        if (!pwVal.ok) {
          setLoginPasswordError(pwVal.error)
          return
        }
        const pwRes = await api.patch(`/agent/servants/${id}/password`, {
          password: loginPassword.trim(),
        })
        newCredentials = pwRes.data?.data?.credentials || null
        if (newCredentials) {
          setSavedCredentials(newCredentials)
          setLoginPassword('')
        }
      }

      await api.patch(`/agent/servants/${id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (newCredentials) return
      navigate(`/servants/${id}`)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update servant')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !servant) return <p>Loading…</p>

  const isAppRegistration =
    servant.registrationSource === 'SELF' || servant.user?.isActive === false

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">
        {isAppRegistration ? 'Edit app registration' : 'Edit Servant'}
      </h2>

      <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
        <h3 className="font-semibold">Personal Info</h3>
        <Field label="Full name" required>
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
        <Field label="Mobile" required>
          <div className="flex gap-2">
            <select
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value)
                setPhoneError(validatePhoneRequired(form.phone, e.target.value))
              }}
              className="rounded-lg border px-3 py-2 bg-white"
              style={{ width: '100px' }}
            >
              <option value="+91">+91 (IN)</option>
              <option value="+1">+1 (US)</option>
              <option value="+44">+44 (UK)</option>
              <option value="+971">+971 (AE)</option>
              <option value="+966">+966 (SA)</option>
              <option value="+65">+65 (SG)</option>
              <option value="+61">+61 (AU)</option>
            </select>
            <input
              placeholder="Enter mobile number"
              value={form.phone}
              onChange={(e) => {
                update('phone', digitsOnlyPhone(e.target.value))
                setPhoneError('')
              }}
              onBlur={() => setPhoneError(validatePhoneRequired(form.phone, countryCode))}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              aria-invalid={phoneError ? 'true' : undefined}
              className={`${inputClassName()}${phoneError ? ' border-error' : ''}`}
            />
          </div>
          {phoneError ? <p className="mt-1.5 text-sm text-error">{phoneError}</p> : null}
        </Field>
        <Field label="Skill" required>
          <SkillDropdown
            skills={skills}
            skillsLoading={skillsLoading}
            value={form.skills}
            onChange={(skillsSelected) => update('skills', skillsSelected)}
          />
        </Field>
        <Field label="Address" required>
          <textarea
            placeholder="Enter full residential address"
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            maxLength={500}
            className={inputClassName()}
            rows={3}
          />
        </Field>
        {isAppRegistration ? (
          <LoginPasswordFields
            email={servant.user?.email}
            password={loginPassword}
            onPasswordChange={(val) => {
              setLoginPassword(val)
              setLoginPasswordError('')
            }}
            error={loginPasswordError}
          />
        ) : null}
      </div>

      <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
        <h3 className="font-semibold">Rates & experience</h3>
        {SKILLS_RATE_FIELDS.map(({ key, label }) => (
          <Field key={key} label={key === 'hourlyRate' || key === 'monthlyRate' ? `${label} (₹)` : label}>
            <input
              placeholder={key === 'experience' ? 'e.g. 3' : key === 'hourlyRate' ? 'e.g. 150' : 'e.g. 15000'}
              type="text"
              inputMode={key === 'experience' ? 'numeric' : 'decimal'}
              value={form[key]}
              onChange={(e) => {
                update(key, sanitizeNonNegativeInput(e.target.value))
                setSkillsRateErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev))
              }}
              onBlur={() =>
                setSkillsRateErrors((prev) => ({
                  ...prev,
                  [key]: validateSkillsRateFields(form, { required: false })[key],
                }))
              }
              aria-invalid={skillsRateErrors[key] ? 'true' : undefined}
              className={`${inputClassName()}${skillsRateErrors[key] ? ' border-error' : ''}`}
            />
            {skillsRateErrors[key] ? (
              <p className="text-sm text-error">{skillsRateErrors[key]}</p>
            ) : null}
          </Field>
        ))}
        <Field label="Bio">
          <textarea
            placeholder="Short description about the servant"
            value={form.bio}
            onChange={(e) => update('bio', e.target.value)}
            maxLength={500}
            className={inputClassName()}
            rows={3}
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
              <TimePicker
                value={form.availableFrom}
                onChange={(val) => update('availableFrom', val)}
                className={inputClassName()}
              />
            </Field>
            <Field label="Session end time">
              <TimePicker
                value={form.availableTo}
                onChange={(val) => update('availableTo', val)}
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
            {!form.offersSession && (
              <>
                <Field label="Monthly start time">
                  <TimePicker
                    value={form.availableFrom}
                    onChange={(val) => update('availableFrom', val)}
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Monthly end time">
                  <TimePicker
                    value={form.availableTo}
                    onChange={(val) => update('availableTo', val)}
                    className={inputClassName()}
                  />
                </Field>
              </>
            )}
            <Field label="Hours per day" required>
              <input
                type="number"
                placeholder="Calculated automatically"
                value={form.hoursPerDay}
                readOnly
                className={`${inputClassName()} bg-gray-100 text-gray-500 cursor-not-allowed`}
              />
            </Field>
            <Field label="Monthly availability notes">
              <textarea
                placeholder="e.g. Second Saturday off, half day on Friday…"
                value={form.availabilityNotes}
                onChange={(e) => update('availabilityNotes', e.target.value)}
                maxLength={500}
                className={inputClassName()}
                rows={3}
              />
            </Field>
          </div>
        )}
      </div>

      <AadhaarXmlVerify servantId={id} servant={servant} />

      <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
        <h3 className="font-semibold">Bank details</h3>
        <p className="text-sm text-subtext">
          Used for payouts to this helper. Collect from the servant if not filled during onboarding.
        </p>
        <BankDetailsFields
          form={form}
          update={update}
          accountNumberConfirm={bankAccountConfirm}
          onAccountNumberConfirmChange={setBankAccountConfirm}
          existingAccountNumber={servant.bankAccountNumber}
        />
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
            accept="image/jpeg,image/png,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0] || null
              if (file) {
                const ext = file.name.split('.').pop().toLowerCase()
                const allowed = ['jpg', 'jpeg', 'png', 'pdf']
                if (!allowed.includes(ext) || file.type.includes('gif') || file.type.includes('video')) {
                  toast.error('ID proof must be a JPG, JPEG, PNG image or a PDF document')
                  e.target.value = ''
                  setIdProof(null)
                  return
                }
                if (file.size > 5 * 1024 * 1024) {
                  toast.error('ID proof document file size must be 5 MB or less')
                  e.target.value = ''
                  setIdProof(null)
                  return
                }
              }
              setIdProof(file)
            }}
            className="w-fit text-sm"
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
            accept="image/jpeg,image/png"
            onChange={(e) => {
              const file = e.target.files?.[0] || null
              if (file) {
                const ext = file.name.split('.').pop().toLowerCase()
                const allowed = ['jpg', 'jpeg', 'png']
                if (!allowed.includes(ext) || file.type.includes('gif') || file.type.includes('video')) {
                  toast.error('Profile photo must be a JPG, JPEG or PNG image')
                  e.target.value = ''
                  setProfilePhoto(null)
                  return
                }
                if (file.size > 5 * 1024 * 1024) {
                  toast.error('Profile photo file size must be 5 MB or less')
                  e.target.value = ''
                  setProfilePhoto(null)
                  return
                }
              }
              setProfilePhoto(file)
            }}
            className="w-fit text-sm"
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

      <ServiceZonesEditor servantId={id} zones={servant.zones || []} />

      {savedCredentials && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="font-semibold text-emerald-800">Password saved — share with helper</p>
          <p className="mt-2">
            Email: <strong>{savedCredentials.email}</strong>
          </p>
          <p className="mt-1 font-mono">
            Password: <strong>{savedCredentials.password}</strong>
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                const text = `Email: ${savedCredentials.email}\nPassword: ${savedCredentials.password}`
                const ok = await copyText(text)
                if (ok) {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }
                if (ok) {
                  toast.success('Copied')
                } else {
                  toast.error('Could not copy')
                }
              }}
            >
              {copied ? '✓ Copied' : 'Copy all'}
            </Button>
            <Button variant="success" onClick={() => navigate(`/servants/${id}`)}>
              Done
            </Button>
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
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Unsaved Changes"
        description="You have unsaved changes. Are you sure you want to leave?"
        confirmLabel="Leave"
        cancelLabel="Stay"
        variant="danger"
        onConfirm={() => blocker.proceed()}
        onClose={() => blocker.reset()}
      />
    </div>
  )
}
