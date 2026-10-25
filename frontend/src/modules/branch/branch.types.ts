export type BranchStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED'
export type BranchType = 'HEAD_OFFICE' | 'BRANCH'

export type Branch = {
  id: string
  companyId: string
  companyCode: string
  companyName: string
  code: string
  name: string
  branchType: BranchType
  countryCode: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  stateProvince: string | null
  postalCode: string | null
  email: string | null
  phone: string | null
  timezone: string
  status: BranchStatus
  createdAt: string
  updatedAt: string
  version: number
}

export type BranchFormValues = {
  companyId: string
  code: string
  name: string
  branchType: BranchType
  countryCode: string
  addressLine1: string
  addressLine2: string
  city: string
  stateProvince: string
  postalCode: string
  email: string
  phone: string
  timezone: string
  status: BranchStatus
}
