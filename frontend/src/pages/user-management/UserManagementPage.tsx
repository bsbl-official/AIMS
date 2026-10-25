import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import { useAuth } from '../../modules/auth/hooks/useAuth'
import { ApiError } from '../../shared/api/httpClient'
import { Button } from '../../shared/components/Button'
import { Card } from '../../shared/components/Card'
import { DataTable, type Column } from '../../shared/components/DataTable'
import { Modal } from '../../shared/components/Modal'
import { PageContainer } from '../../shared/components/PageContainer'
import { SkeletonBoundary, TableSkeleton } from '../../shared/components/Skeleton'
import { StatusBadge } from '../../shared/components/StatusBadge'
import { TableActionButton } from '../../shared/components/TableActionButton'
import { identityApi } from '../../modules/identity/identity.api'
import type { CreateUserInput, ManagedUser, Organization, Permission, Role } from '../../modules/identity/identity.types'
import { RoleForm } from '../../modules/identity/components/RoleForm'
import { UserForm } from '../../modules/identity/components/UserForm'
import { useToast } from '../../modules/toast/hooks/useToast'
import { branchApi } from '../../modules/branch/api/branch.api'
import type { Branch } from '../../modules/branch/branch.types'
import { SearchableSelect } from '../../shared/components/SearchableSelect'

type UserManagementView = 'users' | 'roles'

type UserManagementPageProps = {
  view: UserManagementView
}

