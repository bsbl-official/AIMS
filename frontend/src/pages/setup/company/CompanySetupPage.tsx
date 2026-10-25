import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../modules/auth/hooks/useAuth'
import { useToast } from '../../../modules/toast/hooks/useToast'
import { ApiError } from '../../../shared/api/httpClient'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { DataTable, type Column } from '../../../shared/components/DataTable'
import { Modal } from '../../../shared/components/Modal'
import { PageContainer } from '../../../shared/components/PageContainer'
import { SkeletonBoundary, TableSkeleton } from '../../../shared/components/Skeleton'
import { StatusBadge } from '../../../shared/components/StatusBadge'
import { TableActionButton } from '../../../shared/components/TableActionButton'
import { CompanyDetails } from '../../../shared/components/company/CompanyDetails'
import { CompanyForm } from '../../../shared/components/company/CompanyForm'
import { companyApi } from '../../../modules/company/api/company.api'
import type { Company, CompanyFormValues } from '../../../modules/company/company.types'

export function CompanySetupPage() {
  const { user, can } = useAuth()
  const toast = useToast()
  const [companies, setCompanies] = useState<Company[]>([])
  const [editing, setEditing] = useState<Company | null | undefined>(undefined)
  const [viewing, setViewing] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState<Company | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const canView = can('companies.read') || can('companies.manage')
  const canEdit = can('companies.manage')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setCompanies(await companyApi.companies())
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : 'Unable to load companies.', 'Company data unavailable')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { if (canView) void load(); else setLoading(false) }, [canView, load])

  const columns = useMemo<Column<Company>[]>(() => [
    { key: 'code', header: 'Company code', render: (company) => company.code },
    { key: 'name', header: 'Company name', render: (company) => <div><span className="block">{company.legalName}</span>{company.tradingName && <small className="mt-0.5 block text-[#7c8b88]">{company.tradingName}</small>}</div> },
    { key: 'currency', header: 'Base currency', render: (company) => company.baseCurrencyCode },
    { key: 'status', header: 'Status', render: (company) => <StatusBadge label={company.status} tone={company.status === 'ACTIVE' ? 'success' : company.status === 'SUSPENDED' ? 'warning' : 'neutral'} /> },
    { key: 'view', header: 'View', headerGroup: 'Action', align: 'center', render: (company) => <TableActionButton label={`View ${company.legalName}`} onClick={() => setViewing(company)}><Eye className="size-4" aria-hidden /></TableActionButton> },
    ...(canEdit ? [{ key: 'edit', header: 'Edit', headerGroup: 'Action', align: 'center' as const, render: (company: Company) => <TableActionButton label={`Edit ${company.legalName}`} onClick={() => setEditing(company)}><Pencil className="size-4" aria-hidden /></TableActionButton> }] : []),
    ...(user?.superAdmin ? [{ key: 'delete', header: 'Delete', headerGroup: 'Action', align: 'center' as const, render: (company: Company) => <TableActionButton label={`Delete ${company.legalName}`} tone="danger" onClick={() => setDeleting(company)}><Trash2 className="size-4" aria-hidden /></TableActionButton> }] : []),
  ], [canEdit, user?.superAdmin])

  if (!canView) return <PageContainer breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Setup' }, { label: 'Company setup' }]} title="Access denied"><Card><p className="m-1 text-sm text-[#70807d]">Contact an administrator if you need access to company setup.</p></Card></PageContainer>

  async function save(values: CompanyFormValues) {
    const updating = Boolean(editing)
    if (editing) await companyApi.updateCompany(editing, values)
    else await companyApi.createCompany(values)
    setEditing(undefined)
    toast.success(updating ? 'Company details were updated.' : 'The company was created. Add its branches from Branch setup.', updating ? 'Company updated' : 'Company created')
    await load()
  }

  async function removeCompany() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await companyApi.deleteCompany(deleting.id)
      toast.success(`${deleting.legalName} was deleted.`, 'Company deleted')
      setDeleting(null)
      await load()
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : 'Unable to delete the company.', 'Company was not deleted')
    } finally {
      setDeleteBusy(false)
    }
  }

  return <PageContainer breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Setup' }, { label: 'Company setup' }]} title="Company setup" action={user?.superAdmin ? <Button onClick={() => setEditing(null)}><span className="inline-flex items-center gap-2"><Plus className="size-4" aria-hidden />Add company</span></Button> : undefined}>
    <Card className="overflow-x-auto">
      <SkeletonBoundary loading={loading} fallback={<TableSkeleton columns={5} rows={5} />} minimumDurationMs={500}>
        <DataTable columns={columns} rows={companies} rowKey={(company) => company.id} emptyMessage="No companies are configured." />
      </SkeletonBoundary>
    </Card>

    <Modal open={editing !== undefined} title={editing ? 'Edit company' : 'Create company'} onClose={() => setEditing(undefined)}>
      <CompanyForm company={editing ?? undefined} onSave={save} onCancel={() => setEditing(undefined)} />
    </Modal>

    <Modal open={viewing !== null} title="Company details" onClose={() => setViewing(null)} size="medium">
      {viewing && <CompanyDetails company={viewing} />}
    </Modal>

    <Modal open={deleting !== null} title="Delete company" onClose={() => { if (!deleteBusy) setDeleting(null) }} size="medium">
      {deleting && <div className="grid gap-6">
        <p className="text-sm leading-6 text-[#405653]">Delete <span className="text-[#203236]">{deleting.legalName}</span> and its setup records? A company containing accounting data cannot be deleted.</p>
        <div className="flex justify-end gap-2.5"><Button type="button" variant="secondary" disabled={deleteBusy} onClick={() => setDeleting(null)}>Cancel</Button><Button type="button" variant="danger" disabled={deleteBusy} onClick={() => void removeCompany()}>{deleteBusy ? 'Deleting...' : 'Delete company'}</Button></div>
      </div>}
    </Modal>
  </PageContainer>
}

