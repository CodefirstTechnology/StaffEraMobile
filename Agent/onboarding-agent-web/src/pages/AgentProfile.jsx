import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { Button } from '../components/ui/Button'

const ROLE_LABELS = {
  ADMIN: 'Platform administrator',
  AGENT: 'Field agent',
}

function StatCard({ label, value, accent = 'text-primary' }) {
  return (
    <div className="rounded-2xl border border-outline-variant/40 bg-white/80 p-5 shadow-[var(--shadow-card)]">
      <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}

function SectionCard({ title, description, children }) {
  return (
    <section className="glass-card p-6">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-on-surface-variant">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

function InfoRow({ icon, label, value, mono }) {
  if (value == null || value === '') return null
  return (
    <div className="flex gap-3 border-b border-outline-variant/25 py-3 last:border-0 last:pb-0 first:pt-0">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-base" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-on-surface-variant">{label}</p>
        <p
          className={`mt-0.5 text-sm font-medium text-on-background break-words ${mono ? 'font-mono text-xs' : ''}`}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

function QuickLink({ to, title, subtitle, icon }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl border border-outline-variant/30 bg-white/60 p-4 transition-all hover:border-primary/30 hover:bg-white hover:shadow-[var(--shadow-card)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-lg text-white shadow-md">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-primary group-hover:text-secondary transition-colors">
          {title}
        </p>
        <p className="text-xs text-on-surface-variant">{subtitle}</p>
      </div>
      <span className="text-on-surface-variant/60 group-hover:text-primary" aria-hidden>
        →
      </span>
    </Link>
  )
}

export default function AgentProfile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'ADMIN'

  const { data: servants = [] } = useQuery({
    queryKey: ['agent-servants-profile'],
    queryFn: async () => {
      const res = await api.get('/agent/servants', { params: { limit: 100 } })
      return res.data.data.servants
    },
    enabled: !!user && ['AGENT', 'ADMIN'].includes(user.role),
  })

  const verified = servants.filter((s) => s.verificationStatus === 'VERIFIED').length
  const pending = servants.filter((s) =>
    ['PENDING', 'UNDER_REVIEW'].includes(s.verificationStatus),
  ).length

  const initials = (user?.name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const roleLabel = ROLE_LABELS[user?.role] || user?.role
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-lg bg-surface-container" />
        <div className="glass-card h-56" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-primary">Your profile</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Account details and agency information for the StaffEra agent portal.
        </p>
      </div>

      {/* Hero */}
      <div className="glass-card overflow-hidden">
        <div
          className="h-32 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)]"
          aria-hidden
        />
        <div className="relative px-6 pb-8 sm:px-8">
          <div className="-mt-16 flex flex-col gap-6 sm:flex-row sm:items-end">
            <div
              className="flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-primary-fixed text-4xl font-bold text-primary shadow-lg ring-2 ring-primary/10"
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-primary sm:text-3xl">{user.name}</h1>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    isAdmin
                      ? 'bg-secondary/15 text-secondary'
                      : 'bg-primary-fixed text-primary'
                  }`}
                >
                  {user.role}
                </span>
              </div>
              <p className="mt-2 text-sm text-on-surface-variant">{roleLabel}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface-variant">
                  <span aria-hidden>✉</span> {user.email}
                </span>
                {user.phone && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface-variant">
                    <span aria-hidden>📞</span> {user.phone}
                  </span>
                )}
                {user.agent?.city && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed px-3 py-1.5 text-xs font-medium text-primary">
                    <span aria-hidden>📍</span> {user.agent.city}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Servants onboarded" value={servants.length} />
        <StatCard
          label="Pending verification"
          value={pending}
          accent="text-tertiary-accent"
        />
        <StatCard label="Verified & live" value={verified} accent="text-emerald-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Account" description="Sign-in and identity on this portal.">
          <InfoRow icon="👤" label="Full name" value={user.name} />
          <InfoRow icon="✉" label="Email" value={user.email} />
          <InfoRow icon="📞" label="Phone" value={user.phone || 'Not set'} />
          <InfoRow icon="🛡" label="Access level" value={roleLabel} />
          <InfoRow icon="📅" label="Member since" value={memberSince} />
          <InfoRow icon="🆔" label="User ID" value={`#${user.id}`} mono />
        </SectionCard>

        <SectionCard
          title={isAdmin ? 'Workspace' : 'Agency'}
          description={
            isAdmin
              ? 'You have full platform access across all agents and bookings.'
              : 'Your registered agency details for onboarded staff.'
          }
        >
          {user.agent ? (
            <>
              <InfoRow
                icon="🏢"
                label="Agency name"
                value={user.agent.agencyName || 'Not set'}
              />
              <InfoRow icon="📍" label="City" value={user.agent.city || 'Not set'} />
              <InfoRow
                icon="🔢"
                label="Agent profile ID"
                value={`#${user.agent.id}`}
                mono
              />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-outline-variant/50 bg-surface-low/80 px-5 py-8 text-center">
              <p className="text-sm font-medium text-primary">No agency profile linked</p>
              <p className="mt-2 text-xs text-on-surface-variant leading-relaxed">
                {isAdmin
                  ? 'Admin accounts can manage the full platform from the Admin section in the sidebar.'
                  : 'Contact support to link an agency profile to your account.'}
              </p>
            </div>
          )}
          {isAdmin && (
            <div className="mt-4 rounded-xl bg-secondary/10 px-4 py-3 text-xs text-secondary leading-relaxed">
              Admin mode: you can review all servants, users, bookings, and skills from the
              sidebar.
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Quick actions" description="Jump to common tasks.">
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickLink
            to="/servants"
            title="My servants"
            subtitle="View and verify onboarded staff"
            icon="👥"
          />
          <QuickLink
            to="/servants/new"
            title="Onboard new servant"
            subtitle="Start the verification pipeline"
            icon="➕"
          />
          <QuickLink
            to="/"
            title="Pipeline dashboard"
            subtitle="Pending verifications at a glance"
            icon="📊"
          />
          {isAdmin && (
            <QuickLink
              to="/admin"
              title="Admin overview"
              subtitle="Platform-wide stats and controls"
              icon="⚙"
            />
          )}
        </div>
      </SectionCard>

      <SectionCard title="Session" description="Sign out on this device.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-on-surface-variant">
            You are signed in as <span className="font-semibold text-primary">{user.email}</span>.
            Use logout when leaving a shared computer.
          </p>
          <Button variant="danger" onClick={handleLogout} className="shrink-0 sm:min-w-[140px]">
            Sign out
          </Button>
        </div>
      </SectionCard>
    </div>
  )
}
