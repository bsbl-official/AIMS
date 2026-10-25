import { request } from '../../shared/api/httpClient'
import type { CreateUserInput, ManagedUser, Organization, Permission, Role } from './identity.types'

export const identityApi = {
  organizations: () => request<Organization[]>('/identity/organizations'),
  users: (organizationId: string) => request<ManagedUser[]>(`/identity/users?organizationId=${encodeURIComponent(organizationId)}`),
  roles: (organizationId: string) => request<Role[]>(`/identity/roles?organizationId=${encodeURIComponent(organizationId)}`),
  permissions: () => request<Permission[]>('/identity/permissions'),
  createUser: (input: CreateUserInput) => request<ManagedUser>('/identity/users', { method: 'POST', body: JSON.stringify(input) }),
  updateUser: (id: string, input: { displayName: string; status: string; organizationId: string; roleIds: string[]; branchIds: string[] }) =>
    request<ManagedUser>(`/identity/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  createRole: (input: { organizationId: string; code: string; name: string; permissions: string[] }) =>
    request<Role>('/identity/roles', { method: 'POST', body: JSON.stringify(input) }),
  updateRole: (id: string, input: { organizationId: string; code: string; name: string; permissions: string[] }) =>
    request<Role>(`/identity/roles/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
}
