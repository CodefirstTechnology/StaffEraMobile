import { useState, useEffect } from 'react'
import { useNavigate, Link, useBlocker, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import api from '../lib/api'
import { Button } from '../components/ui/Button'
import { PasswordInput } from '../components/ui/PasswordInput'
import { SkillDropdown } from '../components/SkillDropdown'
import { useSkills } from '../hooks/useSkills'
import {
  buildReportFromForm,
  buildReportFromFormSubmitted,
  downloadOnboardingReport,
  printOnboardingReport,
} from '../lib/onboardingReport'
import {
  BankDetailsFields,
  BankDetailsReview,
  EMPTY_BANK_FORM,
  validateBankDetails,
} from '../components/BankDetailsFields'
import { validatePhoneRequired, digitsOnlyPhone } from '../lib/phone'
import {
  emptySkillsRateErrors,
  sanitizeNonNegativeInput,
  validateSkillsRateFields,
  SKILLS_RATE_FIELDS,
} from '../lib/nonNegativeNumber'
import {
  ServiceZonesEditor,
  createDraftZonesForServant,
} from '../components/ServiceZonesEditor'
import { generateServantPassword, validateServantPassword, checkPasswordStrength } from '../lib/generatePassword'
import { copyText } from '../lib/copyToClipboard'

const emptyPersonalErrors = () => ({
  name: '',
  email: '',
  phone: '',
  password: '',
  skills: '',
  address: '',
  agentId: '',
  bio: '',
})

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

const STEPS = [
  { id: 1, label: 'Personal' },
  { id: 2, label: 'Skills' },
  { id: 3, label: 'Availability' },
  { id: 4, label: 'Service zones' },
  { id: 5, label: 'Documents' },
  { id: 6, label: 'Bank details' },
  { id: 7, label: 'Review & submit' },
]

const PERSONAL_FIELDS = [
  { key: 'name', label: 'Name', placeholder: 'Enter full name', type: 'text' },
  { key: 'email', label: 'Email', placeholder: 'Enter email address', type: 'email' },
  { key: 'phone', label: 'Mobile', placeholder: 'Enter mobile number', type: 'tel' },
  { key: 'password', label: 'Password', placeholder: 'Create login password', type: 'password' },
]

function Field({ label, required, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-gray-700">
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </span>
      {children}
    </label>
  )
}

function FieldLabel({ children }) {
  return <span className="text-sm font-medium text-gray-700">{children}</span>
}

function inputClassName(invalid = false) {
  return `w-full rounded-lg border px-3 py-2${invalid ? ' border-error' : ''}`
}

function FieldError({ message }) {
  if (!message) return null
  return <p className="text-sm text-error">{message}</p>
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
  const { user } = useAuth()
  const toast = useToast()
  const { data: skills = [], isLoading: skillsLoading } = useSkills()
  const [showPassword, setShowPassword] = useState(false)
  const [showReviewPassword, setShowReviewPassword] = useState(false)

  const { data: agents = [] } = useQuery({
    queryKey: ['admin-agents-list'],
    queryFn: async () => {
      const res = await api.get('/admin/agents', {
        params: { limit: 100 },
      })
      return res.data.data.agents
    },
    enabled: user?.role === 'ADMIN',
  })

  const [step, setStep] = useState(1)
  const [submitError, setSubmitError] = useState('')
  const [personalErrors, setPersonalErrors] = useState(emptyPersonalErrors)
  const [availabilityErrors, setAvailabilityErrors] = useState({
    bookingTypes: '',
    hoursPerDay: '',
  })
  const [zonesError, setZonesError] = useState('')
  const [documentErrors, setDocumentErrors] = useState({ idProof: '', profilePhoto: '' })
  const [skillsRateErrors, setSkillsRateErrors] = useState(emptySkillsRateErrors)
  const [bankError, setBankError] = useState('')
  const [bankAccountConfirm, setBankAccountConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
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
    address: '',
    idProofType: 'AADHAR',
    agentId: '',
    ...EMPTY_BANK_FORM,
  })
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [idProof, setIdProof] = useState(null)
  const [draftZones, setDraftZones] = useState([])
  const [countryCode, setCountryCode] = useState('+91')

  const reactLocation = useLocation()

  const isFormDirty =
    form.name !== '' ||
    form.email !== '' ||
    form.phone !== '' ||
    form.password !== '' ||
    form.bio !== '' ||
    form.experience !== '' ||
    form.hourlyRate !== '' ||
    form.monthlyRate !== '' ||
    form.address !== '' ||
    form.availabilityNotes !== '' ||
    profilePhoto !== null ||
    idProof !== null

  const blocker = useBlocker(
    ({ nextLocation }) =>
      isFormDirty && !submitting && nextLocation.pathname !== reactLocation.pathname
  )

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const proceed = window.confirm('You have unsaved changes. Are you sure you want to leave?')
      if (proceed) {
        blocker.proceed()
      } else {
        blocker.reset()
      }
    }
  }, [blocker.state])

  const clearPersonalError = (key) =>
    setPersonalErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev))

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }))
  const toggleDay = (d) =>
    setForm((f) => ({
      ...f,
      workingDays: f.workingDays.includes(d)
        ? f.workingDays.filter((x) => x !== d)
        : [...f.workingDays, d],
    }))

  const validatePersonal = () => {
    const errors = emptyPersonalErrors()
    if (!form.name?.trim()) errors.name = 'Full name is required'
    if (!form.email?.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[a-zA-Z0-9]+([._-]?[a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-]?[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/.test(form.email.trim())) {
      errors.email = 'Enter a valid email address'
    }
    errors.phone = validatePhoneRequired(form.phone, countryCode)
    const pwVal = validateServantPassword(form.password)
    if (!pwVal.ok) {
      errors.password = pwVal.error
    }
    if (!form.skills?.length) errors.skills = 'Select at least one skill'
    if (!form.address?.trim()) {
      errors.address = 'Address is required'
    } else if (form.address.length > 500) {
      errors.address = 'Address cannot exceed 500 characters'
    }
    if (form.bio && form.bio.length > 500) {
      errors.bio = 'Bio cannot exceed 500 characters'
    }
    if (user?.role === 'ADMIN' && !form.agentId) {
      errors.agentId = 'Agent assignment is required'
    }
    setPersonalErrors(errors)
    return !Object.values(errors).some(Boolean)
  }

  const validateSkillsRates = () => {
    const errors = validateSkillsRateFields(form, { required: true })
    setSkillsRateErrors(errors)
    return !Object.values(errors).some(Boolean)
  }

  const hoursPerDayError = () => {
    if (!form.offersMonthly) return ''
    const trimmed = String(form.hoursPerDay ?? '').trim()
    if (!trimmed) return 'Hours per day is required'
    const num = Number(trimmed)
    if (!Number.isFinite(num) || num < 1) return 'Hours per day must be at least 1'
    if (num > 24) return 'Hours per day cannot exceed 24'
    return ''
  }

  const validateAvailability = () => {
    const errors = { bookingTypes: '', hoursPerDay: '', availabilityNotes: '' }
    if (!form.offersSession && !form.offersMonthly) {
      errors.bookingTypes = 'Select at least one booking type: Session or Monthly'
    }
    errors.hoursPerDay = hoursPerDayError()
    if (form.availabilityNotes && form.availabilityNotes.length > 500) {
      errors.availabilityNotes = 'Availability notes cannot exceed 500 characters'
    }
    setAvailabilityErrors(errors)
    return !Object.values(errors).some(Boolean)
  }

  const validateZones = () => {
    if (!draftZones.length) {
      setZonesError('Add at least one service zone')
      return false
    }
    setZonesError('')
    return true
  }

  const validateDocuments = () => {
    const errors = { idProof: '', profilePhoto: '' }
    if (!idProof) {
      errors.idProof = 'ID proof document is required (JPEG, PNG, or WebP, max 5 MB)'
    }
    if (!profilePhoto) {
      errors.profilePhoto = 'Profile photo is required (JPEG, PNG, or WebP, max 5 MB)'
    }
    setDocumentErrors(errors)
    return !errors.idProof && !errors.profilePhoto
  }

  const validateBank = () => {
    const bankErr = validateBankDetails(form, bankAccountConfirm)
    if (bankErr) {
      setBankError(bankErr)
      return false
    }
    setBankError('')
    return true
  }

  const validateForReview = () => {
    if (!validatePersonal()) return false
    if (!validateSkillsRates()) return false
    if (!validateAvailability()) return false
    if (!validateZones()) return false
    if (!validateDocuments()) return false
    if (!validateBank()) return false
    return true
  }

  const reportDraft = () => buildReportFromForm(form, skills, { idProof, profilePhoto })

  const handleDownloadReport = () => {
    setSubmitError('')
    downloadOnboardingReport(reportDraft(), 'onboarding-draft')
  }

  const handlePrintReport = () => {
    setSubmitError('')
    printOnboardingReport(reportDraft())
  }

  const goNext = () => {
    setSubmitError('')
    if (step === 1 && !validatePersonal()) return
    if (step === 2 && !validateSkillsRates()) return
    if (step === 3 && !validateAvailability()) return
    if (step === 4 && !validateZones()) return
    if (step === 5) {
      if (!validateDocuments()) return
      if (!validateSkillsRates()) {
        setStep(2)
        return
      }
      if (!validatePersonal()) {
        setStep(1)
        return
      }
      if (!validateAvailability()) {
        setStep(3)
        return
      }
    }
    if (step === 6 && !validateBank()) return
    setStep((s) => s + 1)
  }

  const submit = async () => {
    setSubmitError('')
    if (!validateForReview()) {
      if (!validatePersonal()) setStep(1)
      else if (!validateSkillsRates()) setStep(2)
      else if (!validateAvailability()) setStep(3)
      else if (!validateZones()) setStep(4)
      else if (!validateDocuments()) setStep(5)
      else if (!validateBank()) setStep(6)
      return
    }

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'skills' || k === 'workingDays') {
        fd.append(k, JSON.stringify(v))
      } else if (typeof v === 'boolean') {
        fd.append(k, v ? 'true' : 'false')
      } else if (k === 'phone') {
        const cc = countryCode.replace(/\D/g, '')
        fd.append(k, cc + v)
      } else {
        fd.append(k, String(v))
      }
    })
    if (profilePhoto) fd.append('profilePhoto', profilePhoto)
    if (idProof) fd.append('idProof', idProof)

    setSubmitting(true)
    try {
      const res = await api.post('/agent/servants', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const servant = res.data.data.servant
      if (draftZones.length) {
        await createDraftZonesForServant(servant.id, draftZones)
      }
      downloadOnboardingReport(
        buildReportFromFormSubmitted(form, skills, { idProof, profilePhoto }, servant),
        `servant-${servant.id}`,
      )
      navigate(`/servants/${servant.id}`)
    } catch (e) {
      setSubmitError(e.response?.data?.message || 'Failed to create servant')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to="/servants"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-secondary transition-colors"
      >
        ← Back to servants
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Onboard New Servant</h2>
        <span className="text-sm text-subtext">
          Step {step} of {STEPS.length}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`h-2 flex-1 rounded ${step >= s.id ? 'bg-primary' : 'bg-gray-200'}`}
              title={s.label}
            />
          ))}
        </div>
        <p className="text-center text-sm font-medium text-primary">
          {STEPS.find((s) => s.id === step)?.label}
        </p>
      </div>

      {step === 1 && (
        <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
          <h3 className="font-semibold">Personal Info</h3>
          {user?.role === 'ADMIN' ? (
            <Field label="Assign Agent" required>
              <select
                value={form.agentId}
                onChange={(e) => {
                  update('agentId', e.target.value)
                  clearPersonalError('agentId')
                }}
                className={inputClassName(!!personalErrors.agentId)}
              >
                <option value="">Select an agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.user.name} {agent.agencyName ? `(${agent.agencyName})` : ''}
                  </option>
                ))}
              </select>
              <FieldError message={personalErrors.agentId} />
            </Field>
          ) : (
            <Field label="Agent">
              <input
                type="text"
                value={user?.name || ''}
                disabled
                readOnly
                className={`${inputClassName()} bg-gray-50 text-subtext`}
              />
            </Field>
          )}
          {PERSONAL_FIELDS.map((f) => {
            if (f.key === 'password') {
              return (
                <Field key={f.key} label={f.label} required>
                  <div className="relative flex items-center">
                    <input
                      placeholder={f.placeholder}
                      value={form.password}
                      onChange={(e) => {
                        update('password', e.target.value)
                        clearPersonalError('password')
                      }}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      aria-invalid={personalErrors.password ? 'true' : undefined}
                      className={`${inputClassName(!!personalErrors.password)} pr-32`}
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newPassword = generateServantPassword()
                          update('password', newPassword)
                          clearPersonalError('password')
                          setShowPassword(true)
                        }}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                      >
                        Generate
                      </button>
                    </div>
                  </div>
                  {form.password && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-xs text-on-surface-variant font-medium">Strength:</span>
                      <span className={`text-xs font-bold ${checkPasswordStrength(form.password).color}`}>
                        {checkPasswordStrength(form.password).label}
                      </span>
                    </div>
                  )}
                  <FieldError message={personalErrors.password} />
                </Field>
              )
            }
            if (f.key === 'phone') {
              return (
                <Field key={f.key} label={f.label} required>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => {
                        setCountryCode(e.target.value)
                        setPersonalErrors((prev) => ({
                          ...prev,
                          phone: validatePhoneRequired(form.phone, e.target.value),
                        }))
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
                      placeholder={f.placeholder}
                      value={form[f.key]}
                      onChange={(e) => {
                        update(f.key, digitsOnlyPhone(e.target.value))
                        clearPersonalError(f.key)
                      }}
                      onBlur={() =>
                        setPersonalErrors((prev) => ({
                          ...prev,
                          phone: validatePhoneRequired(form.phone, countryCode),
                        }))
                      }
                      type={f.type}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      aria-invalid={personalErrors[f.key] ? 'true' : undefined}
                      className={inputClassName(!!personalErrors[f.key])}
                    />
                  </div>
                  <FieldError message={personalErrors[f.key]} />
                </Field>
              )
            }
            return (
              <Field key={f.key} label={f.label} required>
                <input
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  autoComplete={f.key === 'name' ? 'new-name' : f.key === 'email' ? 'new-email' : 'off'}
                  onChange={(e) => {
                    const val =
                      f.key === 'phone' ? digitsOnlyPhone(e.target.value) : e.target.value
                    update(f.key, val)
                    clearPersonalError(f.key)
                  }}
                  onBlur={
                    f.key === 'phone'
                      ? () =>
                          setPersonalErrors((prev) => ({
                            ...prev,
                            phone: validatePhoneRequired(form.phone, countryCode),
                          }))
                      : undefined
                  }
                  type={f.type}
                  inputMode={f.key === 'phone' ? 'numeric' : undefined}
                  pattern={f.key === 'phone' ? '[0-9]*' : undefined}
                  aria-invalid={personalErrors[f.key] ? 'true' : undefined}
                  className={inputClassName(!!personalErrors[f.key])}
                />
                <FieldError message={personalErrors[f.key]} />
              </Field>
            )
          })}
          <Field label="Skill" required>
            <SkillDropdown
              skills={skills}
              skillsLoading={skillsLoading}
              value={form.skills}
              onChange={(skillsSelected) => {
                update('skills', skillsSelected)
                clearPersonalError('skills')
              }}
            />
            <FieldError message={personalErrors.skills} />
          </Field>
          <Field label="Address" required>
            <textarea
              placeholder="Enter full residential address"
              value={form.address}
              onChange={(e) => {
                update('address', e.target.value)
                clearPersonalError('address')
              }}
              maxLength={500}
              aria-invalid={personalErrors.address ? 'true' : undefined}
              className={inputClassName(!!personalErrors.address)}
              rows={3}
            />
            <FieldError message={personalErrors.address} />
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
          <h3 className="font-semibold">Skills & Rates</h3>
          {SKILLS_RATE_FIELDS.map(({ key, label }) => (
            <Field
              key={key}
              required
              label={key === 'hourlyRate' || key === 'monthlyRate' ? `${label} (₹)` : label}
            >
              <input
                placeholder={key === 'experience' ? 'e.g. 3' : key === 'hourlyRate' ? 'e.g. 150' : 'e.g. 15000'}
                type="number"
                min={0}
                step={key === 'experience' ? 1 : 'any'}
                value={form[key]}
                onChange={(e) => {
                  update(key, sanitizeNonNegativeInput(e.target.value))
                  setSkillsRateErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev))
                }}
                onBlur={() =>
                  setSkillsRateErrors((prev) => ({
                    ...prev,
                    [key]: validateSkillsRateFields(form, { required: true })[key],
                  }))
                }
                aria-invalid={skillsRateErrors[key] ? 'true' : undefined}
                className={inputClassName(!!skillsRateErrors[key])}
              />
              <FieldError message={skillsRateErrors[key]} />
            </Field>
          ))}
          <Field label="Bio">
            <textarea
              placeholder="Short description about the servant"
              value={form.bio}
              onChange={(e) => {
                update('bio', e.target.value)
                clearPersonalError('bio')
              }}
              maxLength={500}
              className={inputClassName(!!personalErrors.bio)}
              rows={3}
            />
            <FieldError message={personalErrors.bio} />
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
                  onChange={(e) => {
                    update('offersSession', e.target.checked)
                    setAvailabilityErrors((prev) => ({ ...prev, bookingTypes: '' }))
                  }}
                />
                Session (one visit)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.offersMonthly}
                  onChange={(e) => {
                    update('offersMonthly', e.target.checked)
                    setAvailabilityErrors((prev) => ({ ...prev, bookingTypes: '' }))
                  }}
                />
                Monthly contract
              </label>
            </div>
            <FieldError message={availabilityErrors.bookingTypes} />
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
              <Field label="Hours per day" required>
                <input
                  type="number"
                  min={1}
                  max={24}
                  placeholder="e.g. 8"
                  value={form.hoursPerDay}
                  onChange={(e) => {
                    update('hoursPerDay', sanitizeNonNegativeInput(e.target.value))
                    setAvailabilityErrors((prev) => ({ ...prev, hoursPerDay: '' }))
                  }}
                  onBlur={() =>
                    setAvailabilityErrors((prev) => ({
                      ...prev,
                      hoursPerDay: hoursPerDayError(),
                    }))
                  }
                  aria-invalid={availabilityErrors.hoursPerDay ? 'true' : undefined}
                  className={inputClassName(!!availabilityErrors.hoursPerDay)}
                />
                <FieldError message={availabilityErrors.hoursPerDay} />
              </Field>
              <Field label="Monthly availability notes">
                <textarea
                  placeholder="e.g. Second Saturday off, half day on Friday…"
                  value={form.availabilityNotes}
                  onChange={(e) => {
                    update('availabilityNotes', e.target.value)
                    setAvailabilityErrors((prev) => ({ ...prev, availabilityNotes: '' }))
                  }}
                  maxLength={500}
                  className={inputClassName(!!availabilityErrors.availabilityNotes)}
                  rows={3}
                />
                <FieldError message={availabilityErrors.availabilityNotes} />
              </Field>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-2">
          <ServiceZonesEditor
            draftMode
            draftZones={draftZones}
            onDraftChange={(zones) => {
              setDraftZones(zones)
              if (zones.length) setZonesError('')
            }}
          />
          <FieldError message={zonesError} />
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
          <h3 className="font-semibold">ID Verification</h3>
          <p className="text-sm text-subtext">
            Upload ID photo and profile photo here. After the profile is created, you can optionally
            verify Aadhaar with Offline e-KYC XML (myAadhaar ZIP + share code) on the servant detail
            page.
          </p>
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
          <Field label="ID proof document" required>
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                if (file) {
                  const ext = file.name.split('.').pop().toLowerCase()
                  const allowed = ['jpg', 'jpeg', 'png', 'pdf']
                  if (!allowed.includes(ext) || file.type.includes('gif') || file.type.includes('video')) {
                    setDocumentErrors((prev) => ({
                      ...prev,
                      idProof: 'ID proof must be a JPG, JPEG, PNG image or a PDF document',
                    }))
                    e.target.value = ''
                    setIdProof(null)
                    return
                  }
                }
                setIdProof(file)
                setDocumentErrors((prev) => ({ ...prev, idProof: '' }))
              }}
              className="w-full text-sm"
            />
            <FieldError message={documentErrors.idProof} />
          </Field>
          <Field label="Profile photo" required>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                if (file) {
                  const ext = file.name.split('.').pop().toLowerCase()
                  const allowed = ['jpg', 'jpeg', 'png']
                  if (!allowed.includes(ext) || file.type.includes('gif') || file.type.includes('video')) {
                    setDocumentErrors((prev) => ({
                      ...prev,
                      profilePhoto: 'Profile photo must be a JPG, JPEG or PNG image',
                    }))
                    e.target.value = ''
                    setProfilePhoto(null)
                    return
                  }
                }
                setProfilePhoto(file)
                setDocumentErrors((prev) => ({ ...prev, profilePhoto: '' }))
              }}
              className="w-full text-sm"
            />
            <FieldError message={documentErrors.profilePhoto} />
          </Field>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
          <h3 className="font-semibold">Bank details</h3>
          <p className="text-sm text-subtext">
            Payment account for salary and booking payouts. You can add or update these later from
            the servant profile.
          </p>
          <BankDetailsFields
            form={form}
            update={update}
            accountNumberConfirm={bankAccountConfirm}
            onAccountNumberConfirmChange={(value) => {
              setBankAccountConfirm(value)
              setBankError('')
            }}
          />
          <FieldError message={bankError} />
        </div>
      )}

      {step === 7 && (
        <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
          <h3 className="font-semibold">Review &amp; submit</h3>
          <p className="text-sm text-subtext">
            Confirm all details below. You can download or print a report for your records,
            then submit to create the profile (status: Pending verification).
          </p>

          <ReviewSection title="Personal Info">
            {user?.role === 'ADMIN' ? (
              <ReviewItem label="Assigned Agent">
                {agents.find((a) => String(a.id) === String(form.agentId))?.user?.name || '—'}
              </ReviewItem>
            ) : (
              <ReviewItem label="Agent">
                {user?.name || '—'}
              </ReviewItem>
            )}
            <ReviewItem label="Name">{form.name || '—'}</ReviewItem>
            <ReviewItem label="Email">{form.email || '—'}</ReviewItem>
            <ReviewItem label="Mobile">{form.phone || '—'}</ReviewItem>
            <ReviewItem label="Skill">
              <ReviewChips
                items={form.skills.map(
                  (code) =>
                    skills.find((s) => s.code === code)?.label ||
                    code.replace(/_/g, ' '),
                )}
              />
            </ReviewItem>
            <ReviewItem label="Address">{form.address || '—'}</ReviewItem>
            <ReviewItem label="Password">
              <div className="flex items-center gap-2">
                <span className="font-mono">
                  {showReviewPassword ? form.password : '•'.repeat(Math.min(form.password.length, 8))}
                </span>
                {form.password && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReviewPassword(!showReviewPassword)}
                      className="text-xs font-semibold text-primary hover:text-secondary underline cursor-pointer"
                    >
                      {showReviewPassword ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await copyText(form.password)
                        if (ok) {
                          toast.success('Password copied to clipboard')
                        }
                      }}
                      className="text-xs font-semibold text-primary hover:text-secondary underline cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            </ReviewItem>
          </ReviewSection>

          <ReviewSection title="Skills & Rates">
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

          <ReviewSection title="Service zones">
            <ReviewItem label="Areas">
              <ReviewChips
                items={draftZones.map((z) => `${z.name}${z.city ? ` · ${z.city}` : ''}`)}
              />
            </ReviewItem>
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

          <ReviewSection title="Bank details">
            <BankDetailsReview form={form} />
          </ReviewSection>

          {submitError && <FieldError message={submitError} />}

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="mb-3 text-sm font-medium text-primary">Before you submit</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                variant="secondary"
                onClick={handleDownloadReport}
                disabled={submitting}
              >
                ↓ Download report
              </Button>
              <Button
                variant="secondary"
                onClick={handlePrintReport}
                disabled={submitting}
              >
                Print / Save as PDF
              </Button>
              <Button
                variant="gradient"
                className="flex-1 sm:min-w-[12rem]"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit for verification'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        <Button
          variant="secondary"
          disabled={step === 1 || submitting}
          onClick={() => {
            setSubmitError('')
            setStep((s) => s - 1)
          }}
        >
          Back
        </Button>
        {step < 7 && (
          <Button onClick={goNext} disabled={submitting}>
            {step === 6 ? 'Review & submit' : 'Next'}
          </Button>
        )}
      </div>
    </div>
  )
}
