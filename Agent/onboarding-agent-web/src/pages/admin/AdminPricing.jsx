import { useState, useEffect, useMemo } from 'react'
import { useAdminQuery } from '../../hooks/useAuthenticatedQuery'
import { useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../context/ToastContext'
import {
  PageHeader,
  StatCard,
  LoadingSkeleton,
  inputClass,
} from '../../components/admin/adminUi'

function fieldInputClass(invalid = false) {
  return `${inputClass()}${invalid ? ' !border-error focus:!border-error' : ''}`
}

function PricingField({ label, required, error, hint, children }) {
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

function formatAmount(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

export default function AdminPricing() {
  const toast = useToast()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    minHourlyRate: '50',
    maxHourlyRate: '1000',
    minMonthlyRate: '3000',
    maxMonthlyRate: '50000',
    platformFeePercentage: '10',
  })

  // Test Calculator State
  const [simType, setSimType] = useState('SESSION')
  const [simRate, setSimRate] = useState('200')
  const [simDuration, setSimDuration] = useState('4')

  const { data: pricingData, isLoading } = useAdminQuery({
    queryKey: ['admin-pricing'],
    queryFn: async () => {
      const res = await api.get('/admin/pricing')
      return res.data.data.pricing
    },
  })

  useEffect(() => {
    if (pricingData) {
      setForm({
        minHourlyRate: String(pricingData.minHourlyRate ?? 50),
        maxHourlyRate: String(pricingData.maxHourlyRate ?? 1000),
        minMonthlyRate: String(pricingData.minMonthlyRate ?? 3000),
        maxMonthlyRate: String(pricingData.maxMonthlyRate ?? 50000),
        platformFeePercentage: String(pricingData.platformFeePercentage ?? 10),
      })
    }
  }, [pricingData])

  // Calculation Simulator
  const simBreakdown = useMemo(() => {
    const rate = Number(simRate) || 0
    const duration = Number(simDuration) || 1
    const subtotal = rate * duration
    const feePct = Number(form.platformFeePercentage) || 0
    const platformFee = Math.round(subtotal * (feePct / 100) * 100) / 100
    const total = Math.round((subtotal + platformFee) * 100) / 100

    return {
      subtotal,
      platformFee,
      feePct,
      total,
    }
  }, [simRate, simDuration, form.platformFeePercentage])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const payload = {
        minHourlyRate: parseFloat(form.minHourlyRate),
        maxHourlyRate: parseFloat(form.maxHourlyRate),
        minMonthlyRate: parseFloat(form.minMonthlyRate),
        maxMonthlyRate: parseFloat(form.maxMonthlyRate),
        platformFeePercentage: parseFloat(form.platformFeePercentage),
      }

      if (payload.minHourlyRate >= payload.maxHourlyRate) {
        throw new Error('Min hourly rate must be less than max hourly rate')
      }
      if (payload.minMonthlyRate >= payload.maxMonthlyRate) {
        throw new Error('Min monthly rate must be less than max monthly rate')
      }

      await api.put('/admin/pricing', payload)
      await qc.invalidateQueries({ queryKey: ['admin-pricing'] })
      toast.success('Platform pricing & limits updated successfully')
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to save pricing config'
      setError(errMsg)
      toast.error(errMsg)
    } finally {
      setSaving(false)
    }
  }

  const statCards = [
    {
      label: 'Hourly Rate Limits',
      value: `₹${form.minHourlyRate} – ₹${form.maxHourlyRate}`,
      sub: 'Permitted per-hour range for helpers',
      accent: 'text-primary',
    },
    {
      label: 'Monthly Rate Limits',
      value: `₹${form.minMonthlyRate} – ₹${form.maxMonthlyRate}`,
      sub: 'Permitted monthly range for helpers',
      accent: 'text-secondary',
    },
    {
      label: 'Platform Service Fee',
      value: `${form.platformFeePercentage}%`,
      sub: 'Applied on house owner bookings',
      accent: 'text-amber-700',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing & Platform Limits"
        description="Configure helper minimum/maximum rates and platform commission fees applied to bookings."
      />

      {isLoading ? (
        <LoadingSkeleton cards={3} rows={4} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {statCards.map((c) => (
              <StatCard key={c.label} label={c.label} value={c.value} sub={c.sub} accent={c.accent} />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-12 items-start">
            <section className="glass-card lg:col-span-7 p-6 space-y-5">
              <div>
                <h3 className="text-lg font-bold text-primary">Helper Rate & Fee Configuration</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Enforced during helper onboarding and house owner booking calculation.
                </p>
              </div>

              {error ? (
                <div className="rounded-xl border border-error/20 bg-error/5 p-3 text-xs text-error">
                  {error}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <PricingField label="Min Hourly Rate (₹)" required hint="Minimum rate per hour">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className={fieldInputClass()}
                      value={form.minHourlyRate}
                      onChange={(e) => setForm((f) => ({ ...f, minHourlyRate: e.target.value }))}
                      required
                    />
                  </PricingField>

                  <PricingField label="Max Hourly Rate (₹)" required hint="Maximum rate per hour">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className={fieldInputClass()}
                      value={form.maxHourlyRate}
                      onChange={(e) => setForm((f) => ({ ...f, maxHourlyRate: e.target.value }))}
                      required
                    />
                  </PricingField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PricingField label="Min Monthly Rate (₹)" required hint="Minimum monthly salary">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className={fieldInputClass()}
                      value={form.minMonthlyRate}
                      onChange={(e) => setForm((f) => ({ ...f, minMonthlyRate: e.target.value }))}
                      required
                    />
                  </PricingField>

                  <PricingField label="Max Monthly Rate (₹)" required hint="Maximum monthly salary">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className={fieldInputClass()}
                      value={form.maxMonthlyRate}
                      onChange={(e) => setForm((f) => ({ ...f, maxMonthlyRate: e.target.value }))}
                      required
                    />
                  </PricingField>
                </div>

                <PricingField label="Platform Service Fee (%)" required hint="Percentage fee added to house owner booking subtotal">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    className={fieldInputClass()}
                    value={form.platformFeePercentage}
                    onChange={(e) => setForm((f) => ({ ...f, platformFeePercentage: e.target.value }))}
                    required
                  />
                </PricingField>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="gradient" disabled={saving}>
                    {saving ? 'Saving changes…' : 'Save pricing config'}
                  </Button>
                </div>
              </form>
            </section>

            {/* Live Pricing Simulator */}
            <section className="glass-card lg:col-span-5 p-6 space-y-5">
              <div>
                <h3 className="text-lg font-bold text-primary">Price Calculation Simulator</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Preview exact price breakdown shown to house owner on booking confirmation.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex rounded-xl bg-surface-container/60 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSimType('SESSION')
                      setSimRate('200')
                      setSimDuration('4')
                    }}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                      simType === 'SESSION'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-background'
                    }`}
                  >
                    Hourly Session
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimType('MONTHLY')
                      setSimRate('12000')
                      setSimDuration('1')
                    }}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                      simType === 'MONTHLY'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-background'
                    }`}
                  >
                    Monthly Contract
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <PricingField label={simType === 'SESSION' ? 'Helper Hourly Rate (₹)' : 'Helper Monthly Rate (₹)'}>
                    <input
                      type="number"
                      className={fieldInputClass()}
                      value={simRate}
                      onChange={(e) => setSimRate(e.target.value)}
                    />
                  </PricingField>
                  <PricingField label={simType === 'SESSION' ? 'Hours requested' : 'Months requested'}>
                    <input
                      type="number"
                      min="1"
                      className={fieldInputClass()}
                      value={simDuration}
                      onChange={(e) => setSimDuration(e.target.value)}
                    />
                  </PricingField>
                </div>

                <div className="rounded-2xl border border-outline-variant/30 bg-surface-low/80 p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    House Owner Confirmation Summary
                  </h4>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-on-surface-variant">
                      <span>
                        Base Servant Charge ({formatAmount(simRate)} × {simDuration} {simType === 'SESSION' ? 'hrs' : 'mo'})
                      </span>
                      <span className="font-semibold text-primary">{formatAmount(simBreakdown.subtotal)}</span>
                    </div>

                    <div className="flex justify-between text-on-surface-variant">
                      <span>Platform Service Fee ({simBreakdown.feePct}%)</span>
                      <span className="font-semibold text-amber-700">+{formatAmount(simBreakdown.platformFee)}</span>
                    </div>

                    <div className="my-2 border-t border-outline-variant/20 pt-2 flex justify-between text-base font-bold text-primary">
                      <span>Total House Owner Amount</span>
                      <span className="text-secondary text-lg">{formatAmount(simBreakdown.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
