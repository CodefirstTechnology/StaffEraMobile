import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { uploadUrl } from '../lib/mediaUrl'
import { Badge } from '../components/ui/Badge'
import { VerifiedBadge } from '../components/ui/VerifiedBadge'
import { Button } from '../components/ui/Button'
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
  SkillChips,
} from '../components/admin/adminUi'

const CATEGORY_OPTIONS = [
  ['', 'My servants'],
  ['onboarded', 'Agent onboarded'],
]

const STATUS_OPTIONS = [
  ['', 'All statuses'],
  ['PENDING', 'Pending'],
  ['UNDER_REVIEW', 'Under review'],
  ['VERIFIED', 'Verified'],
  ['REJECTED', 'Rejected'],
]

function ServantPhoto({ name, profilePhoto }) {
  if (profilePhoto) {
    return (
      <img
        src={uploadUrl(profilePhoto)}
        alt=""
        className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm ring-2 ring-white"
      />
    )
  }
  return <Avatar name={name} />
}

export function getPhoneDisplayParts(user) {
  if (!user || !user.phone) return { countryCode: '—', mobileNumber: '—' }
  
  if (user.phoneCountryCode) {
    return {
      countryCode: user.phoneCountryCode,
      mobileNumber: user.phone
    }
  }

  let phoneVal = user.phone
  let ccVal = '—'
  if (phoneVal.startsWith('+91')) {
    ccVal = '+91'
    phoneVal = phoneVal.substring(3)
  } else if (phoneVal.startsWith('91') && phoneVal.length > 10) {
    ccVal = '+91'
    phoneVal = phoneVal.substring(2)
  } else if (phoneVal.length > 10) {
    if (phoneVal.startsWith('+')) {
      const match = phoneVal.match(/^\+(\d{1,4})(.*)$/)
      if (match) {
        ccVal = '+' + match[1]
        phoneVal = match[2]
      }
    } else {
      const ccLen = phoneVal.length - 10
      ccVal = '+' + phoneVal.substring(0, ccLen)
      phoneVal = phoneVal.substring(ccLen)
    }
  }

  return { countryCode: ccVal, mobileNumber: phoneVal }
}

import { Pagination } from '../components/ui/Pagination'

export default function ServantList() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  useEffect(() => {
    setCategory(searchParams.get('category') || '')
    setPage(1)
  }, [searchParams])

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus)
    setPage(1)
  }

  const handleSearchChange = (newSearch) => {
    setSearch(newSearch)
    setPage(1)
  }

  const handleCategoryChange = (newCat) => {
    setCategory(newCat)
    setPage(1)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['agent-servants', status, search, category, page, limit],
    queryFn: async () => {
      const res = await api.get('/agent/servants', {
        params: {
          status: status || undefined,
          search: search || undefined,
          category: category || undefined,
          page,
          limit,
        },
      })
      return res.data.data
    },
  })

  const { data: allServantsData } = useQuery({
    queryKey: ['agent-servants-all'],
    queryFn: async () => {
      const res = await api.get('/agent/servants', {
        params: { limit: 1000 },
      })
      return res.data.data.servants
    },
  })

  const servants = data?.servants || []
  const total = data?.pagination?.total ?? servants.length
  const allServants = allServantsData || []

  const stats = useMemo(() => {
    const verified = allServants.filter((s) => s.verificationStatus === 'VERIFIED').length
    const pending = allServants.filter((s) =>
      ['PENDING', 'UNDER_REVIEW'].includes(s.verificationStatus),
    ).length
    return { total: allServants.length, verified, pending }
  }, [allServants])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="My servants"
        description={
          <>
            Staff you onboarded and verified. App sign-ups live under{' '}
            <Link to="/registrations" className="font-semibold text-secondary hover:underline">
              App registrations
            </Link>
            .
          </>
        }
        action={
          <Link to="/servants/new">
            <Button variant="gradient">+ Onboard servant</Button>
          </Link>
        }
      />

      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Verified" value={stats.verified} accent="text-emerald-600" />
          <StatCard label="Pending review" value={stats.pending} accent="text-amber-600" />
        </div>
      )}

      <FilterBar
        count={total}
        countLabel="total servants"
      >
        <SelectFilter value={category} onChange={handleCategoryChange} options={CATEGORY_OPTIONS} />
        <SelectFilter value={status} onChange={handleStatusChange} options={STATUS_OPTIONS} />
        <SearchInput value={search} onChange={handleSearchChange} placeholder="Search by name, mobile no…" />
      </FilterBar>

      {isLoading ? (
        <LoadingSkeleton cards={3} rows={5} />
      ) : servants.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No servants in this view"
          description="Onboard a new helper or adjust your filters."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:hidden">
            {servants.map((s) => (
              <MobileCard key={s.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ServantPhoto name={s.user?.name} profilePhoto={s.profilePhoto} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/servants/${s.id}`}
                          className="font-semibold text-primary hover:text-secondary truncate"
                        >
                          {s.user?.name}
                        </Link>
                        {s.verificationStatus === 'VERIFIED' && <VerifiedBadge />}
                      </div>
                      <p className="text-xs text-on-surface-variant truncate">{s.user?.email}</p>
                    </div>
                  </div>
                  <Badge status={s.verificationStatus} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-outline-variant/20 pt-3 text-xs">
                  <span className="text-on-surface-variant">{s.user?.phone || '—'}</span>
                  <div className="flex gap-2">
                    <Link
                      to={`/servants/${s.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      View
                    </Link>
                    <Link
                      to={`/servants/${s.id}/edit`}
                      className="font-semibold text-secondary hover:underline"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </MobileCard>
            ))}
          </div>

          <DataTable
            columns={['Servant', 'Country', 'Mobile', 'Skills', 'Status', 'Actions']}
          >
            {servants.map((s) => {
              const { countryCode, mobileNumber } = getPhoneDisplayParts(s.user)
              return (
                <TableRow key={s.id}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <ServantPhoto name={s.user?.name} profilePhoto={s.profilePhoto} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Link
                            to={`/servants/${s.id}`}
                            className="font-semibold text-primary hover:text-secondary"
                          >
                            {s.user?.name}
                          </Link>
                          {s.verificationStatus === 'VERIFIED' && <VerifiedBadge />}
                        </div>
                        <p className="text-xs text-on-surface-variant">{s.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant">{countryCode}</td>
                  <td className="px-4 py-4 text-on-surface-variant">{mobileNumber}</td>
                  <td className="px-4 py-4 max-w-[200px]">
                    <SkillChips skills={s.skills} max={2} />
                  </td>
                  <td className="px-4 py-4">
                    <Badge status={s.verificationStatus} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <Link
                        to={`/servants/${s.id}`}
                        className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
                      >
                        View
                      </Link>
                      <Link
                        to={`/servants/${s.id}/edit`}
                        className="rounded-lg border border-outline-variant/40 px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-low"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </TableRow>
              )
            })}
          </DataTable>

          <Pagination
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
      )}
    </div>
  )
}