export function UserManagementPage({ view }: UserManagementPageProps) {
  const { can, user: currentUser } = useAuth()
  const toast = useToast()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [organizationId, setOrganizationId] = useState('')
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [editingUser, setEditingUser] = useState<ManagedUser | null | undefined>(undefined)
  const [editingRole, setEditingRole] = useState<Role | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const loadOrganization = useCallback(async (id: string) => { if (!id) return; setLoading(true); try { const [nextUsers, nextRoles, nextBranches] = await Promise.all([identityApi.users(id), identityApi.roles(id), branchApi.branches(id)]); setUsers(nextUsers); setRoles(nextRoles); setBranches(nextBranches.filter((branch) => branch.status === 'ACTIVE')) } catch (reason) { toast.error(reason instanceof ApiError ? reason.message : 'Unable to load identity data.', 'Access data unavailable') } finally { setLoading(false) } }, [toast])
  useEffect(() => { void (async () => { try { const [nextOrganizations, nextPermissions] = await Promise.all([identityApi.organizations(), identityApi.permissions()]); setOrganizations(nextOrganizations); setPermissions(nextPermissions); const assignedId = currentUser?.organizations[0]?.organizationId; const firstId = (!currentUser?.superAdmin && assignedId) ? assignedId : (nextOrganizations[0]?.id ?? ''); setOrganizationId(firstId); await loadOrganization(firstId) } catch (reason) { toast.error(reason instanceof ApiError ? reason.message : 'Unable to load identity data.', 'Access data unavailable'); setLoading(false) } })() }, [currentUser, loadOrganization, toast])
  const userColumns = useMemo<Column<ManagedUser>[]>(() => [
    { key: 'user', header: 'User', render: (user) => <div><strong className="block">{user.displayName}</strong><small className="mt-0.5 block font-normal text-[#7c8b88]">{user.email}</small></div> },
    { key: 'roles', header: 'Roles', render: (user) => <div className="flex flex-wrap gap-[5px]">{user.roles.map((role) => <span className="rounded-full bg-[#e8f0ed] px-2 py-1 text-[11px] font-medium text-[#365c5e]" key={role.id}>{role.name}</span>)}</div> },
    { key: 'branches', header: 'Branches', render: (user) => user.branches.map((branch) => branch.name).join(', ') },
    { key: 'status', header: 'Status', render: (user) => <StatusBadge label={user.status} tone={user.status === 'ACTIVE' ? 'success' : user.status === 'LOCKED' ? 'warning' : 'neutral'} /> },
    { key: 'lastLogin', header: 'Last login', render: (user) => user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never' },
    ...(can('users.manage') ? [{ key: 'edit', header: 'Edit', headerGroup: 'Action', align: 'center' as const, render: (user: ManagedUser) => !user.superAdmin ? <TableActionButton label={`Edit ${user.displayName}`} onClick={() => setEditingUser(user)}><Pencil className="size-4" aria-hidden /></TableActionButton> : null }] : []),
  ], [can])
  const roleColumns = useMemo<Column<Role>[]>(() => [
    { key: 'role', header: 'Role', render: (role) => <div><strong className="block">{role.name}</strong><small className="mt-0.5 block font-normal text-[#7c8b88]">{role.code}</small></div> },
    { key: 'permissions', header: 'Permissions', render: (role) => `${role.permissions.length} granted` },
    { key: 'type', header: 'Type', render: (role) => <StatusBadge label={role.systemRole ? 'System' : 'Custom'} tone={role.systemRole ? 'warning' : 'neutral'} /> },
    ...(can('roles.manage') ? [{ key: 'edit', header: 'Edit', headerGroup: 'Action', align: 'center' as const, render: (role: Role) => <TableActionButton label={`Edit ${role.name}`} onClick={() => setEditingRole(role)}><Pencil className="size-4" aria-hidden /></TableActionButton> }] : []),
  ], [can])
  const canView = view === 'users'
    ? can('users.read') || can('users.manage')
    : can('roles.read') || can('roles.manage')
  const pageLabel = view === 'users' ? 'Users' : 'Roles & permissions'
  const breadcrumbs = [{ label: 'Dashboard', to: '/' }, { label: 'User Management' }, { label: pageLabel }]
  if (!canView) return <PageContainer breadcrumbs={breadcrumbs} title="Access denied"><Card><p className="m-1 text-[13px] text-[#7b8986]">Contact an administrator if you need access to user or role management.</p></Card></PageContainer>
  const saveUser = async (input: CreateUserInput | { displayName: string; status: string; organizationId: string; roleIds: string[]; branchIds: string[] }) => { const updating = Boolean(editingUser); if (editingUser) await identityApi.updateUser(editingUser.id, input as { displayName: string; status: string; organizationId: string; roleIds: string[]; branchIds: string[] }); else await identityApi.createUser(input as CreateUserInput); setEditingUser(undefined); toast.success(updating ? 'The user account was updated. Existing sessions were ended so the new access applies.' : 'The new user can now sign in to the assigned company.', updating ? 'User updated' : 'User created'); await loadOrganization(organizationId) }
  const saveRole = async (input: { organizationId: string; code: string; name: string; permissions: string[] }) => { const updating = Boolean(editingRole); if (editingRole) await identityApi.updateRole(editingRole.id, input); else await identityApi.createRole(input); setEditingRole(undefined); toast.success(updating ? 'Role permissions were updated.' : 'The role is ready to assign.', updating ? 'Role updated' : 'Role created'); await loadOrganization(organizationId) }
  return <PageContainer
    breadcrumbs={breadcrumbs}
    title={pageLabel}
    action={view === 'users' && can('users.manage') ? <Button onClick={() => setEditingUser(null)}>Add user</Button> : view === 'roles' && can('roles.manage') ? <Button onClick={() => setEditingRole(null)}>Add role</Button> : undefined}
  >
    <div className="mb-4 flex justify-end"><div className="grid grid-cols-[auto_280px] items-center gap-x-3 gap-y-1 text-[13px] font-medium text-[#405653] max-sm:w-full max-sm:grid-cols-1"><span>Company</span><SearchableSelect ariaLabel="Company" disabled={!currentUser?.superAdmin} value={organizationId} options={organizations.map((organization) => ({ value: organization.id, label: organization.name, description: String(organization.code) }))} onChange={(value) => { setOrganizationId(value); void loadOrganization(value) }} placeholder="Select a company" searchPlaceholder="Search companies..." emptyMessage="No companies found." />{!currentUser?.superAdmin && <span className="col-start-2 text-[11px] font-normal text-[#7c8b88] max-sm:col-start-1">Fixed for your account</span>}</div></div>
    <Card className="overflow-x-auto"><SkeletonBoundary loading={loading} fallback={<TableSkeleton columns={view === 'users' ? 6 : 4} rows={5} />} minimumDurationMs={500}>{view === 'users' ? <DataTable columns={userColumns} rows={users} rowKey={(user) => user.id} emptyMessage="No users belong to this company." /> : <DataTable columns={roleColumns} rows={roles} rowKey={(role) => role.id} emptyMessage="No roles are configured." />}</SkeletonBoundary></Card>
    <Modal open={editingUser !== undefined} title={editingUser ? 'Edit user' : 'Create user'} onClose={() => setEditingUser(undefined)}>{organizationId && <UserForm organizationId={organizationId} roles={roles} branches={branches} user={editingUser ?? undefined} onSave={saveUser} onCancel={() => setEditingUser(undefined)} />}</Modal>
    <Modal open={editingRole !== undefined} title={editingRole ? 'Edit role' : 'Create role'} onClose={() => setEditingRole(undefined)}>{organizationId && <RoleForm organizationId={organizationId} permissions={permissions} role={editingRole ?? undefined} onSave={saveRole} onCancel={() => setEditingRole(undefined)} />}</Modal>
  </PageContainer>
}
