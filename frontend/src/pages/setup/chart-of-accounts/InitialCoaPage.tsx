import { Pencil } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus as PlusIcon } from 'lucide-react'
import { useAuth } from '../../../modules/auth/hooks/useAuth'
import { useToast } from '../../../modules/toast/hooks/useToast'
import { ApiError } from '../../../shared/api/httpClient'
import { Button } from '../../../shared/components/Button'
import { Card } from '../../../shared/components/Card'
import { InitialCoaForm } from '../../../shared/components/coa/InitialCoaForm'
import { DataTable, type Column } from '../../../shared/components/DataTable'
import { Modal } from '../../../shared/components/Modal'
import { PageContainer } from '../../../shared/components/PageContainer'
import { SkeletonBoundary, TableSkeleton } from '../../../shared/components/Skeleton'
import { StatusBadge } from '../../../shared/components/StatusBadge'
import { TableActionButton } from '../../../shared/components/TableActionButton'
import { initialCoaApi } from '../../../modules/coa/api/coa.api'
import { formatInitialCoaId, type InitialCoa, type InitialCoaFormValues } from '../../../modules/coa/coa.types'

export function InitialCoaPage() {
  const { can } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState<InitialCoa[]>([])
  const [editing, setEditing] = useState<InitialCoa | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const canView = can('coa.read') || can('coa.manage')
  const canEdit = can('coa.manage')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await initialCoaApi.list())
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : 'Unable to load Initial COA entries.', 'Initial COA setup unavailable')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (canView) void load()
    else setLoading(false)
  }, [canView, load])

  const columns = useMemo<Column<InitialCoa>[]>(() => [
    { key: 'coaId', header: 'Initial COA ID', align: 'center', render: (item) => formatInitialCoaId(item.coaId) },
    { key: 'description', header: 'Initial COA description', align: 'center', render: (item) => item.description },
    { key: 'deviceFlag', header: 'Device', align: 'center', render: (item) => <StatusBadge label={item.deviceFlag === 'Y' ? 'Yes' : 'No'} tone={item.deviceFlag === 'Y' ? 'success' : 'neutral'} /> },
    ...(canEdit ? [{
      key: 'edit', header: 'Edit', headerGroup: 'Action', align: 'center' as const,
      render: (item: InitialCoa) => <TableActionButton label={`Edit ${item.description}`} onClick={() => setEditing(item)}><Pencil className="size-4" aria-hidden /></TableActionButton>,
    }] : []),
  ], [canEdit])

  async function save(values: InitialCoaFormValues) {
    const updating = Boolean(editing)
    if (editing) await initialCoaApi.update(editing.coaId, values)
    else await initialCoaApi.create(values)
    setEditing(undefined)
    toast.success(updating ? 'Initial COA entry updated.' : 'Initial COA entry created.', updating ? 'Updated' : 'Created')
    await load()
  }

  const crumbs = [{ label: 'Dashboard', to: '/' }, { label: 'Setup' }, { label: 'Initial COA setup' }]
  if (!canView) return <PageContainer breadcrumbs={crumbs} title="Access denied"><Card>You do not have access to Initial COA setup.</Card></PageContainer>

  return <PageContainer breadcrumbs={crumbs} title="Initial COA setup" action={canEdit ? <Button onClick={() => setEditing(null)}><span className="inline-flex items-center gap-2"><PlusIcon className="size-4" aria-hidden />Add New</span></Button> : undefined}>
    <Card>
      <SkeletonBoundary loading={loading} fallback={<TableSkeleton columns={4} rows={5} />} minimumDurationMs={500}>
        <DataTable columns={columns} rows={items} rowKey={(item) => item.coaId} emptyMessage="No Initial COA entries are configured." />
      </SkeletonBoundary>
    </Card>
    <Modal open={editing !== undefined} title={editing ? 'Edit Initial COA' : 'Create New Initial COA'} onClose={() => setEditing(undefined)}>
      <InitialCoaForm item={editing ?? undefined} onSave={save} onCancel={() => setEditing(undefined)} />
    </Modal>
  </PageContainer>
}

