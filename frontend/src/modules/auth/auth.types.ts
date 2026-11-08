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
  gender: 'MALE' | 'FEMALE' | 'PREFER_NOT_TO_SAY'
  profilePhotoAvailable: boolean
  profilePhotoVersion: number
  permissions: string[]
  organizations: OrganizationAccess[]
}

export type TokenResponse = {
  expiresInSeconds: number
  user: CurrentUser
}
