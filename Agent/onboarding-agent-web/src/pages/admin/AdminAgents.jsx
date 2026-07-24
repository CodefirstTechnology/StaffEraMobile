import { useState, useMemo, useEffect } from 'react'
import { useBlocker, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { AgentLocationPicker } from '../../components/AgentLocationPicker'
import { LocationIcon } from '../../components/icons/LocationIcon'
import { CredentialsBanner } from '../../components/CredentialsBanner'
import { validatePhoneRequired, validatePhoneOptional, digitsOnlyPhone } from '../../lib/phone'
import { useToast } from '../../context/ToastContext'
import { validateServantPassword, checkPasswordStrength } from '../../lib/generatePassword'

const emptyEditForm = () => ({
  agencyName: '',
  location: null,
  serviceRadiusKm: '3',
})

function inputClass() {
  return 'input-ghost w-full text-sm'
}

function fieldInputClass(invalid = false) {
  return `${inputClass()}${invalid ? ' !border-error focus:!border-error' : ''}`
}

const REQUIRED = 'This field is required'

const emptyCreateFieldErrors = () => ({
  name: '',
  email: '',
  phone: '',
  location: '',
  manualAddress: '',
  manualLatitude: '',
  manualLongitude: '',
  password: '',
  serviceRadiusKm: '',
})

const emptyEditFieldErrors = () => ({
  location: '',
  serviceRadiusKm: '',
})

function FormField({ label, required, error, hint, className = '', htmlFor, children }) {
  return (
    <div className={`block space-y-1.5 ${className}`.trim()}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-on-background"
      >
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </label>
      {children}
      {error ? (
        <span className="text-xs font-medium text-error">{error}</span>
      ) : hint ? (
        <span className="text-xs text-on-surface-variant">{hint}</span>
      ) : null}
    </div>
  )
}

function validateEmail(value) {
  if (!value.trim()) return REQUIRED
  if (!/^[a-zA-Z0-9]+([._-]?[a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-]?[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/.test(value.trim())) {
    return 'Enter a valid email address'
  }
  return ''
}

function validateName(value) {
  if (!value.length) return REQUIRED
  if (!value.trim().length) return 'Name cannot contain only spaces'
  if (value.trim().length < 2) return 'Name must be at least 2 characters'
  return ''
}

function validateServiceRadius(value, maxRadius = 50) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return REQUIRED
  const radius = Number(trimmed)
  if (!Number.isFinite(radius)) return 'Enter a valid number'
  if (radius < 1 || radius > maxRadius) return `Service radius must be between 1 and ${maxRadius} km`
  const parts = trimmed.split('.')
  if (parts.length > 1 && parts[1].length > 2) {
    return 'Service radius cannot have more than 2 decimal places'
  }
  return ''
}

function validatePhone(value, countryCode = '+91') {
  return validatePhoneRequired(value, countryCode)
}

function validateCreateAgentFields({
  name,
  email,
  phone,
  locationMode,
  location,
  manualAddress,
  manualLatitude,
  manualLongitude,
  generatePassword,
  password,
  serviceRadiusKm,
}, maxRadius = 50, countryCode = '+91') {
  const errors = emptyCreateFieldErrors()
  errors.name = validateName(name)
  errors.email = validateEmail(email)
  errors.phone = validatePhone(phone, countryCode)

  if (locationMode === 'manual') {
    if (!manualAddress.trim()) errors.manualAddress = REQUIRED
    if (!String(manualLatitude).trim()) errors.manualLatitude = REQUIRED
    else if (!Number.isFinite(Number(manualLatitude))) {
      errors.manualLatitude = 'Enter a valid latitude'
    }
    if (!String(manualLongitude).trim()) errors.manualLongitude = REQUIRED
    else if (!Number.isFinite(Number(manualLongitude))) {
      errors.manualLongitude = 'Enter a valid longitude'
    }
  } else {
    if (
      !location?.address?.trim() ||
      location.latitude == null ||
      location.longitude == null
    ) {
      errors.location = 'Pick the office location from search or GPS'
    }
  }

  if (!generatePassword) {
    if (!password) errors.password = REQUIRED
    else {
      const pwVal = validateServantPassword(password)
      if (!pwVal.ok) {
        errors.password = pwVal.error
      }
    }
  }

  errors.serviceRadiusKm = validateServiceRadius(serviceRadiusKm, maxRadius)
  return errors
}

function validateEditAgentFields({ location, serviceRadiusKm }, maxRadius = 50) {
  const errors = emptyEditFieldErrors()
  errors.location =
    !location?.address?.trim() || location.latitude == null || location.longitude == null
      ? 'Pick the office location from search or GPS'
      : ''
  errors.serviceRadiusKm = validateServiceRadius(serviceRadiusKm, maxRadius)
  return errors
}

function hasFieldErrors(errors) {
  return Object.values(errors).some(Boolean)
}

function updateFieldError(setter, field, value, validate) {
  setter((prev) => ({
    ...prev,
    [field]: prev[field] ? validate(value) : '',
  }))
}

function AgentAvatar({ name }) {
  const initials = (name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-sm font-bold text-white shadow-md">
      {initials}
    </span>
  )
}

function StatusPill({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-400'}`}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function RadiusPill({ km }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">
      <span aria-hidden>◎</span>
      {km ?? 3} km
    </span>
  )
}

function StatCard({ label, value, sub, accent = 'text-primary' }) {
  return (
    <div className="glass-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-on-surface-variant">{sub}</p>}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card h-24" />
        ))}
      </div>
      <div className="glass-card h-14" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-card h-28" />
      ))}
    </div>
  )
}

