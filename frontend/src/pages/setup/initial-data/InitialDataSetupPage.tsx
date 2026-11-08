import { Download, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../modules/auth/hooks/useAuth'
import { branchApi } from '../../../modules/branch/api/branch.api'
import { useOrganizationContext } from '../../../modules/organization-context/useOrganizationContext'
import { componentCodeApi } from '../../../modules/component-code/api/component-code.api'
import type { ComponentCode } from '../../../modules/component-code/component-code.types'
import { financeCodeApi } from '../../../modules/finance-code/api/finance-code.api'
import type { FinanceCode } from '../../../modules/finance-code/finance-code.types'
import { financialYearApi } from '../../../modules/financial-year/api/financial-year.api'
import type { FinancialPeriod } from '../../../modules/financial-year/financial-year.types'
import { initialDataApi } from '../../../modules/initial-data/api/initial-data.api'
import {
  accountHeadCode, accountHeadKey, type AccountHeadOption, type InitialBalanceLine, type InitialDataEntry,
  type InitialDataSummary,
} from '../../../modules/initial-data/initial-data.types'
import { projectCodeApi } from '../../../modules/project-code/api/project-code.api'
import type { ProjectCode } from '../../../modules/project-code/project-code.types'
import { useToast } from '../../../modules/toast/hooks/useToast'
import { ApiError } from '../../../shared/api/httpClient'
import { Button } from '../../../shared/components/Button'
import { AddRowButton } from '../../../shared/components/AddRowButton'
import { CalendarPicker } from '../../../shared/components/CalendarPicker'
import { Card } from '../../../shared/components/Card'
import { DataTable, type Column } from '../../../shared/components/DataTable'
import { Modal, ModalActions } from '../../../shared/components/Modal'
import { PageContainer } from '../../../shared/components/PageContainer'
import { SearchableSelect } from '../../../shared/components/SearchableSelect'
import { SkeletonBoundary, TableSkeleton } from '../../../shared/components/Skeleton'
import { TableActionButton } from '../../../shared/components/TableActionButton'
import { SetupFormField, SetupInput, setupInputClass } from '../../../shared/components/forms/SetupFormField'
import { formatCode } from '../../../shared/utils/formatCode'

const crumbs = [{ label: 'Dashboard', to: '/' }, { label: 'Setup' }, { label: 'Initial Data Setup' }]
const money = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const errorMessage = (reason: unknown) => reason instanceof ApiError ? reason.message : 'Unable to complete the request.'
const todayMonth = () => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}
const monthLabel = (value: string) => {
  const [year, month] = value.split('-').map(Number)
  if (!year || !month) return 'Selected Month'
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}
const entryTitle = (monthYear: string) => `Initial Data - ${monthLabel(monthYear)}`

async function downloadInitialDataPdf(entry: InitialDataEntry) {
  const { jsPDF } = await import('jspdf')
  const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = document.internal.pageSize.getWidth()
  const margin = 12
  const columns = [44, 90, 32, 32, 32]
  const headers = ['Account code', 'Account head', 'Debit', 'Credit', 'Balance']
  let y = 14
  const writeHeader = () => {
    document.setFont('helvetica', 'normal')
    document.setFontSize(16)
    document.text('Initial Data Entry', margin, y)
    document.setFontSize(9)
    y += 7
    document.text(`Month: ${monthLabel(entry.monthYear)}    Financial year starts: ${monthLabel(entry.financialYearStart)}`, margin, y)
    y += 5
    document.text(`Branch: ${entry.branchCode} - ${entry.branchName}`, margin, y)
    y += 5
    document.text(`Project: ${formatCode(entry.projectCodeId)} - ${entry.projectName}    Finance: ${formatCode(entry.financeCodeId)} - ${entry.financeName}    Component: ${formatCode(entry.componentCodeId)} - ${entry.componentName}`, margin, y)
    y += 7
    document.setFillColor(232, 241, 237)
    document.rect(margin, y, columns.reduce((sum, width) => sum + width, 0), 7, 'F')
    let x = margin
    headers.forEach((header, index) => { document.text(header, x + 2, y + 4.7); x += columns[index] ?? 0 })
    y += 7
  }
  writeHeader()
  document.setFontSize(8.5)
  for (const line of entry.lines) {
    const codeLines = document.splitTextToSize(accountHeadCode(line), columns[0]! - 4)
    const nameLines = document.splitTextToSize(line.accountHead, columns[1]! - 4)
    const rowHeight = Math.max(7, Math.max(codeLines.length, nameLines.length) * 4 + 3)
    if (y + rowHeight > document.internal.pageSize.getHeight() - 16) { document.addPage(); y = 14; writeHeader(); document.setFontSize(8.5) }
    document.setDrawColor(217, 228, 223)
    document.rect(margin, y, columns.reduce((sum, width) => sum + width, 0), rowHeight)
    let x = margin
    document.text(codeLines, x + 2, y + 4.5); x += columns[0]!
    document.text(nameLines, x + 2, y + 4.5); x += columns[1]!
    document.text(money.format(line.debit), x + columns[2]! - 2, y + 4.5, { align: 'right' }); x += columns[2]!
    document.text(money.format(line.credit), x + columns[3]! - 2, y + 4.5, { align: 'right' }); x += columns[3]!
    document.text(money.format(line.balance), x + columns[4]! - 2, y + 4.5, { align: 'right' })
    y += rowHeight
  }
  const debit = entry.lines.reduce((sum, line) => sum + Number(line.debit), 0)
  const credit = entry.lines.reduce((sum, line) => sum + Number(line.credit), 0)
  y += 6
  document.setFontSize(9)
  document.text(`Debit total: ${money.format(debit)}    Credit total: ${money.format(credit)}    Balance: ${money.format(debit - credit)}`, pageWidth - margin, y, { align: 'right' })
  document.save(`initial-data-${entry.monthYear}.pdf`)
}

