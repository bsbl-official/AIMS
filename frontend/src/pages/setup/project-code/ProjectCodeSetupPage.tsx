import { Pencil } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../modules/auth/hooks/useAuth'
import { useToast } from '../../../modules/toast/hooks/useToast'
import { companyApi } from '../../../modules/company/api/company.api'
import type { Company } from '../../../modules/company/company.types'
import { ApiError } from '../../../shared/api/httpClient'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { DataTable, type Column } from '../../../shared/components/DataTable'
import { Modal } from '../../../shared/components/Modal'
import { PageContainer } from '../../../shared/components/PageContainer'
import { SkeletonBoundary, TableSkeleton } from '../../../shared/components/Skeleton'
import { StatusBadge } from '../../../shared/components/StatusBadge'
import { TableActionButton } from '../../../shared/components/TableActionButton'
import { CompanyCodeSelector } from '../../../shared/components/codes/CompanyCodeSelector'
import { ProjectCodeForm } from '../../../shared/components/codes/ProjectCodeForm'
import { projectCodeApi } from '../../../modules/project-code/api/project-code.api'
import type { ProjectCode, ProjectCodeFormValues } from '../../../modules/project-code/project-code.types'

export function ProjectCodeSetupPage() {
  const { can, user } = useAuth(); const toast = useToast()
  const [companies, setCompanies] = useState<Company[]>([]); const [companyId, setCompanyId] = useState('')
  const [items, setItems] = useState<ProjectCode[]>([]); const [editing, setEditing] = useState<ProjectCode | null | undefined>(undefined); const [loading, setLoading] = useState(true)
  const canView = can('project_codes.read') || can('project_codes.manage'); const canEdit = can('project_codes.manage')
  const load = useCallback(async (id: string) => { if (!id) { setItems([]); setLoading(false); return } setLoading(true); try { setItems(await projectCodeApi.list(id)) } catch (reason) { toast.error(reason instanceof ApiError ? reason.message : 'Unable to load project codes.', 'Project codes unavailable') } finally { setLoading(false) } }, [toast])
  useEffect(() => { if (!canView) { setLoading(false); return } void (async () => { try { const next = await companyApi.companies(); setCompanies(next); const assigned = user?.organizations[0]?.organizationId; const id = !user?.superAdmin && assigned ? assigned : (next[0]?.id ?? ''); setCompanyId(id); await load(id) } catch (reason) { toast.error(reason instanceof ApiError ? reason.message : 'Unable to load companies.', 'Company data unavailable'); setLoading(false) } })() }, [canView, load, toast, user])
  const columns = useMemo<Column<ProjectCode>[]>(() => [
    { key: 'code', header: 'Project code', render: (item) => <strong>{item.code}</strong> },
    { key: 'name', header: 'Project name', render: (item) => item.name },
    { key: 'description', header: 'Description', render: (item) => item.description || '—' },
    { key: 'status', header: 'Status', render: (item) => <StatusBadge label={item.status} tone={item.status === 'ACTIVE' ? 'success' : 'neutral'} /> },
    ...(canEdit ? [{ key: 'edit', header: 'Edit', headerGroup: 'Action', align: 'center' as const, render: (item: ProjectCode) => <TableActionButton label={`Edit ${item.name}`} onClick={() => setEditing(item)}><Pencil className="size-4" aria-hidden /></TableActionButton> }] : []),
  ], [canEdit])
  const save = async (values: ProjectCodeFormValues) => { const updating = Boolean(editing); if (editing) await projectCodeApi.update(editing, values); else await projectCodeApi.create(companyId, values); setEditing(undefined); toast.success(updating ? 'Project code updated.' : 'Project code created.', updating ? 'Updated' : 'Created'); await load(companyId) }
  const crumbs = [{ label: 'Dashboard', to: '/' }, { label: 'Setup' }, { label: 'Project setup' }]
  if (!canView) return <PageContainer breadcrumbs={crumbs} title="Access denied"><Card>You do not have access to project code setup.</Card></PageContainer>
  return <PageContainer breadcrumbs={crumbs} title="Project setup" action={canEdit && companyId ? <Button onClick={() => setEditing(null)}>Add project code</Button> : undefined}>
    <div className="mb-4 flex justify-end"><CompanyCodeSelector companies={companies.map((item) => ({ id: item.id, code: item.code, name: item.legalName }))} value={companyId} disabled={!user?.superAdmin} onChange={(id) => { setCompanyId(id); void load(id) }} /></div>
    <Card><SkeletonBoundary loading={loading} fallback={<TableSkeleton columns={5} rows={5} />} minimumDurationMs={500}><DataTable columns={columns} rows={items} rowKey={(item) => item.id} emptyMessage="No project codes are configured." /></SkeletonBoundary></Card>
    <Modal open={editing !== undefined} title={editing ? 'Edit project code' : 'Create project code'} onClose={() => setEditing(undefined)}><ProjectCodeForm item={editing ?? undefined} onSave={save} onCancel={() => setEditing(undefined)} /></Modal>
  </PageContainer>
}

