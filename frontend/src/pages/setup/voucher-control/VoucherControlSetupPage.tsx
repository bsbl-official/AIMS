import { Pencil, Save, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../modules/auth/hooks/useAuth'
import { companyApi } from '../../../modules/company/api/company.api'
import type { Company } from '../../../modules/company/company.types'
import { useToast } from '../../../modules/toast/hooks/useToast'
import { voucherSetupApi } from '../../../modules/voucher-setup/api/voucher-setup.api'
import type { VoucherSetup } from '../../../modules/voucher-setup/voucher-setup.types'
import { ApiError } from '../../../shared/api/httpClient'
import { Card } from '../../../shared/components/Card'
import { PageContainer } from '../../../shared/components/PageContainer'
import { SkeletonBoundary, TableSkeleton } from '../../../shared/components/Skeleton'
import { TableActionButton } from '../../../shared/components/TableActionButton'
import { CompanyCodeSelector } from '../../../shared/components/codes/CompanyCodeSelector'
import { setupInputClass } from '../../../shared/components/forms/SetupFormField'
import { Switch } from '../../../shared/components/ui/Switch'
import { useOrganizationContext, useOrganizationDirty } from '../../../modules/organization-context/useOrganizationContext'

type ControlDraft = { autoVoucher: boolean; voucherLastNo: string }

const message = (reason: unknown) => reason instanceof ApiError ? reason.message : 'Unable to complete the request.'

export function VoucherControlSetupPage() {
  const { can, user } = useAuth()
  const {branchId}=useOrganizationContext()
  const toast = useToast()
  const canView = can('voucher_setup.read') || can('voucher_setup.manage')
  const canEdit = can('voucher_setup.manage')
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyId, setCompanyId] = useState('')
  const [items, setItems] = useState<VoucherSetup[]>([])
  const [drafts, setDrafts] = useState<Record<string, ControlDraft>>({})
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  useOrganizationDirty(editingId!==null)

  const load = useCallback(async (id: string) => {
    if (!id) { setLoading(false); return }
    setLoading(true); setError('')
    try {
      const next = await voucherSetupApi.list(id)
      setItems(next)
      setDrafts(Object.fromEntries(next.map((item) => [item.id, { autoVoucher: item.autoVoucher, voucherLastNo: String(item.voucherLastNo) }])))
      setEditingId(null)
    } catch (reason) { setError(message(reason)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!canView) { setLoading(false); return }
    void companyApi.companies().then((next) => {
      setCompanies(next)
      const assigned = user?.organizations[0]?.organizationId
      const selected = next.find((item) => item.id === assigned)?.id ?? next[0]?.id ?? ''
      setCompanyId(selected); return load(selected)
    }).catch((reason) => { setError(message(reason)); setLoading(false) })
  }, [canView, load, user])

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    const scoped=items.filter((item)=>item.branchId===branchId)
    if (!term) return scoped
    return scoped.filter((item) => [item.branchCode, item.branchName, item.voucherClass, item.voucherType, item.description, item.documentType]
      .some((value) => value.toLocaleLowerCase().includes(term)))
  }, [branchId, items, query])

  function setDraft(id: string, values: Partial<ControlDraft>) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], autoVoucher: current[id]?.autoVoucher ?? false, voucherLastNo: current[id]?.voucherLastNo ?? '0', ...values } }))
  }

  function edit(item: VoucherSetup) {
    setDraft(item.id, { autoVoucher: item.autoVoucher, voucherLastNo: String(item.voucherLastNo) })
    setEditingId(item.id)
    setError('')
  }

  function cancel(item: VoucherSetup) {
    setDraft(item.id, { autoVoucher: item.autoVoucher, voucherLastNo: String(item.voucherLastNo) })
    setEditingId(null)
    setError('')
  }

  async function save(item: VoucherSetup) {
    const draft = drafts[item.id]
    const lastNo = Number(draft?.voucherLastNo)
    if (!Number.isSafeInteger(lastNo) || lastNo < 0) { setError('Voucher Last No must be a whole number of 0 or greater.'); return }
    setBusyId(item.id); setError('')
    try {
      const updated = await voucherSetupApi.updateControl(item, {
        autoVoucher: draft?.autoVoucher ?? item.autoVoucher,
        voucherLastNo: lastNo,
        version: item.version,
      })
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry))
      setDraft(updated.id, { autoVoucher: updated.autoVoucher, voucherLastNo: String(updated.voucherLastNo) })
      setEditingId(null)
      toast.success('Voucher control updated.', 'Updated')
    } catch (reason) { setError(message(reason)); toast.error(message(reason), 'Voucher control was not saved') }
    finally { setBusyId(null) }
  }

  if (!canView) return <PageContainer title="Access denied" breadcrumbs={crumbs}><Card>You do not have access to Voucher Control Setup.</Card></PageContainer>
  return <PageContainer title="Voucher Control Setup" breadcrumbs={crumbs}>
    {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <CompanyCodeSelector companies={companies.map((item) => ({ id: item.id, code: item.code, name: item.legalName }))} value={companyId} disabled={!user?.superAdmin} onChange={(id) => { setCompanyId(id); setQuery(''); setEditingId(null); void load(id) }} />
      <div className="relative w-full max-w-80"><Search className="absolute top-3.5 left-3 size-4 text-[#71817e]" /><input className={`${setupInputClass} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search voucher controls..." aria-label="Search voucher controls" /></div>
    </div>
    <Card>
      <SkeletonBoundary loading={loading} fallback={<TableSkeleton columns={8} rows={6} />} minimumDurationMs={300}>
        <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-[#cbded6] bg-white/70">
          <table className="w-full min-w-[960px] table-fixed border-collapse text-[13px]">
            <colgroup>
              <col style={{ width: '15%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '21%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead className="bg-[linear-gradient(100deg,#d1e9e0,#e5f2ec_58%,#efe0bc)]"><tr>{['Branch', 'Voucher Class', 'Voucher Type', 'Doc Type', 'Description', 'Auto Voucher', 'Voucher Last No', 'Action'].map((header) => <th key={header} className="border-b border-[#bfd5cc] px-2 py-3 text-left text-[12px] font-semibold tracking-[.06em] text-[#315f5c] uppercase">{header}</th>)}</tr></thead>
            <tbody>
              {visible.map((item) => {
                const draft = drafts[item.id] ?? { autoVoucher: item.autoVoucher, voucherLastNo: String(item.voucherLastNo) }
                return <tr key={item.id} className="last:[&>td]:border-b-0 hover:bg-[#eaf4ef]">
                  <td className={cell}><span className="block truncate font-medium">{item.branchCode} - {item.branchName}</span></td>
                  <td className={cell}>{title(item.voucherClass)} Type Voucher</td>
                  <td className={cell}>{item.voucherType}</td><td className={cell}>{item.documentType}</td>
                  <td className={cell}><span className="block truncate">{item.description}</span></td>
                  <td className={`${cell} text-center`}><Switch ariaLabel={`Automatic voucher numbering for ${item.description}`} checked={draft.autoVoucher} disabled={!canEdit || editingId !== item.id || busyId === item.id} onCheckedChange={(autoVoucher) => setDraft(item.id, { autoVoucher })} /></td>
                  <td className={cell}>{editingId === item.id
                    ? <input aria-label={`Voucher Last No for ${item.description}`} className={`${setupInputClass} py-2 text-right`} disabled={busyId === item.id} min="0" step="1" type="number" value={draft.voucherLastNo} onChange={(event) => setDraft(item.id, { voucherLastNo: event.target.value })} />
                    : <span className="block pr-1 text-right tabular-nums">{item.voucherLastNo}</span>}</td>
                  <td className={`${cell} px-1 text-center`}>{editingId === item.id
                    ? <div className="flex w-full justify-center gap-1"><TableActionButton label={`Save ${item.description} control`} disabled={busyId === item.id} onClick={() => void save(item)}><Save className="size-4" /></TableActionButton><TableActionButton label={`Cancel editing ${item.description}`} tone="danger" disabled={busyId === item.id} onClick={() => cancel(item)}><X className="size-4" /></TableActionButton></div>
                    : <TableActionButton label={`Edit ${item.description} control`} disabled={!canEdit || editingId !== null} onClick={() => edit(item)}><Pencil className="size-4" /></TableActionButton>}</td>
                </tr>
              })}
              {!loading && visible.length === 0 && <tr><td className="p-9 text-center text-[#71817e]" colSpan={8}>No voucher setup entries found.</td></tr>}
            </tbody>
          </table>
        </div>
      </SkeletonBoundary>
    </Card>
  </PageContainer>
}

const cell = 'border-b border-[#dce8e3] px-2 py-2.5 align-middle'
const title = (value: string) => value.charAt(0) + value.slice(1).toLocaleLowerCase()
const crumbs = [{ label: 'Dashboard', to: '/' }, { label: 'Setup' }, { label: 'Voucher Control Setup' }]