export function InitialDataSetupPage() {
  const { can } = useAuth()
  const { companyId, branchId } = useOrganizationContext()
  const toast = useToast()
  const canView = can('initial_data.read') || can('initial_data.manage')
  const canEdit = can('initial_data.manage')
  const [entries, setEntries] = useState<InitialDataSummary[]>([])
  const [editor, setEditor] = useState<InitialDataEntry | null | undefined>(undefined)
  const [viewing, setViewing] = useState<InitialDataEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const loadEntries = useCallback(async (id: string) => {
    if (!id) { setEntries([]); setLoading(false); return }
    setLoading(true); setError('')
    try { setEntries(await initialDataApi.entries(id)) }
    catch (reason) { setError(errorMessage(reason)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!canView) { setLoading(false); return }
    void loadEntries(companyId)
  }, [canView, companyId, loadEntries])

  async function openEntry(entryId: string, mode: 'view' | 'edit') {
    setOpening(true); setError('')
    try {
      const entry = await initialDataApi.entry(companyId, entryId)
      if (mode === 'view') setViewing(entry)
      else setEditor(entry)
    } catch (reason) { setError(errorMessage(reason)) }
    finally { setOpening(false) }
  }

  async function downloadEntry(entryId: string) {
    setOpening(true); setError('')
    try { await downloadInitialDataPdf(await initialDataApi.entry(companyId, entryId)) }
    catch (reason) { setError(errorMessage(reason)) }
    finally { setOpening(false) }
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    const scoped = branchId ? entries.filter((item) => item.branchId === branchId) : []
    if (!term) return scoped
    return scoped.filter((item) => [entryTitle(item.monthYear), item.branchCode, item.branchName,
      item.projectName, item.financeName, item.componentName].some((value) => value.toLocaleLowerCase().includes(term)))
  }, [branchId, entries, query])

  const columns = useMemo<Column<InitialDataSummary>[]>(() => [
    { key: 'title', header: 'Title', render: (item) => <span className="text-[#24484c]">{entryTitle(item.monthYear)}</span> },
    { key: 'branch', header: 'Branch', render: (item) => `${item.branchCode} - ${item.branchName}` },
    { key: 'debit', header: 'Debit', align: 'right', render: (item) => money.format(item.debitTotal) },
    { key: 'credit', header: 'Credit', align: 'right', render: (item) => money.format(item.creditTotal) },
    { key: 'balance', header: 'Balance', align: 'right', render: (item) => <span className={item.balanceTotal < 0 ? 'text-[#9b4038]' : ''}>{money.format(item.balanceTotal)}</span> },
    { key: 'view', header: 'View', headerGroup: 'Action', align: 'center', render: (item) => <TableActionButton disabled={opening} label={`View ${entryTitle(item.monthYear)}`} onClick={() => void openEntry(item.entryId, 'view')}><Eye className="size-4" /></TableActionButton> },
    { key: 'print', header: 'Print', headerGroup: 'Action', align: 'center', render: (item) => <TableActionButton disabled={opening} label={`Print ${entryTitle(item.monthYear)}`} onClick={() => void downloadEntry(item.entryId)}><Download className="size-4" /></TableActionButton> },
    ...(canEdit ? [{ key: 'edit', header: 'Edit', headerGroup: 'Action', align: 'center' as const, render: (item: InitialDataSummary) => <TableActionButton disabled={opening} label={`Edit ${entryTitle(item.monthYear)}`} onClick={() => void openEntry(item.entryId, 'edit')}><Pencil className="size-4" /></TableActionButton> }] : []),
  ], [canEdit, opening])

  if (!canView) return <PageContainer breadcrumbs={crumbs} title="Access denied"><Card>You do not have access to Initial Data Setup.</Card></PageContainer>
  return <PageContainer breadcrumbs={crumbs} title="Initial Data Setup" action={canEdit ? <Button onClick={() => setEditor(null)}><span className="inline-flex items-center gap-2"><Plus className="size-4" aria-hidden />Add New</span></Button> : undefined}>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    <Card>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[#d7e3de] pb-4">
        <div className="relative w-full max-w-80"><Search className="absolute top-3.5 left-3 size-4 text-[#71817e]" /><input className={`${setupInputClass} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search initial data..." aria-label="Search initial data" /></div>
      </div>
      <SkeletonBoundary loading={loading} fallback={<TableSkeleton columns={8} rows={6} />} minimumDurationMs={400}>
        <DataTable columns={columns} rows={filtered} rowKey={(item) => item.entryId} emptyMessage="No Initial Data entries have been created for this company." />
      </SkeletonBoundary>
    </Card>
    {editor !== undefined && <InitialDataEditor companyId={companyId} globalBranchId={branchId} initial={editor} entries={entries} onClose={() => setEditor(undefined)} onSaved={async () => {
      setEditor(undefined); await loadEntries(companyId); toast.success('Initial data saved.', 'Saved')
    }} />}
    <InitialDataView entry={viewing} onClose={() => setViewing(null)} />
  </PageContainer>
}

type DraftLine = { rowId: string; headKey: string; debit: string; credit: string }
const draft = (line?: InitialBalanceLine): DraftLine => ({
  rowId: crypto.randomUUID(), headKey: line ? accountHeadKey(line) : '',
  debit: line && line.debit !== 0 ? String(line.debit) : '', credit: line && line.credit !== 0 ? String(line.credit) : '',
})

function InitialDataEditor({ companyId, globalBranchId, initial, entries, onClose, onSaved }: {
  companyId: string; globalBranchId: string; initial: InitialDataEntry | null; entries: InitialDataSummary[]; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [projects, setProjects] = useState<ProjectCode[]>([])
  const [finances, setFinances] = useState<FinanceCode[]>([])
  const [components, setComponents] = useState<ComponentCode[]>([])
  const [periods, setPeriods] = useState<FinancialPeriod[]>([])
  const [heads, setHeads] = useState<AccountHeadOption[]>([])
  const [branchId, setBranchId] = useState(initial?.branchId ?? globalBranchId)
  const [projectId, setProjectId] = useState(String(initial?.projectCodeId ?? ''))
  const [financeId, setFinanceId] = useState(String(initial?.financeCodeId ?? ''))
  const [componentId, setComponentId] = useState(String(initial?.componentCodeId ?? ''))
  const [monthYear, setMonthYear] = useState(initial?.monthYear ?? todayMonth())
  const [sourceEntry, setSourceEntry] = useState('')
  const [lines, setLines] = useState<DraftLine[]>(initial?.lines.map((line) => draft(line)) ?? [draft()])
  const [loading, setLoading] = useState(true)
  const [copying, setCopying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void Promise.all([branchApi.branches(companyId), projectCodeApi.list(companyId), financialYearApi.list(companyId), initialDataApi.accountHeads(companyId)])
      .then(([nextBranches, nextProjects, nextPeriods, nextHeads]) => {
        if (!active) return
        const activeBranches = nextBranches.filter((item) => item.status === 'ACTIVE')
        const activeProjects = nextProjects.filter((item) => item.status === 'ACTIVE')
        setProjects(activeProjects); setPeriods(nextPeriods); setHeads(nextHeads)
        setBranchId((current) => current || globalBranchId || activeBranches[0]?.id || '')
        setProjectId((current) => current || String(activeProjects[0]?.id ?? ''))
      }).catch((reason) => setError(errorMessage(reason))).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [companyId, globalBranchId])

  useEffect(() => {
    setFinances([]); setComponents([])
    if (!projectId) { setFinanceId(''); setComponentId(''); return }
    void financeCodeApi.list(companyId, projectId).then((next) => {
      const active = next.filter((item) => item.status === 'ACTIVE')
      setFinances(active); setFinanceId((current) => active.some((item) => String(item.id) === current) ? current : String(active[0]?.id ?? ''))
    }).catch((reason) => setError(errorMessage(reason)))
  }, [companyId, projectId])

  useEffect(() => {
    setComponents([])
    if (!projectId || !financeId) { setComponentId(''); return }
    void componentCodeApi.list(companyId, projectId, financeId).then((next) => {
      const active = next.filter((item) => item.status === 'ACTIVE')
      setComponents(active); setComponentId((current) => active.some((item) => String(item.id) === current) ? current : String(active[0]?.id ?? ''))
    }).catch((reason) => setError(errorMessage(reason)))
  }, [companyId, financeId, projectId])

  const financialYearStart = useMemo(() => {
    const startMonth = periods.find((period) => period.period === 1)?.month
    if (!startMonth || !monthYear) return ''
    const year = Number(monthYear.slice(0, 4)), selectedMonth = Number(monthYear.slice(5, 7))
    return `${selectedMonth >= startMonth ? year : year - 1}-${String(startMonth).padStart(2, '0')}`
  }, [monthYear, periods])

  const headByKey = useMemo(() => new Map(heads.map((head) => [accountHeadKey(head), head])), [heads])
  const totals = useMemo(() => lines.reduce((total, line) => ({
    debit: total.debit + (Number(line.debit) || 0), credit: total.credit + (Number(line.credit) || 0),
  }), { debit: 0, credit: 0 }), [lines])

  function updateLine(rowId: string, values: Partial<DraftLine>) {
    setLines((current) => current.map((line) => line.rowId === rowId ? { ...line, ...values } : line))
  }

  async function copyEntry(entryId: string) {
    setSourceEntry(entryId)
    if (!entryId) return
    setCopying(true); setError('')
    try {
      const entry = await initialDataApi.entry(companyId, entryId)
      setBranchId(entry.branchId); setProjectId(String(entry.projectCodeId)); setFinanceId(String(entry.financeCodeId))
      setComponentId(String(entry.componentCodeId)); setMonthYear(entry.monthYear); setLines(entry.lines.map((line) => draft(line)))
    } catch (reason) { setError(errorMessage(reason)) }
    finally { setCopying(false) }
  }

  async function save() {
    setError('')
    const completed = lines.filter((line) => line.headKey)
    if (!branchId || !projectId || !financeId || !componentId || !monthYear) { setError('Complete all setup fields.'); return }
    if (completed.length === 0) { setError('Add at least one account head balance.'); return }
    if (completed.length !== lines.length) { setError('Select an account head for every balance line or remove empty lines.'); return }
    if (new Set(completed.map((line) => line.headKey)).size !== completed.length) { setError('Each account head can only be added once.'); return }
    if (completed.some((line) => (Number(line.debit) || 0) < 0 || (Number(line.credit) || 0) < 0 || (!(Number(line.debit) || 0) && !(Number(line.credit) || 0)))) {
      setError('Each account head needs a positive debit or credit amount.'); return
    }
    setSaving(true)
    try {
      await initialDataApi.save(companyId, {
        branchId, projectCodeId: Number(projectId), financeCodeId: Number(financeId), componentCodeId: Number(componentId), monthYear,
        lines: completed.map((line) => {
          const head = headByKey.get(line.headKey)!
          return { coaId: head.coaId, l1Code: head.l1Code, l2Code: head.l2Code, l3Code: head.l3Code, l4Code: head.l4Code, l5Code: head.l5Code, debit: Number(line.debit) || 0, credit: Number(line.credit) || 0 }
        }),
      })
      await onSaved()
    } catch (reason) { setError(errorMessage(reason)) }
    finally { setSaving(false) }
  }

  return <Modal open title={initial ? 'Edit Initial Data Entry' : 'Create New Initial Data Entry'} description="Set the entry context, add account-head opening balances, and save the complete initial data entry." onClose={onClose} size="xlarge">
    <SkeletonBoundary loading={loading} fallback={<TableSkeleton columns={4} rows={4} />} minimumDurationMs={300}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SetupFormField label="Project"><SearchableSelect ariaLabel="Project" value={projectId} onChange={setProjectId} options={projects.map((item) => ({ value: String(item.id), label: `${formatCode(item.code)} - ${item.name}` }))} /></SetupFormField>
        <SetupFormField label="Finance code"><SearchableSelect ariaLabel="Finance code" value={financeId} onChange={setFinanceId} disabled={!projectId} options={finances.map((item) => ({ value: String(item.id), label: `${formatCode(item.code)} - ${item.name}` }))} /></SetupFormField>
        <SetupFormField label="Component"><SearchableSelect ariaLabel="Component" value={componentId} onChange={setComponentId} disabled={!financeId} options={components.map((item) => ({ value: String(item.id), label: `${formatCode(item.code)} - ${item.name}` }))} /></SetupFormField>
        <SetupFormField label="Month / year"><CalendarPicker ariaLabel="Month and year" precision="month" value={monthYear} onChange={setMonthYear} /></SetupFormField>
        <SetupFormField label="Financial year starts"><CalendarPicker ariaLabel="Financial year start" precision="month" value={financialYearStart} readOnly /></SetupFormField>
        <div className="md:col-span-2"><SetupFormField label="Get data from another entry"><SearchableSelect ariaLabel="Copy from saved entry" value={sourceEntry} onChange={(value) => void copyEntry(value)} disabled={copying || entries.length === 0} placeholder={copying ? 'Loading entry...' : 'Search saved entries'} options={entries.filter((item) => item.entryId !== initial?.entryId).map((item) => ({ value: item.entryId, label: `${entryTitle(item.monthYear)} · ${item.branchCode}`, description: `${formatCode(item.projectCodeId)}/${formatCode(item.financeCodeId)}/${formatCode(item.componentCodeId)} · ${item.lineCount} account heads` }))} /></SetupFormField></div>
      </div>
      {periods.length === 0 && <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">Configure Financial Year Setup before saving initial data.</p>}

      <section className="mt-6 border-t border-[#cbded6] pt-4">
        <div className="mb-3"><h3 className="m-0 text-base text-[#173d42]">Account Head Balances</h3><p className="m-0 mt-1 text-xs text-[#657874]">Add all account heads for this initial data entry. Balance is calculated as debit minus credit.</p></div>
        <div className="overflow-x-auto rounded-xl border border-[#cbded6] bg-white/75">
          <div className="min-w-[850px]">
          <div className="grid grid-cols-[minmax(320px,1fr)_140px_140px_140px_48px] gap-2 border-b border-[#d5e2dc] bg-[#f2f6f3] px-3 py-2 text-[11px] font-normal tracking-[.06em] text-[#48615d] uppercase">
            <span>Account head</span><span className="text-right">Debit</span><span className="text-right">Credit</span><span className="text-right">Balance</span><span className="text-center">Action</span>
          </div>
          <div>
            {lines.map((line) => {
              const used = new Set(lines.filter((item) => item.rowId !== line.rowId).map((item) => item.headKey).filter(Boolean))
              const balance = (Number(line.debit) || 0) - (Number(line.credit) || 0)
              return <div className="grid grid-cols-[minmax(320px,1fr)_140px_140px_140px_48px] items-center gap-2 border-b border-[#dbe6e1] px-3 py-2 last:border-b-0" key={line.rowId}>
                <SearchableSelect ariaLabel="Account head" value={line.headKey} onChange={(value) => updateLine(line.rowId, { headKey: value })} searchPlaceholder="Search account code or name..." options={heads.map((head) => ({ value: accountHeadKey(head), label: `${accountHeadCode(head)} - ${head.accountHead}`, description: `Initial COA ${formatCode(head.coaId)}`, disabled: used.has(accountHeadKey(head)) }))} />
                <SetupInput aria-label="Debit" className={`${setupInputClass} py-2 text-right`} type="number" min="0" step="0.01" value={line.debit} onChange={(event) => updateLine(line.rowId, { debit: event.target.value })} />
                <SetupInput aria-label="Credit" className={`${setupInputClass} py-2 text-right`} type="number" min="0" step="0.01" value={line.credit} onChange={(event) => updateLine(line.rowId, { credit: event.target.value })} />
                <SetupInput aria-label="Balance" className={`${setupInputClass} py-2 text-right`} value={money.format(balance)} readOnly disabled />
                <button className="grid size-[39px] cursor-pointer place-items-center justify-self-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100" type="button" onClick={() => setLines((current) => current.filter((item) => item.rowId !== line.rowId))} aria-label="Remove account head line"><Trash2 className="size-4" /></button>
              </div>
            })}
            {lines.length === 0 && <p className="m-0 py-5 text-center text-sm text-[#71817e]">No account-head lines added.</p>}
          </div>
          </div>
        </div>
        <div className="mt-2 overflow-x-auto"><div className="grid min-w-[850px] grid-cols-[minmax(320px,1fr)_140px_140px_140px_48px] gap-2 px-3"><AddRowButton className="col-start-1" onClick={() => setLines((current) => [...current, draft()])}>Add Account Head Line</AddRowButton></div></div>
        <div className="mt-3 flex flex-wrap justify-end gap-6 text-sm font-normal text-[#294b4e]"><span>Debit total: {money.format(totals.debit)}</span><span>Credit total: {money.format(totals.credit)}</span><span>Balance: {money.format(totals.debit - totals.credit)}</span></div>
      </section>
      {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      <ModalActions><Button variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button><Button disabled={saving || periods.length === 0} onClick={() => void save()}>{saving ? 'Saving...' : 'Save'}</Button></ModalActions>
    </SkeletonBoundary>
  </Modal>
}

function InitialDataView({ entry, onClose }: { entry: InitialDataEntry | null; onClose: () => void }) {
  const columns = useMemo<Column<InitialBalanceLine>[]>(() => [
    { key: 'code', header: 'Account code', render: (line) => accountHeadCode(line) },
    { key: 'accountHead', header: 'Account head', render: (line) => line.accountHead },
    { key: 'debit', header: 'Debit', align: 'right', render: (line) => money.format(line.debit) },
    { key: 'credit', header: 'Credit', align: 'right', render: (line) => money.format(line.credit) },
    { key: 'balance', header: 'Balance', align: 'right', render: (line) => <span className={line.balance < 0 ? 'text-[#9b4038]' : ''}>{money.format(line.balance)}</span> },
  ], [])
  if (!entry) return null
  const debit = entry.lines.reduce((sum, line) => sum + Number(line.debit), 0)
  const credit = entry.lines.reduce((sum, line) => sum + Number(line.credit), 0)
  return <Modal open title="Initial Data Entry Details" description={monthLabel(entry.monthYear)} onClose={onClose} size="xlarge">
    <dl className="grid gap-3 rounded-xl border border-[#cbded6] bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <Detail label="Branch" value={`${entry.branchCode} - ${entry.branchName}`} />
      <Detail label="Project" value={`${formatCode(entry.projectCodeId)} - ${entry.projectName}`} />
      <Detail label="Finance code" value={`${formatCode(entry.financeCodeId)} - ${entry.financeName}`} />
      <Detail label="Component" value={`${formatCode(entry.componentCodeId)} - ${entry.componentName}`} />
      <Detail label="Month / year" value={monthLabel(entry.monthYear)} />
      <Detail label="Financial year starts" value={monthLabel(entry.financialYearStart)} />
    </dl>
    <div className="mt-4"><DataTable columns={columns} rows={entry.lines} rowKey={accountHeadKey} /></div>
    <div className="mt-3 flex flex-wrap justify-end gap-6 text-sm font-normal text-[#294b4e]"><span>Debit total: {money.format(debit)}</span><span>Credit total: {money.format(credit)}</span><span>Balance: {money.format(debit - credit)}</span></div>
    <ModalActions><Button variant="secondary" onClick={onClose}>Close</Button><Button onClick={() => void downloadInitialDataPdf(entry)}><span className="inline-flex items-center gap-2"><Download className="size-4" />Download PDF</span></Button></ModalActions>
  </Modal>
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-normal tracking-[.05em] text-[#657874] uppercase">{label}</dt><dd className="m-0 mt-1 text-sm text-[#203236]">{value}</dd></div>
}
