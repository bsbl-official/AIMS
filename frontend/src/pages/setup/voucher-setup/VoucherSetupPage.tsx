import { Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../modules/auth/hooks/useAuth'
import { companyApi } from '../../../modules/company/api/company.api'
import type { Company } from '../../../modules/company/company.types'
import { useToast } from '../../../modules/toast/hooks/useToast'
import { voucherSetupApi } from '../../../modules/voucher-setup/api/voucher-setup.api'
import type { CreateVoucherSetup, DocumentType, UpdateVoucherSetup, VoucherClass, VoucherSetup, VoucherSetupOptions, VoucherType } from '../../../modules/voucher-setup/voucher-setup.types'
import { ApiError } from '../../../shared/api/httpClient'
import { Card } from '../../../shared/components/Card'
import { Modal, ModalActions } from '../../../shared/components/Modal'
import { Button } from '../../../shared/components/Button'
import { PageContainer } from '../../../shared/components/PageContainer'
import { SearchableSelect } from '../../../shared/components/SearchableSelect'
import { SkeletonBoundary, TableSkeleton } from '../../../shared/components/Skeleton'
import { TableActionButton } from '../../../shared/components/TableActionButton'
import { Select } from '../../../shared/components/ui/Select'
import { CompanyCodeSelector } from '../../../shared/components/codes/CompanyCodeSelector'
import { SetupFormField, SetupInput, setupInputClass } from '../../../shared/components/forms/SetupFormField'
import { formatCode } from '../../../shared/utils/formatCode'
import { useOrganizationContext, useOrganizationDirty } from '../../../modules/organization-context/useOrganizationContext'

const CLASS_OPTIONS = [
  { value: 'CREDIT', label: 'Credit Type Voucher' },
  { value: 'DEBIT', label: 'Debit Type Voucher' },
  { value: 'JOURNAL', label: 'Journal Type Voucher' },
]
const VOUCHER_COMBINATIONS: Array<{ voucherClass: VoucherClass; voucherType: VoucherType; typeLabel: string; description: string; documentType: DocumentType }> = [
  { voucherClass: 'CREDIT', voucherType: 'BCR', typeLabel: 'BCR', description: 'BANK CREDIT VOUCHER', documentType: 'BANK' },
  { voucherClass: 'CREDIT', voucherType: 'CCR', typeLabel: 'CCR', description: 'CASH CREDIT VOUCHER', documentType: 'CASH' },
  { voucherClass: 'DEBIT', voucherType: 'BDR', typeLabel: 'BDR', description: 'BANK DEBIT VOUCHER', documentType: 'BANK' },
  { voucherClass: 'DEBIT', voucherType: 'CDR', typeLabel: 'CDR', description: 'CASH DEBIT VOUCHER', documentType: 'CASH' },
  { voucherClass: 'JOURNAL', voucherType: 'JJV', typeLabel: 'JJV', description: 'JOURNAL VOUCHER', documentType: 'OTHERS' },
]
const DOCUMENT_TYPE_OPTIONS = ['BANK', 'CASH', 'OTHERS'].map((value) => ({ value, label: value }))

type RowDraft = {
  rowId: string
  branchId: string
  projectId: string
  financeId: string
  componentId: string
  coaId: string
  voucherClass: VoucherClass | ''
  voucherType: VoucherType | ''
  documentType: DocumentType | ''
  description: string
}

type VoucherContext = Pick<RowDraft, 'branchId' | 'projectId' | 'financeId' | 'componentId' | 'coaId'>
const EMPTY_CONTEXT: VoucherContext = { branchId: '', projectId: '', financeId: '', componentId: '', coaId: '' }

const message = (reason: unknown) => reason instanceof ApiError ? reason.message : 'Unable to complete the request.'

function newDraft(context: VoucherContext): RowDraft {
  return { rowId: crypto.randomUUID(), ...context, voucherClass: '', voucherType: '', documentType: '', description: '' }
}

function resolveContext(current: VoucherContext, options: VoucherSetupOptions): VoucherContext {
  const branchId = options.branches.some((entry) => entry.id === current.branchId) ? current.branchId : (options.branches[0]?.id ?? '')
  const projectId = options.projects.some((entry) => String(entry.id) === current.projectId) ? current.projectId : String(options.projects[0]?.id ?? '')
  const finances = options.finances.filter((entry) => String(entry.projectCodeId) === projectId)
  const financeId = finances.some((entry) => String(entry.id) === current.financeId) ? current.financeId : String(finances[0]?.id ?? '')
  const components = options.components.filter((entry) => String(entry.projectCodeId) === projectId && String(entry.financeCodeId) === financeId)
  const componentId = components.some((entry) => String(entry.id) === current.componentId) ? current.componentId : String(components[0]?.id ?? '')
  const coaId = options.coas.some((entry) => String(entry.id) === current.coaId) ? current.coaId : String(options.coas[0]?.id ?? '')
  return { branchId, projectId, financeId, componentId, coaId }
}

function draftFrom(item: VoucherSetup): RowDraft {
  return {
    rowId: item.id, branchId: item.branchId, projectId: String(item.projectCodeId),
    financeId: String(item.financeCodeId), componentId: String(item.componentCodeId), coaId: String(item.coaId),
    voucherClass: item.voucherClass, voucherType: item.voucherType, documentType: item.documentType, description: item.description,
  }
}

export function VoucherSetupPage() {
  const { can, user } = useAuth()
  const {branchId:globalBranchId}=useOrganizationContext()
  const toast = useToast()
  const canView = can('voucher_setup.read') || can('voucher_setup.manage')
  const canEdit = can('voucher_setup.manage')
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyId, setCompanyId] = useState('')
  const [items, setItems] = useState<VoucherSetup[]>([])
  const [options, setOptions] = useState<VoucherSetupOptions>({ branches: [], projects: [], finances: [], components: [], coas: [] })
  const [context, setContext] = useState<VoucherContext>(EMPTY_CONTEXT)
  const [newRows, setNewRows] = useState<RowDraft[]>([])
  const [editing, setEditing] = useState<{ item: VoucherSetup; draft: RowDraft } | null>(null)
  const [deleting, setDeleting] = useState<VoucherSetup | null>(null)
  const [busyRowId, setBusyRowId] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  useOrganizationDirty(newRows.length>0||editing!==null)

  const load = useCallback(async (id: string) => {
    if (!id) { setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [nextItems, nextOptions] = await Promise.all([voucherSetupApi.list(id), voucherSetupApi.options(id)])
      setItems(nextItems); setOptions(nextOptions); setContext((current) => ({...resolveContext(current, nextOptions),branchId:nextOptions.branches.some((entry)=>entry.id===globalBranchId)?globalBranchId:''}))
    } catch (reason) { setError(message(reason)) }
    finally { setLoading(false) }
  }, [globalBranchId])

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
    const inContext = items.filter((item) => item.branchId === context.branchId
      && String(item.projectCodeId) === context.projectId && String(item.financeCodeId) === context.financeId
      && String(item.componentCodeId) === context.componentId && String(item.coaId) === context.coaId)
    const term = query.trim().toLocaleLowerCase()
    if (!term) return inContext
    return inContext.filter((item) => [item.voucherClass, item.voucherType, item.documentType, item.description]
      .some((value) => String(value).toLocaleLowerCase().includes(term)))
  }, [context, items, query])

  const contextComplete = Object.values(context).every(Boolean)

  function changeContext(next: VoucherContext) {
    setContext(next); setNewRows([]); setEditing(null); setError('')
  }

  function updateNew(rowId: string, values: Partial<RowDraft>) {
    setNewRows((current) => current.map((row) => row.rowId === rowId ? { ...row, ...values } : row))
  }

  function updateEditing(values: Partial<RowDraft>) {
    setEditing((current) => current ? { ...current, draft: { ...current.draft, ...values } } : current)
  }

  async function save(draft: RowDraft, item?: VoucherSetup) {
    setError('')
    if (!draft.branchId || !draft.projectId || !draft.financeId || !draft.componentId || !draft.coaId
      || !draft.voucherClass || !draft.voucherType || !draft.documentType || !draft.description.trim()) {
      setError('Complete every field in the voucher row before saving.'); return
    }
    const values: UpdateVoucherSetup = {
      branchId: draft.branchId, projectCodeId: Number(draft.projectId), financeCodeId: Number(draft.financeId),
      componentCodeId: Number(draft.componentId), coaId: Number(draft.coaId), voucherClass: draft.voucherClass,
      voucherType: draft.voucherType, documentType: draft.documentType, description: draft.description.trim(),
    }
    setBusyRowId(draft.rowId)
    try {
      if (item) await voucherSetupApi.update(item, values)
      else await voucherSetupApi.create(companyId, {
        branchId: values.branchId, projectCodeId: values.projectCodeId, financeCodeId: values.financeCodeId,
        componentCodeId: values.componentCodeId, coaId: values.coaId,
        vouchers: [{ voucherClass: values.voucherClass, voucherType: values.voucherType, documentType: values.documentType, description: values.description }],
      } satisfies CreateVoucherSetup)
      if (item) setEditing(null)
      else setNewRows((current) => current.filter((row) => row.rowId !== draft.rowId))
      toast.success(item ? 'Voucher setup updated.' : 'Voucher setup created.', item ? 'Updated' : 'Created')
      await load(companyId)
    } catch (reason) { setError(message(reason)); toast.error(message(reason), 'Voucher setup was not saved') }
    finally { setBusyRowId(null) }
  }

  async function remove() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await voucherSetupApi.remove(deleting)
      if (editing?.item.id === deleting.id) setEditing(null)
      setDeleting(null); toast.success('Voucher setup deleted.', 'Deleted'); await load(companyId)
    } catch (reason) { toast.error(message(reason), 'Voucher setup was not deleted') }
    finally { setDeleteBusy(false) }
  }

  if (!canView) return <PageContainer title="Access denied" breadcrumbs={crumbs}><Card>You do not have access to Voucher Setup.</Card></PageContainer>
  return <PageContainer title="Voucher Setup" breadcrumbs={crumbs}>
    {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <CompanyCodeSelector companies={companies.map((item) => ({ id: item.id, code: item.code, name: item.legalName }))} value={companyId} disabled={!user?.superAdmin} onChange={(id) => {
        setCompanyId(id); setQuery(''); setNewRows([]); setEditing(null); setContext(EMPTY_CONTEXT); void load(id)
      }} />
      <div className="relative w-full max-w-80"><Search className="absolute top-3.5 left-3 size-4 text-[#71817e]" /><input className={`${setupInputClass} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search voucher setup..." aria-label="Search voucher setup" /></div>
    </div>
    <Card>
      <SkeletonBoundary loading={loading} fallback={<TableSkeleton columns={7} rows={6} />} minimumDurationMs={400}>
        <VoucherContextFields context={context} options={options} onChange={changeContext} />
        <div className="mt-5 border-t border-[#cbded6] pt-5">
        <VoucherSetupTable
          canEdit={canEdit} editing={editing} items={visible} newRows={newRows} busyRowId={busyRowId}
          onEdit={(item) => setEditing((current) => current?.item.id === item.id ? null : { item, draft: draftFrom(item) })}
          onDelete={setDeleting}
          onDeleteNew={(rowId) => setNewRows((current) => current.filter((row) => row.rowId !== rowId))}
          onSave={(draft, item) => void save(draft, item)}
          onUpdateEditing={updateEditing}
          onUpdateNew={updateNew}
        />
        {canEdit && <button type="button" className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#abc5ba] bg-white/55 py-2.5 text-sm text-[#315f5c] hover:bg-[#eaf3ef] disabled:cursor-not-allowed disabled:opacity-50" disabled={!companyId || loading || !contextComplete} onClick={() => setNewRows((current) => [...current, newDraft(context)])}><Plus className="size-4" />Add Voucher Row</button>}
        </div>
      </SkeletonBoundary>
    </Card>
    <Modal open={deleting !== null} title="Delete Voucher Setup" size="medium" onClose={() => { if (!deleteBusy) setDeleting(null) }}>
      <p className="m-0 text-sm">Delete <span className="text-[#24484c]">{deleting?.description}</span>?</p>
      <ModalActions><Button variant="secondary" disabled={deleteBusy} onClick={() => setDeleting(null)}>Cancel</Button><Button variant="danger" disabled={deleteBusy} onClick={() => void remove()}>{deleteBusy ? 'Deleting...' : 'Delete'}</Button></ModalActions>
    </Modal>
  </PageContainer>
}

function VoucherContextFields({ context, options, onChange }: { context: VoucherContext; options: VoucherSetupOptions; onChange: (context: VoucherContext) => void }) {
  const finances = options.finances.filter((entry) => String(entry.projectCodeId) === context.projectId)
  const components = options.components.filter((entry) => String(entry.projectCodeId) === context.projectId && String(entry.financeCodeId) === context.financeId)
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
    <SetupFormField label="Project Code"><SearchableSelect ariaLabel="Project Code" value={context.projectId} onChange={(projectId) => {
      const finance = options.finances.find((entry) => String(entry.projectCodeId) === projectId)
      const financeId = String(finance?.id ?? '')
      const component = options.components.find((entry) => String(entry.projectCodeId) === projectId && String(entry.financeCodeId) === financeId)
      onChange({ ...context, projectId, financeId, componentId: String(component?.id ?? '') })
    }} options={options.projects.map((entry) => ({ value: String(entry.id), label: `${formatCode(entry.id)} - ${entry.name}` }))} /></SetupFormField>
    <SetupFormField label="Finance Code"><SearchableSelect ariaLabel="Finance Code" disabled={!context.projectId} value={context.financeId} onChange={(financeId) => {
      const component = options.components.find((entry) => String(entry.projectCodeId) === context.projectId && String(entry.financeCodeId) === financeId)
      onChange({ ...context, financeId, componentId: String(component?.id ?? '') })
    }} options={finances.map((entry) => ({ value: String(entry.id), label: `${formatCode(entry.id)} - ${entry.name}` }))} /></SetupFormField>
    <SetupFormField label="Component Code"><SearchableSelect ariaLabel="Component Code" disabled={!context.financeId} value={context.componentId} onChange={(componentId) => onChange({ ...context, componentId })} options={components.map((entry) => ({ value: String(entry.id), label: `${formatCode(entry.id)} - ${entry.name}` }))} /></SetupFormField>
    <SetupFormField label="Initial COA"><SearchableSelect ariaLabel="Initial COA" value={context.coaId} onChange={(coaId) => onChange({ ...context, coaId })} options={options.coas.map((entry) => ({ value: String(entry.id), label: `${formatCode(entry.id)} - ${entry.description}` }))} /></SetupFormField>
  </div>
}

function VoucherSetupTable({ canEdit, editing, items, newRows, busyRowId, onEdit, onDelete, onDeleteNew, onSave, onUpdateEditing, onUpdateNew }: {
  canEdit: boolean
  editing: { item: VoucherSetup; draft: RowDraft } | null
  items: VoucherSetup[]
  newRows: RowDraft[]
  busyRowId: string | null
  onEdit: (item: VoucherSetup) => void
  onDelete: (item: VoucherSetup) => void
  onDeleteNew: (rowId: string) => void
  onSave: (draft: RowDraft, item?: VoucherSetup) => void
  onUpdateEditing: (values: Partial<RowDraft>) => void
  onUpdateNew: (rowId: string, values: Partial<RowDraft>) => void
}) {
  const columnCount = canEdit ? 7 : 4
  return <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-[#cbded6] bg-white/70">
    <table className="w-full min-w-[900px] table-fixed border-collapse text-[13px]">
      <colgroup>
        <col className={canEdit ? 'w-[19%]' : 'w-[26%]'} />
        <col className={canEdit ? 'w-[16%]' : 'w-[22%]'} />
        <col className={canEdit ? 'w-[13%]' : 'w-[18%]'} />
        <col className={canEdit ? 'w-[25%]' : 'w-[34%]'} />
        {canEdit && <><col className="w-[9%]" /><col className="w-[9%]" /><col className="w-[9%]" /></>}
      </colgroup>
      <thead className="bg-[linear-gradient(100deg,#d1e9e0,#e5f2ec_58%,#efe0bc)]">
        <tr>
          {['Voucher Class', 'Voucher Type', 'Doc Type', 'Description'].map((header) => <th key={header} rowSpan={canEdit ? 2 : 1} className="border-b border-[#bfd5cc] px-3 py-3 text-left text-[12px] leading-4 font-semibold tracking-[.07em] text-[#315f5c] uppercase">{header}</th>)}
          {canEdit && <th colSpan={3} className="border-b border-[#bfd5cc] px-1 py-1.5 text-center text-[12px] leading-4 font-semibold tracking-[.07em] text-[#315f5c] uppercase">Action</th>}
        </tr>
        {canEdit && <tr>{['Save', 'Edit', 'Delete'].map((header) => <th key={header} className="min-w-20 border-b border-l border-[#bfd5cc] px-3 py-2 text-center text-[12px] leading-4 font-semibold tracking-[.04em] text-[#315f5c] uppercase">{header}</th>)}</tr>}
      </thead>
      <tbody>
        {items.map((item) => editing?.item.id === item.id
          ? <EditableRow key={item.id} draft={editing.draft} busy={busyRowId === item.id} onChange={onUpdateEditing} onSave={() => onSave(editing.draft, item)} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
          : <DisplayRow key={item.id} item={item} canEdit={canEdit} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />)}
        {newRows.map((draft) => <EditableRow key={draft.rowId} draft={draft} busy={busyRowId === draft.rowId} onChange={(values) => onUpdateNew(draft.rowId, values)} onSave={() => onSave(draft)} onDelete={() => onDeleteNew(draft.rowId)} />)}
        {newRows.length === 0 && items.length === 0 && <tr><td className="p-9 text-center text-[#71817e]" colSpan={columnCount}>No voucher setup entries are configured.</td></tr>}
      </tbody>
    </table>
  </div>
}

function EditableRow({ draft, busy, onChange, onSave, onEdit, onDelete }: {
  draft: RowDraft; busy: boolean
  onChange: (values: Partial<RowDraft>) => void
  onSave: () => void
  onEdit?: () => void
  onDelete: () => void
}) {
  const cell = 'border-b border-[#dce8e3] px-2 py-2'
  const typeOptions = VOUCHER_COMBINATIONS
    .filter((option) => option.voucherClass === draft.voucherClass)
    .map((option) => ({ value: option.voucherType, label: option.typeLabel, description: option.description }))
  return <tr className="bg-[#f8fbf9] last:[&>td]:border-b-0">
    <td className={cell}><Select ariaLabel="Voucher Class" searchable={false} value={draft.voucherClass} options={CLASS_OPTIONS} onChange={(value) => {
      const voucherClass = value as VoucherClass
      const combination = VOUCHER_COMBINATIONS.find((option) => option.voucherClass === voucherClass)
      onChange({ voucherClass, voucherType: combination?.voucherType ?? '', documentType: combination?.documentType ?? '', description: combination?.description ?? '' })
    }} /></td>
    <td className={cell}><Select ariaLabel="Voucher Type" searchable={false} disabled={!draft.voucherClass} value={draft.voucherType} options={typeOptions} onChange={(value) => {
      const voucherType = value as VoucherType
      const combination = VOUCHER_COMBINATIONS.find((option) => option.voucherClass === draft.voucherClass && option.voucherType === voucherType)
      onChange({ voucherType, documentType: combination?.documentType ?? '', description: combination?.description ?? '' })
    }} /></td>
    <td className={cell}><Select ariaLabel="Document Type" searchable={false} value={draft.documentType} options={DOCUMENT_TYPE_OPTIONS} onChange={(value) => onChange({ documentType: value as DocumentType })} /></td>
    <td className={cell}><SetupInput aria-label="Voucher description" value={draft.description} readOnly /></td>
    <td className={`${cell} border-l text-center`}><TableActionButton label="Save voucher setup" disabled={busy} onClick={onSave}><Save className="size-4" /></TableActionButton></td>
    <td className={`${cell} border-l text-center`}><TableActionButton label={onEdit ? 'Cancel editing' : 'Edit is available after saving'} disabled={!onEdit || busy} onClick={onEdit ?? (() => undefined)}>{onEdit ? <X className="size-4" /> : <Pencil className="size-4" />}</TableActionButton></td>
    <td className={`${cell} border-l text-center`}><TableActionButton label="Delete voucher row" tone="danger" disabled={busy} onClick={onDelete}><Trash2 className="size-4" /></TableActionButton></td>
  </tr>
}

function DisplayRow({ item, canEdit, onEdit, onDelete }: { item: VoucherSetup; canEdit: boolean; onEdit: () => void; onDelete: () => void }) {
  const cell = 'border-b border-[#dce8e3] px-3 py-3.5'
  return <tr className="transition-colors last:[&>td]:border-b-0 hover:bg-[#eaf4ef]">
    <td className={cell}>{CLASS_OPTIONS.find((option) => option.value === item.voucherClass)?.label ?? title(item.voucherClass)}</td>
    <td className={cell}>{VOUCHER_COMBINATIONS.find((option) => option.voucherClass === item.voucherClass && option.voucherType === item.voucherType)?.typeLabel ?? title(item.voucherType)}</td>
    <td className={cell}>{item.documentType}</td>
    <td className={cell}>{item.description}</td>
    {canEdit && <>
      <td className={`${cell} border-l text-center`}><TableActionButton label={`Save ${item.description}`} disabled onClick={() => undefined}><Save className="size-4" /></TableActionButton></td>
      <td className={`${cell} border-l text-center`}><TableActionButton label={`Edit ${item.description}`} onClick={onEdit}><Pencil className="size-4" /></TableActionButton></td>
      <td className={`${cell} border-l text-center`}><TableActionButton label={`Delete ${item.description}`} tone="danger" onClick={onDelete}><Trash2 className="size-4" /></TableActionButton></td>
    </>}
  </tr>
}

const title = (value: string) => value.charAt(0) + value.slice(1).toLocaleLowerCase()
const crumbs = [{ label: 'Dashboard', to: '/' }, { label: 'Setup' }, { label: 'Voucher Setup' }]
