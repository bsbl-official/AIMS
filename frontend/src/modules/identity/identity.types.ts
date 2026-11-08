export type Organization = { id: string; code: string; name: string }
export type RoleSummary = { id: string; code: string; name: string; systemRole: boolean }
export type Role = RoleSummary & { organizationId: string; permissionIds: string[] }
export type Permission = {
  id:string; organizationId:string|null; code:string; name:string; description:string
  status:'ACTIVE'|'INACTIVE'; systemPermission:boolean; capabilityCodes:string[]; updatedAt:string; version:number
}
export type Capability = { code:string; module:string; name:string; description:string }
export type AssignedBranch = { id: string; code: string; name: string; branchType: string }
export type ManagedUser = {
  id: string
  email: string
  displayName: string
  status: 'ACTIVE' | 'LOCKED' | 'DISABLED'
  superAdmin: boolean
  lastLoginAt: string | null
  organizationId: string | null
  organizationName: string | null
  roles: RoleSummary[]
  branches: AssignedBranch[]
}

export type CreatePermissionInput = {
  organizationId:string; code:string; name:string; description:string; capabilityCodes:string[]
}

export type UpdatePermissionInput = {
  name:string; description:string; status:'ACTIVE'|'INACTIVE'; capabilityCodes:string[]; version:number
}

export type CreateUserInput = {
  email: string
  displayName: string
  password: string
  organizationId: string
  roleIds: string[]
  branchIds: string[]
}
