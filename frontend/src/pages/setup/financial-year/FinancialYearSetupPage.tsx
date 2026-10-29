import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../modules/auth/hooks/useAuth'
import { companyApi } from '../../../modules/company/api/company.api'
import { financialYearApi } from '../../../modules/financial-year/api/financial-year.api'
import type { FinancialPeriod } from '../../../modules/financial-year/financial-year.types'
import { useToast } from '../../../modules/toast/hooks/useToast'
import { ApiError } from '../../../shared/api/httpClient'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { DataTable, type Column } from '../../../shared/components/DataTable'
import { PageContainer } from '../../../shared/components/PageContainer'
import { SearchableSelect } from '../../../shared/components/SearchableSelect'
import { SkeletonBoundary, TableSkeleton } from '../../../shared/components/Skeleton'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_OPTIONS = MONTHS.map((name, index) => ({ value: String(index + 1), label: name, description: `Month ${index + 1}` }))
const monthName = (month: number) => MONTHS[month - 1] ?? ''

function buildPreview(companyId: string, startMonth: number): FinancialPeriod[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = ((startMonth + index - 1) % 12) + 1
    return {
      companyId,
      period: index + 1,
      month,
      monthName: monthName(month),
      quarter: Math.floor(index / 3) + 1,
      createdBy: '',
      createdAt: '',
      updatedBy: null,
      updatedAt: null,
    }
  })
}

export function FinancialYearSetupPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [companyId, setCompanyId] = useState('')
  const [periods, setPeriods] = useState<FinancialPeriod[]>([])
  const [startMonth, setStartMonth] = useState(1)
  const [savedStartMonth, setSavedStartMonth] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const isFinancialYearAdmin = Boolean(user?.superAdmin || user?.organizations.some((organization) => organization.roles.includes('COMPANY_ADMIN')))
  const dirty = companyId !== '' && startMonth !== savedStartMonth

  const load = useCallback(async (id: string) => {
    if (!id) { setPeriods([]); setSavedStartMonth(null); setLoading(false); return }
    setLoading(true)
    setPeriods([])
    setSavedStartMonth(null)
    try {
      const next = await financialYearApi.list(id)
      const firstMonth = next[0]?.month ?? 1
      setStartMonth(firstMonth)
      setSavedStartMonth(next.length === 12 ? firstMonth : null)
      setPeriods(next.length === 12 ? next : buildPreview(id, firstMonth))
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : 'Unable to load financial year setup.', 'Financial year unavailable')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (!isFinancialYearAdmin) { setLoading(false); return }
    void (async () => {
      try {
        const next = await companyApi.companies()
        const assigned = user?.organizations[0]?.organizationId
        const id = !user?.superAdmin && assigned ? assigned : (next[0]?.id ?? '')
        setCompanyId(id)
        await load(id)
      } catch (reason) {
        toast.error(reason instanceof ApiError ? reason.message : 'Unable to load companies.', 'Company data unavailable')
        setLoading(false)
      }
    })()
  }, [isFinancialYearAdmin, load, toast, user])

  const columns = useMemo<Column<FinancialPeriod>[]>(() => [
    { key: 'period', header: 'Period', align: 'center', render: (item) => <strong>{item.period}</strong> },
    { key: 'month', header: 'Month', align: 'center', render: (item) => item.month },
    { key: 'monthName', header: 'Month name', render: (item) => item.monthName },
    { key: 'quarter', header: 'Quarter', align: 'center', render: (item) => <span className="inline-flex min-w-9 justify-center rounded-full bg-[#e5f0eb] px-2 py-1 font-medium text-[#285c60]">Q{item.quarter}</span> },
  ], [])

  async function save() {
    if (!companyId) return
    setSaving(true)
    try {
      const next = await financialYearApi.update(companyId, startMonth)
      setPeriods(next)
      setSavedStartMonth(startMonth)
      toast.success('Financial year periods saved.', 'Setup updated')
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : 'Unable to save financial year setup.', 'Setup was not saved')
    } finally {
      setSaving(false)
    }
  }

  const selectStartMonth = (value: string) => {
    const month = Number(value)
    setStartMonth(month)
    setPeriods(buildPreview(companyId, month))
  }

  const crumbs = [{ label: 'Dashboard', to: '/' }, { label: 'Setup' }, { label: 'Financial year setup' }]
  if (!isFinancialYearAdmin) return <PageContainer breadcrumbs={crumbs} title="Access denied"><Card>Only a super administrator or company administrator can access financial year setup.</Card></PageContainer>

  return <PageContainer
    breadcrumbs={crumbs}
    title="Financial year setup"
  >
    <Card>
      <div className="mb-5 flex flex-wrap items-end gap-3 border-b border-[#d7e3de] pb-5">
        <label className="grid w-full max-w-72 gap-2 text-[13px] font-medium text-[#405653]">
          Financial year starts in
          <SearchableSelect ariaLabel="Financial year start month" options={MONTH_OPTIONS} value={String(startMonth)} onChange={selectStartMonth} disabled={!companyId || loading} />
        </label>
        {companyId && <Button className="h-[43px] shrink-0 self-end py-0" disabled={!dirty || saving || loading} onClick={() => void save()}>{saving ? 'Updating...' : 'Update'}</Button>}
        <p className="min-w-64 flex-1 rounded-lg bg-white/75 px-4 py-[11px] text-[13px] leading-5 text-[#526b67]">
          Period 1 begins in <strong className="text-[#294b4e]">{monthName(startMonth)}</strong>. The twelve periods and four quarters are generated automatically.
        </p>
      </div>
        <SkeletonBoundary loading={loading} fallback={<TableSkeleton columns={4} rows={12} />} minimumDurationMs={500}>
          <DataTable columns={columns} rows={periods} rowKey={(item) => item.period} emptyMessage="No financial year periods are configured." />
        </SkeletonBoundary>
    </Card>
  </PageContainer>
}
