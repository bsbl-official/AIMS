import { Pencil } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../modules/auth/hooks/useAuth'
import { useToast } from '../../../modules/toast/hooks/useToast'
import { companyApi } from '../../../modules/company/api/company.api'
import type { Company } from '../../../modules/company/company.types'
import { projectCodeApi } from '../../../modules/project-code/api/project-code.api'
import type { ProjectCode } from '../../../modules/project-code/project-code.types'
import { financeCodeApi } from '../../../modules/finance-code/api/finance-code.api'
import type { FinanceCode } from '../../../modules/finance-code/finance-code.types'
import { ApiError } from '../../../shared/api/httpClient'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { DataTable, type Column } from '../../../shared/components/DataTable'
import { Modal } from '../../../shared/components/Modal'
import { PageContainer } from '../../../shared/components/PageContainer'
import { SearchableSelect } from '../../../shared/components/SearchableSelect'
import { SkeletonBoundary, TableSkeleton } from '../../../shared/components/Skeleton'
import { StatusBadge } from '../../../shared/components/StatusBadge'
import { TableActionButton } from '../../../shared/components/TableActionButton'
import { CompanyCodeSelector } from '../../../shared/components/codes/CompanyCodeSelector'
import { ComponentCodeForm } from '../../../shared/components/codes/ComponentCodeForm'
import { componentCodeApi } from '../../../modules/component-code/api/component-code.api'
import type { ComponentCode, ComponentCodeFormValues } from '../../../modules/component-code/component-code.types'

export function ComponentCodeSetupPage() {
  const { can, user } = useAuth(); const toast = useToast()
  const [companies, setCompanies] = useState<Company[]>([]); const [companyId, setCompanyId] = useState('')
  const [projects, setProjects] = useState<ProjectCode[]>([]); const [finances, setFinances] = useState<FinanceCode[]>([]); const [items, setItems] = useState<ComponentCode[]>([])
  const [projectId, setProjectId] = useState(''); const [financeId, setFinanceId] = useState('')
  const [editing, setEditing] = useState<ComponentCode | null | undefined>(undefined); const [loading, setLoading] = useState(true)
  const canView = can('component_codes.read') || can('component_codes.manage'); const canEdit = can('component_codes.manage')
  const load = useCallback(async (id: string) => { if (!id) { setLoading(false); return } setLoading(true); try { const [nextProjects, nextFinances, nextItems] = await Promise.all([projectCodeApi.list(id), financeCodeApi.list(id), componentCodeApi.list(id)]); setProjects(nextProjects); setFinances(nextFinances); setItems(nextItems); setProjectId(''); setFinanceId('') } catch (reason) { toast.error(reason instanceof ApiError ? reason.message : 'Unable to load component codes.', 'Component codes unavailable') } finally { setLoading(false) } }, [toast])
  useEffect(() => { if (!canView) { setLoading(false); return } void (async () => { try { const next = await companyApi.companies(); setCompanies(next); const assigned = user?.organizations[0]?.organizationId; const id = !user?.superAdmin && assigned ? assigned : (next[0]?.id ?? ''); setCompanyId(id); await load(id) } catch (reason) { toast.error(reason instanceof ApiError ? reason.message : 'Unable to load companies.', 'Company data unavailable'); setLoading(false) } })() }, [canView, load, toast, user])
  const filteredFinances = useMemo(() => projectId ? finances.filter((item) => String(item.projectCodeId) === projectId) : finances, [finances, projectId])
  const visible = useMemo(() => items.filter((item) => (!projectId || String(item.projectCodeId) === projectId) && (!financeId || String(item.financeCodeId) === financeId)), [financeId, items, projectId])
  const columns = useMemo<Column<ComponentCode>[]>(() => [
    { key: 'project', header: 'Project', render: (item) => <div>{item.projectName}<small className="block text-[#7c8b88]">{item.projectCode}</small></div> },
    { key: 'finance', header: 'Finance', render: (item) => <div>{item.financeName}<small className="block text-[#7c8b88]">{item.financeCode}</small></div> },
    { key: 'code', header: 'Component code', render: (item) => <strong>{item.code}</strong> },
    { key: 'name', header: 'Component name', render: (item) => item.name },
    { key: 'status', header: 'Status', render: (item) => <StatusBadge label={item.status} tone={item.status === 'ACTIVE' ? 'success' : 'neutral'} /> },
    ...(canEdit ? [{ key: 'edit', header: 'Edit', headerGroup: 'Action', align: 'center' as const, render: (item: ComponentCode) => <TableActionButton label={`Edit ${item.name}`} onClick={() => setEditing(item)}><Pencil className="size-4" aria-hidden /></TableActionButton> }] : []),
  ], [canEdit])
  const save = async (values: ComponentCodeFormValues) => { const updating = Boolean(editing); if (editing) await componentCodeApi.update(editing, values); else await componentCodeApi.create(companyId, values); setEditing(undefined); toast.success(updating ? 'Component code updated.' : 'Component code created.', updating ? 'Updated' : 'Created'); await load(companyId) }
  const crumbs = [{ label: 'Dashboard', to: '/' }, { label: 'Setup' }, { label: 'Component setup' }]
  if (!canView) return <PageContainer breadcrumbs={crumbs} title="Access denied"><Card>You do not have access to component code setup.</Card></PageContainer>
  const defaultProject = projectId || String(projects.find((item) => item.status === 'ACTIVE')?.id ?? '')
  const defaultFinance = financeId || String(finances.find((item) => String(item.projectCodeId) === defaultProject && item.status === 'ACTIVE')?.id ?? '')
  return <PageContainer breadcrumbs={crumbs} title="Component setup" action={canEdit && finances.some((item) => item.status === 'ACTIVE') ? <Button onClick={() => setEditing(null)}>Add component code</Button> : undefined}>
    <div className="mb-4 flex flex-wrap justify-end gap-3"><CompanyCodeSelector companies={companies.map((item) => ({ id: item.id, code: item.code, name: item.legalName }))} value={companyId} disabled={!user?.superAdmin} onChange={(id) => { setCompanyId(id); void load(id) }} /><div className="w-[250px] max-sm:w-full"><SearchableSelect ariaLabel="Filter by project" value={projectId} options={[{ value: '', label: 'All projects' }, ...projects.map((item) => ({ value: String(item.id), label: item.name, description: String(item.code) }))]} onChange={(value) => { setProjectId(value); setFinanceId('') }} searchPlaceholder="Search projects..." /></div><div className="w-[250px] max-sm:w-full"><SearchableSelect ariaLabel="Filter by finance code" value={financeId} options={[{ value: '', label: 'All finance codes' }, ...filteredFinances.map((item) => ({ value: String(item.id), label: item.name, description: String(item.code) }))]} onChange={setFinanceId} searchPlaceholder="Search finance codes..." /></div></div>
    <Card><SkeletonBoundary loading={loading} fallback={<TableSkeleton columns={6} rows={5} />} minimumDurationMs={500}><DataTable columns={columns} rows={visible} rowKey={(item) => item.id} emptyMessage="No component codes are configured." /></SkeletonBoundary></Card>
    <Modal open={editing !== undefined} title={editing ? 'Edit component code' : 'Create component code'} onClose={() => setEditing(undefined)}><ComponentCodeForm item={editing ?? undefined} projects={projects} finances={finances} defaultProjectId={defaultProject} defaultFinanceId={defaultFinance} onSave={save} onCancel={() => setEditing(undefined)} /></Modal>
  </PageContainer>
}

