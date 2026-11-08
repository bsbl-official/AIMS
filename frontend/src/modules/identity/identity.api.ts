import { request } from '../../shared/api/httpClient'
import type { Capability, CreatePermissionInput, CreateUserInput, ManagedUser, Organization, Permission, Role, UpdatePermissionInput } from './identity.types'

export const identityApi = {
  organizations: () => request<Organization[]>('/identity/organizations'),
  users: (organizationId: string) => request<ManagedUser[]>(`/identity/users?organizationId=${encodeURIComponent(organizationId)}`),
  roles: (organizationId: string) => request<Role[]>(`/identity/roles?organizationId=${encodeURIComponent(organizationId)}`),
  permissions: (organizationId:string) => request<Permission[]>(`/identity/permissions?organizationId=${encodeURIComponent(organizationId)}`),
  capabilities: (organizationId:string) => request<Capability[]>(`/identity/capabilities?organizationId=${encodeURIComponent(organizationId)}`),
  createUser: (input: CreateUserInput) => request<ManagedUser>('/identity/users', { method: 'POST', body: JSON.stringify(input) }),
  updateUser: (id: string, input: { displayName: string; status: string; organizationId: string; roleIds: string[]; branchIds: string[] }) =>
    request<ManagedUser>(`/identity/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  createRole: (input: { organizationId: string; code: string; name: string; permissionIds: string[] }) =>
    request<Role>('/identity/roles', { method: 'POST', body: JSON.stringify(input) }),
  updateRole: (id: string, input: { organizationId: string; code: string; name: string; permissionIds: string[] }) =>
    request<Role>(`/identity/roles/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  createPermission:(input:CreatePermissionInput)=>request<Permission>('/identity/permissions',{method:'POST',body:JSON.stringify(input)}),
  updatePermission:(organizationId:string,id:string,input:UpdatePermissionInput)=>request<Permission>(`/identity/permissions/${id}?organizationId=${encodeURIComponent(organizationId)}`,{method:'PATCH',body:JSON.stringify(input)}),
}
