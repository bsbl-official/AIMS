export type Organization = { id: string; code: string; name: string }
export type RoleSummary = { id: string; code: string; name: string; systemRole: boolean }
export type Role = RoleSummary & { organizationId: string; permissions: string[] }
export type Permission = { code: string; description: string }
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

export type CreateUserInput = {
  email: string
  displayName: string
  password: string
  organizationId: string
  roleIds: string[]
  branchIds: string[]
}
