export type OrganizationAccess = {
  organizationId: string
  organizationCode: string
  organizationName: string
  roles: string[]
  branches: { id: string; code: string; name: string; branchType: string }[]
}

export type CurrentUser = {
  id: string
  email: string
  displayName: string
  superAdmin: boolean
  permissions: string[]
  organizations: OrganizationAccess[]
}

export type TokenResponse = {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
  user: CurrentUser
}