function AgentEditPanel({
  agent,
  form,
  setForm,
  fieldErrors,
  setFieldErrors,
  error,
  saving,
  onClose,
  onSave,
  maxRadius = 50,
}) {
  if (!agent) return null

  const updateLocationError = (force = false) => {
    setFieldErrors((prev) => {
      const loc = form.location
      const message =
        !loc?.address?.trim() || loc.latitude == null || loc.longitude == null
          ? 'Pick the office location from search or GPS'
          : ''
      return force || prev.location ? { ...prev, location: message } : prev
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close edit panel"
        className="absolute inset-0 bg-primary/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col overflow-hidden border-l border-outline-variant/30 bg-white shadow-2xl">
        <div className="border-b border-outline-variant/20 bg-gradient-to-r from-primary/5 to-secondary/5 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <AgentAvatar name={agent.user.name} />
              <div>
                <h3 className="text-lg font-bold text-primary">Edit agent</h3>
                <p className="text-sm text-on-surface-variant">{agent.user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-outline-variant/40 px-3 py-1.5 text-sm text-on-surface-variant hover:bg-surface-low"
            >
              ✕
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill active={agent.user.isActive} />
            <RadiusPill km={agent.serviceRadiusKm} />
            <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-medium text-on-surface-variant">
              {agent._count?.servants ?? 0} servants
            </span>
          </div>
        </div>

        <form onSubmit={onSave} noValidate className="flex flex-1 flex-col overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <section className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary">
                Agency
              </h4>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-on-background">Agency name</span>
                <input
                  className={inputClass()}
                  placeholder="e.g. Mumbai West Agency"
                  value={form.agencyName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, agencyName: e.target.value }))
                  }
                />
              </label>
            </section>

            <section className="space-y-3 rounded-2xl border border-outline-variant/25 bg-surface-low/80 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary">
                Location
              </h4>
              <AgentLocationPicker
                label="Office / service area"
                required
                value={form.location}
                error={fieldErrors.location}
                onInteraction={() => updateLocationError(true)}
                onChange={(loc) => {
                  setForm((f) => ({ ...f, location: loc }))
                  setFieldErrors((prev) => ({
                    ...prev,
                    location: prev.location
                      ? !loc?.address?.trim() ||
                        loc?.latitude == null ||
                        loc?.longitude == null
                        ? 'Pick the office location from search or GPS'
                        : ''
                      : '',
                  }))
                }}
              />
            </section>

            <section className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary">
                Coverage
              </h4>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-on-background">
                  Service radius (km)<span className="text-error"> *</span>
                </span>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={maxRadius}
                    step={0.5}
                    className="flex-1 accent-secondary"
                    value={form.serviceRadiusKm}
                    onChange={(e) => {
                      const next = e.target.value
                      setForm((f) => ({ ...f, serviceRadiusKm: next }))
                      updateFieldError(
                        setFieldErrors,
                        'serviceRadiusKm',
                        next,
                        (v) => validateServiceRadius(v, maxRadius),
                      )
                    }}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    className={`${fieldInputClass(!!fieldErrors.serviceRadiusKm)} w-20 text-center`}
                    value={form.serviceRadiusKm}
                    onChange={(e) => {
                      let next = e.target.value.replace(/[^0-9.]/g, '')
                      setForm((f) => ({ ...f, serviceRadiusKm: next }))
                      updateFieldError(
                        setFieldErrors,
                        'serviceRadiusKm',
                        next,
                        (v) => validateServiceRadius(v, maxRadius),
                      )
                    }}
                    onBlur={() =>
                      setFieldErrors((prev) => ({
                        ...prev,
                        serviceRadiusKm: validateServiceRadius(form.serviceRadiusKm, maxRadius),
                      }))
                    }
                    aria-invalid={!!fieldErrors.serviceRadiusKm}
                  />
                </div>
                {fieldErrors.serviceRadiusKm ? (
                  <span className="text-xs font-medium text-error">
                    {fieldErrors.serviceRadiusKm}
                  </span>
                ) : (
                  <p className="text-xs text-on-surface-variant">
                    Helpers within this distance appear in this agent&apos;s app registrations.
                  </p>
                )}
              </label>
            </section>

            {error && (
              <div className="rounded-xl border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}
          </div>

          <div className="mt-auto flex gap-3 border-t border-outline-variant/20 pt-5">
            <Button
              type="submit"
              variant="gradient"
              className="flex-1"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </aside>
    </div>
  )
}

function AgentRowCard({ agent, isSelected, onEdit, onToggle }) {
  return (
    <article
      className={`glass-card group p-5 transition-all hover:shadow-lg ${
        isSelected ? 'ring-2 ring-secondary/40' : ''
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <button
          type="button"
          onClick={() => onEdit(agent)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <AgentAvatar name={agent.user.name} />
          <div className="min-w-0">
            <p className="font-semibold text-primary group-hover:text-secondary transition-colors">
              {agent.user.name}
            </p>
            <p className="truncate text-sm text-on-surface-variant">{agent.user.email}</p>
            {agent.agencyName && (
              <p className="mt-1 text-sm font-medium text-on-background">{agent.agencyName}</p>
            )}
          </div>
        </button>
        <StatusPill active={agent.user.isActive} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-outline-variant/20 pt-4">
        <RadiusPill km={agent.serviceRadiusKm} />
        <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-medium text-on-surface-variant">
          👥 {agent._count?.servants ?? 0} servants
        </span>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
          ₹{(agent.annualRevenue ?? 0).toLocaleString('en-IN')} / yr
        </span>
      </div>

      {(agent.address || agent.city) && (
        <div className="mt-3 flex items-start gap-2 text-sm text-on-surface-variant">
          <LocationIcon size={15} className="mt-0.5 shrink-0 text-secondary" />
          <span className="line-clamp-2">
            {agent.address}
            {agent.city ? ` · ${agent.city}` : ''}
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="gradient" className="text-sm" onClick={() => onEdit(agent)}>
          Edit agency
        </Button>
        <Button
          variant="secondary"
          className="text-sm"
          onClick={() => onToggle(agent)}
          disabled={agent.user.roleId === 1 && agent.user.isActive}
          title={agent.user.roleId === 1 && agent.user.isActive ? 'Admin users cannot be deactivated' : undefined}
        >
          {agent.user.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      </div>
    </article>
  )
}

export default function AdminAgents() {
  const qc = useQueryClient()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [credentials, setCredentials] = useState(null)
  const [agentToToggle, setAgentToToggle] = useState(null)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [toggleError, setToggleError] = useState('')

  const { data: adminStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats')
      return res.data.data
    },
  })
  const MAX_RADIUS = Number(import.meta.env.VITE_MAX_SERVICE_RADIUS) || adminStats?.maxServiceRadiusKm || 50

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [agencyName, setAgencyName] = useState('')
  const [password, setPassword] = useState('')
  const [generatePassword, setGeneratePassword] = useState(true)
  const [locationMode, setLocationMode] = useState('picker')
  const [location, setLocation] = useState(null)
  const [manualAddress, setManualAddress] = useState('')
  const [manualCity, setManualCity] = useState('')
  const [manualLatitude, setManualLatitude] = useState('')
  const [manualLongitude, setManualLongitude] = useState('')
  const [serviceRadiusKm, setServiceRadiusKm] = useState('3')
  const [fieldErrors, setFieldErrors] = useState(emptyCreateFieldErrors)
  const [createFormKey, setCreateFormKey] = useState(0)

  const [editingAgent, setEditingAgent] = useState(null)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [editFieldErrors, setEditFieldErrors] = useState(emptyEditFieldErrors)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const reactLocation = useLocation()

  const isCreateFormDirty =
    showForm &&
    (name !== '' ||
      email !== '' ||
      phone !== '' ||
      agencyName !== '' ||
      location !== null ||
      manualAddress !== '' ||
      manualLatitude !== '' ||
      manualLongitude !== '' ||
      password !== '')

  const isEditFormDirty = useMemo(() => {
    if (!editingAgent) return false
    const initialAgencyName = editingAgent.agencyName || ''
    const initialRadius = String(editingAgent.serviceRadiusKm ?? 3)
    const initialLoc =
      editingAgent.address && editingAgent.latitude != null && editingAgent.longitude != null
        ? {
            address: editingAgent.address,
            city: editingAgent.city,
            latitude: editingAgent.latitude,
            longitude: editingAgent.longitude,
          }
        : null

    const locChanged =
      (!editForm.location && initialLoc) ||
      (editForm.location && !initialLoc) ||
      (editForm.location &&
        initialLoc &&
        (editForm.location.address !== initialLoc.address ||
          editForm.location.latitude !== initialLoc.latitude ||
          editForm.location.longitude !== initialLoc.longitude))

    return (
      editForm.agencyName !== initialAgencyName ||
      editForm.serviceRadiusKm !== initialRadius ||
      locChanged
    )
  }, [editForm, editingAgent])

  const isFormDirty = isCreateFormDirty || isEditFormDirty

  const blocker = useBlocker(
    ({ nextLocation }) =>
      isFormDirty && !saving && !editSaving && nextLocation.pathname !== reactLocation.pathname
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

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const handleSearchChange = (newSearch) => {
    setSearch(newSearch)
    setPage(1)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-agents', search, page, limit],
    queryFn: async () => {
      const res = await api.get('/admin/agents', {
        params: { search: search || undefined, page, limit },
      })
      return res.data.data
    },
  })

  const { data: allAgentsData } = useQuery({
    queryKey: ['admin-agents-all'],
    queryFn: async () => {
      const res = await api.get('/admin/agents', {
        params: { limit: 1000 },
      })
      return res.data.data.agents
    },
  })

  const rows = data?.agents || []
  const total = data?.pagination?.total ?? rows.length
  const allRows = allAgentsData || []

  const stats = useMemo(() => {
    const active = allRows.filter((a) => a.user.isActive).length
    const servants = allRows.reduce((sum, a) => sum + (a._count?.servants ?? 0), 0)
    const revenue = allRows.reduce((sum, a) => sum + (a.annualRevenue ?? 0), 0)
    return { total: allRows.length, active, servants, revenue }
  }, [allRows])

  const resetForm = () => {
    setName('')
    setEmail('')
    setPhone('')
    setCountryCode('+91')
    setAgencyName('')
    setPassword('')
    setGeneratePassword(true)
    setLocationMode('picker')
    setLocation(null)
    setManualAddress('')
    setManualCity('')
    setManualLatitude('')
    setManualLongitude('')
    setServiceRadiusKm('3')
    setError('')
    setFieldErrors(emptyCreateFieldErrors())
  }

  const openCreateForm = () => {
    closeEdit()
    resetForm()
    setCreateFormKey((k) => k + 1)
    setShowForm(true)
  }

  const closeCreateForm = () => {
    resetForm()
    setShowForm(false)
  }

  const openEdit = (agent) => {
    resetForm()
    setShowForm(false)
    setEditingAgent(agent)
    setEditError('')
    setEditFieldErrors(emptyEditFieldErrors())
    setEditForm({
      agencyName: agent.agencyName || '',
      location:
        agent.address && agent.latitude != null && agent.longitude != null
          ? {
              address: agent.address,
              city: agent.city,
              latitude: agent.latitude,
              longitude: agent.longitude,
            }
          : null,
      serviceRadiusKm: String(agent.serviceRadiusKm ?? 3),
    })
  }

  const closeEdit = () => {
    setEditingAgent(null)
    setEditForm(emptyEditForm())
    setEditError('')
    setEditFieldErrors(emptyEditFieldErrors())
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    setEditError('')
    const errors = validateEditAgentFields(editForm, MAX_RADIUS)
    setEditFieldErrors(errors)
    if (hasFieldErrors(errors)) return
    setEditSaving(true)
    try {
      const radius = Number(editForm.serviceRadiusKm)
      await api.patch(`/admin/agents/${editingAgent.id}`, {
        agencyName: editForm.agencyName.trim() || null,
        address: editForm.location.address,
        city: editForm.location.city,
        latitude: editForm.location.latitude,
        longitude: editForm.location.longitude,
        serviceRadiusKm: radius,
      })
      closeEdit()
      qc.invalidateQueries({ queryKey: ['admin-agents'] })
      qc.invalidateQueries({ queryKey: ['admin-agents-all'] })
      toast.success(`Agent "${editingAgent.user.name}" updated`)
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update agent')
    } finally {
      setEditSaving(false)
    }
  }

  const requestToggle = (agent) => {
    if (agent.user.roleId === 1 && agent.user.isActive) {
      toast.error('Admin users cannot be deactivated')
      return
    }
    setToggleError('')
    setAgentToToggle(agent)
  }

  const confirmToggle = async () => {
    if (!agentToToggle) return
    setToggleLoading(true)
    setToggleError('')
    const wasActive = agentToToggle.user.isActive
    const agentName = agentToToggle.user.name
    try {
      await api.patch(`/admin/users/${agentToToggle.user.id}/toggle`)
      setAgentToToggle(null)
      qc.invalidateQueries({ queryKey: ['admin-agents'] })
      qc.invalidateQueries({ queryKey: ['admin-agents-all'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success(
        wasActive
          ? `Agent "${agentName}" deactivated`
          : `Agent "${agentName}" activated`,
      )
    } catch (err) {
      setToggleError(err.response?.data?.message || 'Failed to update agent status')
    } finally {
      setToggleLoading(false)
    }
  }

  const createAgent = async (e) => {
    e.preventDefault()
    setError('')

    const errors = validateCreateAgentFields({
      name,
      email,
      phone,
      locationMode,
      location,
      manualAddress,
      manualLatitude,
      manualLongitude,
      generatePassword,
      password,
      serviceRadiusKm,
    }, MAX_RADIUS, countryCode)
    setFieldErrors(errors)
    if (hasFieldErrors(errors)) return

    let address
    let city
    let latitude
    let longitude

    if (locationMode === 'manual') {
      address = manualAddress.trim()
      city = manualCity.trim() || undefined
      latitude = Number(manualLatitude)
      longitude = Number(manualLongitude)
    } else {
      address = location.address
      city = location.city
      latitude = location.latitude
      longitude = location.longitude
    }

    setSaving(true)
    try {
      const cc = countryCode.replace(/\D/g, '')
      const res = await api.post('/admin/agents', {
        name: name.trim(),
        email: email.trim(),
        phone: cc + digitsOnlyPhone(phone),
        agencyName: agencyName.trim() || undefined,
        password: generatePassword ? undefined : password,
        generatePassword,
        address,
        city,
        latitude,
        longitude,
        serviceRadiusKm: Number(serviceRadiusKm) || 3,
      })
      setCredentials(res.data?.data?.credentials || null)
      resetForm()
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['admin-agents'] })
      qc.invalidateQueries({ queryKey: ['admin-agents-all'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success(`Agent "${name.trim()}" added`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create agent')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
            Admin
          </p>
          <h2 className="mt-1 text-3xl font-bold text-primary">Field agents</h2>
          <p className="mt-2 max-w-xl text-sm text-on-surface-variant">
            Manage agency locations and service coverage. Click an agent to edit their area and
            radius.
          </p>
        </div>
        <Button
          variant="gradient"
          onClick={() => {
            if (showForm) closeCreateForm()
            else openCreateForm()
          }}
        >
          {showForm ? '✕ Cancel' : '+ Add agent'}
        </Button>
      </div>

      <CredentialsBanner credentials={credentials} onDone={() => setCredentials(null)} />

      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total agents" value={stats.total} />
          <StatCard label="Active" value={stats.active} accent="text-emerald-600" />
          <StatCard label="Servants onboarded" value={stats.servants} accent="text-secondary" />
          <StatCard
            label="Annual revenue"
            value={`₹${stats.revenue.toLocaleString('en-IN')}`}
            accent="text-amber-700"
          />
        </div>
      )}

      {showForm && (
        <form
          key={createFormKey}
          onSubmit={createAgent}
          noValidate
          autoComplete="off"
          className="glass-card space-y-5 p-6"
        >
          <div>
            <h3 className="text-lg font-semibold text-primary">New field agent</h3>
            <p className="text-sm text-on-surface-variant">
              Create login credentials and assign an agency area.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Full name" required error={fieldErrors.name}>
              <input
                type="text"
                className={fieldInputClass(!!fieldErrors.name)}
                value={name}
                onChange={(e) => {
                  const next = e.target.value
                  setName(next)
                  updateFieldError(setFieldErrors, 'name', next, validateName)
                }}
                onBlur={() =>
                  setFieldErrors((prev) => ({ ...prev, name: validateName(name) }))
                }
                aria-invalid={!!fieldErrors.name}
              />
            </FormField>
            <FormField label="Email" required error={fieldErrors.email} htmlFor="new-agent-email">
              <input
                id="new-agent-email"
                name="new-agent-email"
                type="email"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore
                className={fieldInputClass(!!fieldErrors.email)}
                value={email}
                onChange={(e) => {
                  const next = e.target.value
                  setEmail(next)
                  updateFieldError(setFieldErrors, 'email', next, validateEmail)
                }}
                onBlur={() =>
                  setFieldErrors((prev) => ({ ...prev, email: validateEmail(email) }))
                }
                aria-invalid={!!fieldErrors.email}
              />
            </FormField>
            <FormField label="Phone" required error={fieldErrors.phone}>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => {
                    setCountryCode(e.target.value)
                    setFieldErrors((prev) => ({
                      ...prev,
                      phone: validatePhone(phone, e.target.value),
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
                  type="tel"
                  className={fieldInputClass(!!fieldErrors.phone)}
                  value={phone}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={(e) => {
                    const next = digitsOnlyPhone(e.target.value)
                    setPhone(next)
                    updateFieldError(setFieldErrors, 'phone', next, (v) => validatePhone(v, countryCode))
                  }}
                  onBlur={() =>
                    setFieldErrors((prev) => ({ ...prev, phone: validatePhone(phone, countryCode) }))
                  }
                  aria-invalid={!!fieldErrors.phone}
                />
              </div>
            </FormField>
            <FormField label="Agency name" hint="Optional">
              <input
                type="text"
                className={inputClass()}
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
              />
            </FormField>
          </div>

          <div className="rounded-2xl border border-outline-variant/25 bg-surface-low/60 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
              Agency location
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              {['picker', 'manual'].map((mode) => (
                <label key={mode} className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={locationMode === mode}
                    onChange={() => {
                      setLocationMode(mode)
                      setFieldErrors((prev) => ({
                        ...prev,
                        location: '',
                        manualAddress: '',
                        manualLatitude: '',
                        manualLongitude: '',
                      }))
                    }}
                  />
                  {mode === 'picker' ? 'Search or GPS' : 'Manual coordinates'}
                </label>
              ))}
            </div>
            {locationMode === 'picker' ? (
              <AgentLocationPicker
                label="Office location"
                required
                value={location}
                error={fieldErrors.location}
                onInteraction={() => {
                  setFieldErrors((prev) => {
                    if (!prev.location) return prev
                    const invalid =
                      !location?.address?.trim() ||
                      location?.latitude == null ||
                      location?.longitude == null
                    return {
                      ...prev,
                      location: invalid ? 'Pick the office location from search or GPS' : '',
                    }
                  })
                }}
                onChange={(loc) => {
                  setLocation(loc)
                  setFieldErrors((prev) => ({
                    ...prev,
                    location: prev.location
                      ? !loc?.address?.trim() ||
                        loc?.latitude == null ||
                        loc?.longitude == null
                        ? 'Pick the office location from search or GPS'
                        : ''
                      : '',
                  }))
                }}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  label="Address"
                  required
                  error={fieldErrors.manualAddress}
                  className="sm:col-span-2"
                >
                  <input
                    className={fieldInputClass(!!fieldErrors.manualAddress)}
                    value={manualAddress}
                    onChange={(e) => {
                      const next = e.target.value
                      setManualAddress(next)
                      updateFieldError(
                        setFieldErrors,
                        'manualAddress',
                        next,
                        (v) => (!v.trim() ? REQUIRED : ''),
                      )
                    }}
                    aria-invalid={!!fieldErrors.manualAddress}
                  />
                </FormField>
                <FormField label="City" hint="Optional">
                  <input
                    className={inputClass()}
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                  />
                </FormField>
                <FormField label="Latitude" required error={fieldErrors.manualLatitude}>
                  <input
                    type="text"
                    inputMode="decimal"
                    className={fieldInputClass(!!fieldErrors.manualLatitude)}
                    value={manualLatitude}
                    onChange={(e) => {
                      const next = e.target.value
                      setManualLatitude(next)
                      updateFieldError(setFieldErrors, 'manualLatitude', next, (v) => {
                        if (!String(v).trim()) return REQUIRED
                        if (!Number.isFinite(Number(v))) return 'Enter a valid latitude'
                        return ''
                      })
                    }}
                    aria-invalid={!!fieldErrors.manualLatitude}
                  />
                </FormField>
                <FormField label="Longitude" required error={fieldErrors.manualLongitude}>
                  <input
                    type="text"
                    inputMode="decimal"
                    className={fieldInputClass(!!fieldErrors.manualLongitude)}
                    value={manualLongitude}
                    onChange={(e) => {
                      const next = e.target.value
                      setManualLongitude(next)
                      updateFieldError(setFieldErrors, 'manualLongitude', next, (v) => {
                        if (!String(v).trim()) return REQUIRED
                        if (!Number.isFinite(Number(v))) return 'Enter a valid longitude'
                        return ''
                      })
                    }}
                    aria-invalid={!!fieldErrors.manualLongitude}
                  />
                </FormField>
              </div>
            )}
          </div>

          <label className="block max-w-md space-y-1.5">
            <span className="text-sm font-medium text-on-background">
              Service radius (km)<span className="text-error"> *</span>
            </span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={MAX_RADIUS}
                step={0.5}
                className="flex-1 accent-secondary"
                value={serviceRadiusKm}
                onChange={(e) => {
                  const next = e.target.value
                  setServiceRadiusKm(next)
                  updateFieldError(
                    setFieldErrors,
                    'serviceRadiusKm',
                    next,
                    (v) => validateServiceRadius(v, MAX_RADIUS),
                  )
                }}
              />
              <input
                type="text"
                inputMode="decimal"
                className={`${fieldInputClass(!!fieldErrors.serviceRadiusKm)} w-20 text-center`}
                value={serviceRadiusKm}
                onChange={(e) => {
                  let next = e.target.value.replace(/[^0-9.]/g, '')
                  setServiceRadiusKm(next)
                  updateFieldError(
                    setFieldErrors,
                    'serviceRadiusKm',
                    next,
                    (v) => validateServiceRadius(v, MAX_RADIUS),
                  )
                }}
                onBlur={() =>
                  setFieldErrors((prev) => ({
                    ...prev,
                    serviceRadiusKm: validateServiceRadius(serviceRadiusKm, MAX_RADIUS),
                  }))
                }
                aria-invalid={!!fieldErrors.serviceRadiusKm}
              />
            </div>
            {fieldErrors.serviceRadiusKm ? (
              <span className="text-xs font-medium text-error">
                {fieldErrors.serviceRadiusKm}
              </span>
            ) : null}
          </label>

          <div className="inline-flex w-fit max-w-full items-center gap-2">
            <input
              id="generate-agent-password"
              type="checkbox"
              checked={generatePassword}
              onChange={(e) => {
                setGeneratePassword(e.target.checked)
                if (e.target.checked) {
                  setPassword('')
                  setFieldErrors((prev) => ({ ...prev, password: '' }))
                }
              }}
            />
            <label htmlFor="generate-agent-password" className="cursor-pointer text-sm">
              Auto-generate login password
            </label>
          </div>
          {!generatePassword && (
            <FormField
              label="Login password"
              required
              error={fieldErrors.password}
              htmlFor="new-agent-password"
            >
              <PasswordInput
                id="new-agent-password"
                name="new-agent-password"
                autoComplete="new-password"
                placeholder="Min 6 characters"
                className={`${fieldInputClass(!!fieldErrors.password)} max-w-sm w-full`}
                value={password}
                invalid={!!fieldErrors.password}
                onChange={(e) => {
                  const next = e.target.value
                  setPassword(next)
                  updateFieldError(setFieldErrors, 'password', next, (v) => {
                    if (!v) return REQUIRED
                    const pwVal = validateServantPassword(v)
                    return pwVal.ok ? '' : pwVal.error
                  })
                }}
                aria-invalid={!!fieldErrors.password}
              />
              {password && (
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-xs text-on-surface-variant font-medium">Strength:</span>
                  <span className={`text-xs font-bold ${checkPasswordStrength(password).color}`}>
                    {checkPasswordStrength(password).label}
                  </span>
                </div>
              )}
            </FormField>
          )}

          {error && (
            <div className="rounded-xl border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          <Button type="submit" variant="gradient" disabled={saving}>
            {saving ? 'Creating…' : 'Create agent'}
          </Button>
        </form>
      )}

      <div className="glass-card flex flex-wrap items-center gap-3 p-4">
        <span className="text-lg opacity-60" aria-hidden>
          🔍
        </span>
        <input
          placeholder="Search by name, email, agency, or area…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className={`${inputClass()} max-w-md flex-1`}
        />
        {!isLoading && (
          <span className="text-sm text-on-surface-variant ml-auto">
            {total} total agent{total === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="🏢"
          title="No agents found"
          description="Try a different search term or onboard a new field agent."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:hidden">
            {rows.map((a) => (
              <AgentRowCard
                key={a.id}
                agent={a}
                onEdit={openEdit}
                onToggle={requestToggle}
              />
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-outline-variant/30 bg-white/80 shadow-[var(--shadow-card)] lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-low/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Agent & Agency
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Radius
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Servants
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Est. Revenue
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-outline-variant/15 transition-colors hover:bg-primary/3"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <AgentAvatar name={a.user.name} />
                        <div>
                          <p className="font-semibold text-primary">{a.user.name}</p>
                          {a.agencyName && (
                            <p className="text-xs font-medium text-secondary">{a.agencyName}</p>
                          )}
                          <p className="text-xs text-on-surface-variant">{a.user.email}</p>
                          {a.user.phone && (
                            <p className="text-xs text-on-surface-variant">{a.user.phone}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-on-surface-variant">
                      <div className="flex items-start gap-1.5 max-w-[200px]">
                        <LocationIcon size={14} className="mt-0.5 shrink-0 text-secondary" />
                        <div className="min-w-0">
                          <p className="truncate">{a.address || '—'}</p>
                          {a.city && (
                            <p className="text-xs text-on-surface-variant">{a.city}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <RadiusPill km={a.serviceRadiusKm} />
                    </td>
                    <td className="px-4 py-4 font-medium">{a._count?.servants ?? 0}</td>
                    <td className="px-4 py-4 font-semibold text-amber-700">
                      ₹{(a.annualRevenue ?? 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill active={a.user.isActive} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => requestToggle(a)}
                          disabled={a.user.roleId === 1 && a.user.isActive}
                          title={a.user.roleId === 1 && a.user.isActive ? 'Admin users cannot be deactivated' : undefined}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                            a.user.roleId === 1 && a.user.isActive
                              ? 'border-outline-variant/20 text-on-surface-variant/40 cursor-not-allowed bg-gray-50'
                              : 'border-outline-variant/40 text-on-surface-variant hover:bg-surface-low'
                          }`}
                        >
                          {a.user.isActive ? 'Off' : 'On'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
      )}

      <AgentEditPanel
        agent={editingAgent}
        form={editForm}
        setForm={setEditForm}
        fieldErrors={editFieldErrors}
        setFieldErrors={setEditFieldErrors}
        error={editError}
        saving={editSaving}
        onClose={closeEdit}
        onSave={saveEdit}
        maxRadius={MAX_RADIUS}
      />

      <ConfirmDialog
        open={!!agentToToggle}
        title={
          agentToToggle?.user.isActive ? 'Deactivate this user?' : 'Activate this user?'
        }
        description={
          agentToToggle
            ? agentToToggle.user.isActive
              ? `Are you sure you want to deactivate ${agentToToggle.user.name}? They will no longer be able to sign in to the agent portal.`
              : `Are you sure you want to activate ${agentToToggle.user.name}? They will be able to sign in to the agent portal again.`
            : ''
        }
        confirmLabel={agentToToggle?.user.isActive ? 'Deactivate' : 'Activate'}
        cancelLabel="Cancel"
        variant={agentToToggle?.user.isActive ? 'danger' : 'gradient'}
        loading={toggleLoading}
        error={toggleError}
        onConfirm={confirmToggle}
        onClose={() => {
          if (!toggleLoading) {
            setAgentToToggle(null)
            setToggleError('')
          }
        }}
      />
    </div>
  )
}
