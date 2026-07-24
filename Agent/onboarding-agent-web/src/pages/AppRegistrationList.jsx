import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { VerifiedBadge } from '../components/ui/VerifiedBadge'
import { Button } from '../components/ui/Button'
import { SetPasswordModal } from '../components/SetPasswordModal'
import { CredentialsBanner } from '../components/CredentialsBanner'
import { getMissingProfileFields } from '../lib/onboardingReport'
import {
  PageHeader,
  StatCard,
  Avatar,
  FilterBar,
  SelectFilter,
  SearchInput,
  LoadingSkeleton,
  EmptyState,
  DataTable,
  TableRow,
  MobileCard,
  InfoBanner,
  PasswordPill,
} from '../components/admin/adminUi'

const STATUS_OPTIONS = [
  ['', 'All statuses'],
  ['PENDING', 'Pending'],
  ['UNDER_REVIEW', 'Under review'],
]

import { Pagination } from '../components/ui/Pagination'

export default function AppRegistrationList() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [passwordTarget, setPasswordTarget] = useState(null)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSaveError, setPasswordSaveError] = useState('')
  const [credentials, setCredentials] = useState(null)

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus)
    setPage(1)
  }

  const handleSearchChange = (newSearch) => {
    setSearch(newSearch)
    setPage(1)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['agent-registrations', status, search, page, limit],
    queryFn: async () => {
      const res = await api.get('/agent/servants', {
        params: {
          category: 'registered',
          status: status || undefined,
          search: search || undefined,
          page,
          limit,
        },
      })
      return {
        servants: res.data.data.servants,
        total: res.data.data.pagination?.total ?? res.data.data.servants.length,
        locationNotice: res.data.data.locationNotice,
      }
    },
  })

  const { data: allRegistrationsData } = useQuery({
    queryKey: ['agent-registrations-all'],
    queryFn: async () => {
      const res = await api.get('/agent/servants', {
        params: {
          category: 'registered',
          limit: 1000,
        },
      })
      return res.data.data.servants
    },
  })

  const rows = data?.servants || []
  const allRows = allRegistrationsData || []
  const locationNotice = data?.locationNotice

  const stats = useMemo(() => {
    const pending = allRows.filter((s) =>
      ['PENDING', 'UNDER_REVIEW'].includes(s.verificationStatus),
    ).length
    const needPassword = allRows.filter((s) => !s.user.agentSetPassword).length
    return { total: allRows.length, pending, needPassword }
  }, [allRows])

  const savePassword = async ({ password }) => {
    if (!passwordTarget) return
    setPasswordLoading(true)
    setPasswordSaveError('')
    try {
      const res = await api.patch(`/agent/servants/${passwordTarget.id}/password`, {
        password,
      })
      qc.invalidateQueries({ queryKey: ['agent-registrations'] })
      qc.invalidateQueries({ queryKey: ['agent-registrations-all'] })
      qc.invalidateQueries({ queryKey: ['servant', String(passwordTarget.id)] })
      setCredentials(res.data?.data?.credentials || null)
      setPasswordTarget(null)
      setPasswordSaveError('')
    } catch (e) {
      setPasswordSaveError(e.response?.data?.message || 'Failed to save password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const closePasswordModal = () => {
    setPasswordTarget(null)
    setPasswordSaveError('')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inbox"
        title="App registrations"
        description="Helpers who signed up in the Servant app within your agency service radius."
        action={
          <Link to="/servants">
            <Button variant="secondary">My servants</Button>
          </Link>
        }
      />

      <CredentialsBanner credentials={credentials} onDone={() => setCredentials(null)} />

      {locationNotice && <InfoBanner variant="violet">{locationNotice}</InfoBanner>}

      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Registrations" value={stats.total} accent="text-violet-700" />
          <StatCard label="Pending review" value={stats.pending} accent="text-amber-600" />
          <StatCard
            label="Need password"
            value={stats.needPassword}
            accent="text-secondary"
            sub="Set login before approval"
          />
        </div>
      )}

      <FilterBar
        count={data?.total ?? rows.length}
        countLabel="total registrations"
      >
        <SelectFilter value={status} onChange={handleStatusChange} options={STATUS_OPTIONS} />
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by name, mobile no…"
        />
      </FilterBar>

      {isLoading ? (
        <LoadingSkeleton cards={3} rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="📱"
          title="No app registrations yet"
          description="Set your agency location and radius in Profile to receive nearby sign-ups."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:hidden">
            {rows.map((s) => (
              <MobileCard key={s.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.user.name} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-primary">{s.user.name}</span>
                        {s.verificationStatus === 'VERIFIED' && <VerifiedBadge />}
                      </div>
                      <p className="text-xs text-on-surface-variant">{s.user.email}</p>
                    </div>
                  </div>
                  <Badge status={s.verificationStatus} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-outline-variant/20 pt-3">
                  <PasswordPill set={s.user.agentSetPassword} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPasswordTarget(s)}
                      className="text-xs font-semibold text-secondary hover:underline"
                    >
                      {s.user.agentSetPassword ? 'Password' : 'Set password'}
                    </button>
                    <Link
                      to={`/servants/${s.id}?from=registrations`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Review →
                    </Link>
                  </div>
                </div>
              </MobileCard>
            ))}
          </div>

          <DataTable
            columns={['Applicant', 'Contact', 'Password', 'Status', 'Actions']}
          >
            {rows.map((s) => (
              <TableRow key={s.id}>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.user.name} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-primary">{s.user.name}</span>
                        {s.verificationStatus === 'VERIFIED' && <VerifiedBadge />}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <p className="text-sm">{s.user.email}</p>
                  <p className="text-xs text-on-surface-variant">{s.user.phone || '—'}</p>
                </td>
                <td className="px-4 py-4">
                  <PasswordPill set={s.user.agentSetPassword} />
                </td>
                <td className="px-4 py-4">
                  <Badge status={s.verificationStatus} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPasswordTarget(s)}
                      className="rounded-lg bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary/15"
                    >
                      {s.user.agentSetPassword ? 'Password' : 'Set password'}
                    </button>
                    <Link
                      to={`/servants/${s.id}?from=registrations`}
                      className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
                    >
                      Review
                    </Link>
                  </div>
                </td>
              </TableRow>
            ))}
          </DataTable>

          <Pagination
            page={page}
            limit={limit}
            total={data?.total ?? rows.length}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
      )}

      <SetPasswordModal
        open={!!passwordTarget}
        registration={passwordTarget}
        loading={passwordLoading}
        saveError={passwordSaveError}
        onSaveErrorClear={() => setPasswordSaveError('')}
        onClose={closePasswordModal}
        onSaved={savePassword}
        missingFields={passwordTarget ? getMissingProfileFields(passwordTarget) : []}
      />
    </div>
  )
}
