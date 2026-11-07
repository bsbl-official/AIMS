import type { Organization } from '../../../modules/identity/identity.types'
import { useEffect } from 'react'
import { useOrganizationContext } from '../../../modules/organization-context/useOrganizationContext'

type CompanyCodeSelectorProps = {
  companies: Organization[]
  value: string
  disabled: boolean
  onChange: (companyId: string) => void
}

export function CompanyCodeSelector({ value, onChange }: CompanyCodeSelectorProps) {
  const { companyId } = useOrganizationContext()
  useEffect(() => { if (companyId && companyId !== value) onChange(companyId) }, [companyId, onChange, value])
  return null
}
