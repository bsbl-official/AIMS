export type CompanyStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED'

export type Company = {
  id: string
  code: string
  legalName: string
  tradingName: string | null
  registrationNumber: string | null
  taxIdentifier: string | null
  baseCurrencyCode: string
  timezone: string
  locale: string
  countryCode: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  stateProvince: string | null
  postalCode: string | null
  email: string | null
  phone: string | null
  website: string | null
  status: CompanyStatus
  createdAt: string
  updatedAt: string
  version: number
}

export type CompanyFormValues = {
  code: string
  legalName: string
  tradingName: string
  registrationNumber: string
  taxIdentifier: string
  baseCurrencyCode: string
  timezone: string
  locale: string
  countryCode: string
  addressLine1: string
  addressLine2: string
  city: string
  stateProvince: string
  postalCode: string
  email: string
  phone: string
  website: string
  status: CompanyStatus
}
