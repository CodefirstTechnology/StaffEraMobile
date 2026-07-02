import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import {
  PageHeader,
  StatCard,
  ActivePill,
  LoadingSkeleton,
  EmptyState,
  DataTable,
  TableRow,
  MobileCard,
  inputClass,
} from '../../components/admin/adminUi'

const SKILL_EMOJI = {
  COOKING: '👨‍🍳',
  CLEANING: '🧹',
  CHILDCARE: '👶',
  DRIVING: '🚗',
  LAUNDRY: '🧺',
  ELDERLY_CARE: '🤝',
  GARDENING: '🌿',
}

function skillEmoji(code, label) {
  const key = String(code || label || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  return SKILL_EMOJI[key] || '✨'
}

function fieldInputClass(invalid = false) {
  return `${inputClass()}${invalid ? ' !border-error focus:!border-error' : ''}`
}

function SkillField({ label, required, error, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-on-background">
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </span>
      {children}
      {error ? (
        <span className="text-xs font-medium text-error">{error}</span>
      ) : hint ? (
        <span className="text-xs text-on-surface-variant">{hint}</span>
      ) : null}
    </label>
  )
}

function validateLabel(value) {
  if (!value.length) return 'This field is required'
  if (!value.trim().length) return 'Label cannot contain only spaces'
  if (value.trim().length < 2) return 'Label must be at least 2 characters'
  return ''
}

function validateSortOrder(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return ''

  if (/^-/.test(trimmed) || Number(trimmed) < 0) {
    return 'Sort order must be 0 or greater'
  }
  if (/[.,]/.test(trimmed)) {
    return 'Sort order must be a whole number'
  }
  if (!/^\d+$/.test(trimmed)) {
    return 'Enter a valid whole number'
  }
  return ''
}

function parseSortOrder(value) {
  const trimmed = String(value ?? '').trim()
  return trimmed ? Number(trimmed) : 0
}

export default function AdminSkills() {
  const qc = useQueryClient()
  const [label, setLabel] = useState('')
  const [code, setCode] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({ label: '', sortOrder: '' })
  const [submitting, setSubmitting] = useState(false)
  const [skillToRemove, setSkillToRemove] = useState(null)
  const [removeLoading, setRemoveLoading] = useState(false)
  const [removeError, setRemoveError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-skills'],
    queryFn: async () => {
      const res = await api.get('/admin/skills')
      return res.data.data.skills
    },
  })

  const skills = data || []

  const stats = useMemo(() => {
    const active = skills.filter((s) => s.isActive).length
    return {
      total: skills.length,
      active,
      inactive: skills.length - active,
    }
  }, [skills])

  const resetForm = () => {
    setLabel('')
    setCode('')
    setSortOrder('')
    setError('')
    setFieldErrors({ label: '', sortOrder: '' })
  }

  const createSkill = async (e) => {
    e.preventDefault()
    setError('')
    const labelError = validateLabel(label)
    const sortOrderError = validateSortOrder(sortOrder)
    setFieldErrors({ label: labelError, sortOrder: sortOrderError })
    if (labelError || sortOrderError) return

    setSubmitting(true)
    try {
      await api.post('/admin/skills', {
        label: label.trim(),
        code: code.trim() || undefined,
        sortOrder: parseSortOrder(sortOrder),
      })
      resetForm()
      qc.invalidateQueries({ queryKey: ['admin-skills'] })
      qc.invalidateQueries({ queryKey: ['skills'] })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add skill')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (skill) => {
    await api.patch(`/admin/skills/${skill.id}`, { isActive: !skill.isActive })
    qc.invalidateQueries({ queryKey: ['admin-skills'] })
    qc.invalidateQueries({ queryKey: ['skills'] })
  }

  const removeSkill = async () => {
    if (!skillToRemove) return
    setRemoveLoading(true)
    setRemoveError('')
    try {
      await api.delete(`/admin/skills/${skillToRemove.id}`)
      qc.invalidateQueries({ queryKey: ['admin-skills'] })
      qc.invalidateQueries({ queryKey: ['skills'] })
      setSkillToRemove(null)
    } catch (err) {
      setRemoveError(err.response?.data?.message || 'Failed to remove skill')
    } finally {
      setRemoveLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Skills catalog"
        description="Manage service skills shown on servant onboarding, profiles, and house owner browse filters."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total skills" value={stats.total} accent="text-primary" />
        <StatCard label="Active" value={stats.active} accent="text-emerald-600" />
        <StatCard label="Inactive" value={stats.inactive} accent="text-amber-600" />
      </div>

      <form onSubmit={createSkill} noValidate className="glass-card space-y-5 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-primary">Add skill</h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              Create a new service category for the marketplace.
            </p>
          </div>
          <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
            Required: label only
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SkillField label="Label" required error={fieldErrors.label}>
            <input
              value={label}
              onChange={(e) => {
                setLabel(e.target.value)
                if (fieldErrors.label) {
                  setFieldErrors((prev) => ({ ...prev, label: '' }))
                }
              }}
              onBlur={() => {
                if (label.length) {
                  setFieldErrors((prev) => ({ ...prev, label: validateLabel(label) }))
                }
              }}
              placeholder="e.g. Elderly care"
              className={fieldInputClass(!!fieldErrors.label)}
              aria-invalid={!!fieldErrors.label}
            />
          </SkillField>
          <SkillField label="Code" hint="Optional — auto-generated from label if empty">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ELDERLY_CARE"
              className={fieldInputClass()}
            />
          </SkillField>
          <SkillField
            label="Sort order"
            error={fieldErrors.sortOrder}
            hint="Optional — whole numbers only (0, 1, 2…). Leave empty for 0."
          >
            <input
              type="text"
              autoComplete="off"
              value={sortOrder}
              onChange={(e) => {
                const next = e.target.value
                setSortOrder(next)
                setFieldErrors((prev) => ({
                  ...prev,
                  sortOrder: next.length ? validateSortOrder(next) : '',
                }))
              }}
              onBlur={() => {
                setFieldErrors((prev) => ({
                  ...prev,
                  sortOrder: validateSortOrder(sortOrder),
                }))
              }}
              placeholder="0"
              className={fieldInputClass(!!fieldErrors.sortOrder)}
              aria-invalid={!!fieldErrors.sortOrder}
            />
          </SkillField>
        </div>

        {error ? (
          <div className="rounded-xl border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
            {error}
          </div>
        ) : null}

        <Button type="submit" variant="gradient" disabled={submitting}>
          {submitting ? 'Adding…' : '+ Add skill'}
        </Button>
      </form>

      {isLoading ? (
        <LoadingSkeleton cards={0} rows={5} />
      ) : skills.length === 0 ? (
        <EmptyState
          icon="🛠️"
          title="No skills yet"
          description="Add your first skill above — for example Cooking, Cleaning, or Childcare."
        />
      ) : (
        <>
          <DataTable columns={['Skill', 'Code', 'Order', 'Status', 'Actions']}>
            {skills.map((skill) => (
              <TableRow key={skill.id}>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-fixed to-secondary/10 text-lg"
                      aria-hidden
                    >
                      {skillEmoji(skill.code, skill.label)}
                    </span>
                    <div>
                      <p className="font-semibold text-primary">{skill.label}</p>
                      <p className="text-xs text-on-surface-variant">ID #{skill.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <code className="rounded-lg bg-surface-low px-2 py-1 text-xs font-medium text-secondary">
                    {skill.code}
                  </code>
                </td>
                <td className="px-4 py-4 font-medium text-on-background">{skill.sortOrder}</td>
                <td className="px-4 py-4">
                  <ActivePill active={skill.isActive} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => toggleActive(skill)}>
                      {skill.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        setRemoveError('')
                        setSkillToRemove(skill)
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </td>
              </TableRow>
            ))}
          </DataTable>

          <div className="space-y-3 lg:hidden">
            {skills.map((skill) => (
              <MobileCard key={skill.id}>
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-fixed to-secondary/10 text-xl"
                    aria-hidden
                  >
                    {skillEmoji(skill.code, skill.label)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-primary">{skill.label}</p>
                      <ActivePill active={skill.isActive} />
                    </div>
                    <p className="mt-1 font-mono text-xs text-secondary">{skill.code}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      Sort order: {skill.sortOrder}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => toggleActive(skill)}>
                        {skill.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          setRemoveError('')
                          setSkillToRemove(skill)
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </MobileCard>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!skillToRemove}
        title="Remove skill?"
        description={
          skillToRemove
            ? `Remove "${skillToRemove.label}" from the catalog? Servants already assigned this skill will keep it, but it will no longer appear for new onboarding or browse filters.`
            : ''
        }
        confirmLabel="Remove skill"
        cancelLabel="Cancel"
        variant="danger"
        loading={removeLoading}
        error={removeError}
        onConfirm={removeSkill}
        onClose={() => {
          if (!removeLoading) {
            setSkillToRemove(null)
            setRemoveError('')
          }
        }}
      />
    </div>
  )
}
