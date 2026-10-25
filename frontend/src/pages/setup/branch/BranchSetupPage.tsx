import { Pencil } from 'lucide-react'
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
import { BranchForm } from '../../../shared/components/branch/BranchForm'
import { SearchableSelect } from '../../../shared/components/SearchableSelect'
import { companyApi } from '../../../modules/company/api/company.api'
import type { Company } from '../../../modules/company/company.types'
import { branchApi } from '../../../modules/branch/api/branch.api'
import type { Branch, BranchFormValues } from '../../../modules/branch/branch.types'

export function BranchSetupPage() {
  const { can } = useAuth()
  const toast = useToast()
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyId, setCompanyId] = useState('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [editing, setEditing] = useState<Branch | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const canView = can('branches.read') || can('branches.manage')
  const canEdit = can('branches.manage')

  const loadBranches = useCallback(async (id: string) => {
    if (!id) { setBranches([]); setLoading(false); return }
    setLoading(true)
    try {
      setBranches(await branchApi.branches(id))
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : 'Unable to load branches.', 'Branch data unavailable')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (!canView) { setLoading(false); return }
    void (async () => {
      try {
        const nextCompanies = await companyApi.companies()
        setCompanies(nextCompanies)
        const firstCompanyId = nextCompanies[0]?.id ?? ''
        setCompanyId(firstCompanyId)
        await loadBranches(firstCompanyId)
      } catch (reason) {
        toast.error(reason instanceof ApiError ? reason.message : 'Unable to load companies.', 'Company data unavailable')
        setLoading(false)
      }
    })()
  }, [canView, loadBranches, toast])

  const columns = useMemo<Column<Branch>[]>(() => [
    { key: 'company', header: 'Company', render: (branch) => <div><strong className="block">{branch.companyName}</strong><small className="mt-0.5 block text-[#7c8b88]">{branch.companyCode}</small></div> },
    { key: 'branch', header: 'Branch', render: (branch) => <div><strong className="block">{branch.name}</strong><small className="mt-0.5 block text-[#7c8b88]">{branch.code}</small></div> },
    { key: 'type', header: 'Type', render: (branch) => branch.branchType === 'HEAD_OFFICE' ? 'Head office' : 'Branch' },
    { key: 'status', header: 'Status', render: (branch) => <StatusBadge label={branch.status} tone={branch.status === 'ACTIVE' ? 'success' : branch.status === 'INACTIVE' ? 'warning' : 'neutral'} /> },
    ...(canEdit ? [{ key: 'edit', header: 'Edit', headerGroup: 'Action', align: 'center' as const, render: (branch: Branch) => <TableActionButton label={`Edit ${branch.name}`} onClick={() => setEditing(branch)}><Pencil className="size-4" aria-hidden /></TableActionButton> }] : []),
  ], [canEdit])

  if (!canView) return <PageContainer breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Setup' }, { label: 'Branch setup' }]} title="Access denied"><Card><p className="m-1 text-sm text-[#70807d]">Contact an administrator if you need access to branch setup.</p></Card></PageContainer>

  async function save(values: BranchFormValues) {
    const updating = Boolean(editing)
    if (editing) await branchApi.updateBranch(editing, values)
    else await branchApi.createBranch(values)
    setEditing(undefined)
    toast.success(updating ? 'Branch details were updated.' : 'The branch is ready for accounting transactions.', updating ? 'Branch updated' : 'Branch created')
    setCompanyId(values.companyId)
    await loadBranches(values.companyId)
  }

  return <PageContainer breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Setup' }, { label: 'Branch setup' }]} title="Branch setup" action={canEdit && companyId ? <Button onClick={() => setEditing(null)}>Add branch</Button> : undefined}>
    <div className="mb-4 flex justify-end">
      <div className="grid grid-cols-[auto_300px] items-center gap-3 text-[13px] font-medium text-[#405653] max-sm:w-full max-sm:grid-cols-1">
        <span>Company</span>
        <SearchableSelect ariaLabel="Company" value={companyId} options={companies.map((company) => ({ value: company.id, label: company.legalName, description: String(company.code) }))} onChange={(value) => { setCompanyId(value); void loadBranches(value) }} placeholder="Select a company" searchPlaceholder="Search companies..." emptyMessage="No companies found." />
      </div>
    </div>
    <Card className="overflow-x-auto">
      <SkeletonBoundary loading={loading} fallback={<TableSkeleton columns={5} rows={5} />} minimumDurationMs={500}>
        <DataTable columns={columns} rows={branches} rowKey={(branch) => branch.id} emptyMessage={companyId ? 'No branches are configured for this company.' : 'No companies are available.'} />
      </SkeletonBoundary>
    </Card>
    <Modal open={editing !== undefined} title={editing ? 'Edit branch' : 'Create branch'} onClose={() => setEditing(undefined)}>
      <BranchForm branch={editing ?? undefined} companies={companies} defaultCompanyId={companyId} onSave={save} onCancel={() => setEditing(undefined)} />
    </Modal>
  </PageContainer>
}

