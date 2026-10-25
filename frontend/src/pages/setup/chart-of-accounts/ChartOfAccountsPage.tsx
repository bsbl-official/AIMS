import { Pencil } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../modules/auth/hooks/useAuth'
import { useToast } from '../../../modules/toast/hooks/useToast'
import { ApiError } from '../../../shared/api/httpClient'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { ChartOfAccountForm } from '../../../shared/components/coa/ChartOfAccountForm'
import { DataTable, type Column } from '../../../shared/components/DataTable'
import { Modal } from '../../../shared/components/Modal'
import { PageContainer } from '../../../shared/components/PageContainer'
import { SkeletonBoundary, TableSkeleton } from '../../../shared/components/Skeleton'
import { StatusBadge } from '../../../shared/components/StatusBadge'
import { TableActionButton } from '../../../shared/components/TableActionButton'
import { coaApi } from '../../../modules/coa/api/coa.api'
import type { ChartOfAccount, ChartOfAccountFormValues } from '../../../modules/coa/coa.types'

export function ChartOfAccountsPage() {
  const { can } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState<ChartOfAccount[]>([])
  const [editing, setEditing] = useState<ChartOfAccount | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const canView = can('coa.read') || can('coa.manage')
  const canEdit = can('coa.manage')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await coaApi.list())
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : 'Unable to load COA entries.', 'COA setup unavailable')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (canView) void load()
    else setLoading(false)
  }, [canView, load])

  const columns = useMemo<Column<ChartOfAccount>[]>(() => [
    { key: 'coaId', header: 'COA ID', render: (item) => String(item.coaId).padStart(2, '0') },
    { key: 'description', header: 'COA description', render: (item) => item.description },
    { key: 'deviceFlag', header: 'Device', render: (item) => <StatusBadge label={item.deviceFlag === 'Y' ? 'Yes' : 'No'} tone={item.deviceFlag === 'Y' ? 'success' : 'neutral'} /> },
    ...(canEdit ? [{
      key: 'edit', header: 'Edit', headerGroup: 'Action', align: 'center' as const,
      render: (item: ChartOfAccount) => <TableActionButton label={`Edit ${item.description}`} onClick={() => setEditing(item)}><Pencil className="size-4" aria-hidden /></TableActionButton>,
    }] : []),
  ], [canEdit])

  async function save(values: ChartOfAccountFormValues) {
    const updating = Boolean(editing)
    if (editing) await coaApi.update(editing.coaId, values)
    else await coaApi.create(values)
    setEditing(undefined)
    toast.success(updating ? 'COA entry updated.' : 'COA entry created.', updating ? 'Updated' : 'Created')
    await load()
  }

  const crumbs = [{ label: 'Dashboard', to: '/' }, { label: 'Setup' }, { label: 'COA setup' }]
  if (!canView) return <PageContainer breadcrumbs={crumbs} title="Access denied"><Card>You do not have access to COA setup.</Card></PageContainer>

  return <PageContainer breadcrumbs={crumbs} title="COA setup" action={canEdit ? <Button onClick={() => setEditing(null)}>Create COA</Button> : undefined}>
    <Card>
      <SkeletonBoundary loading={loading} fallback={<TableSkeleton columns={4} rows={5} />} minimumDurationMs={500}>
        <DataTable columns={columns} rows={items} rowKey={(item) => item.coaId} emptyMessage="No COA entries are configured." />
      </SkeletonBoundary>
    </Card>
    <Modal open={editing !== undefined} title={editing ? 'Edit COA entry' : 'Create COA entry'} onClose={() => setEditing(undefined)}>
      <ChartOfAccountForm item={editing ?? undefined} onSave={save} onCancel={() => setEditing(undefined)} />
    </Modal>
  </PageContainer>
}

