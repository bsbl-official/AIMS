import type { Organization } from '../../../modules/identity/identity.types'
import { SearchableSelect } from '../SearchableSelect'

type CompanyCodeSelectorProps = {
  companies: Organization[]
  value: string
  disabled: boolean
  onChange: (companyId: string) => void
}

export function CompanyCodeSelector({ companies, value, disabled, onChange }: CompanyCodeSelectorProps) {
  return <div className="grid min-w-[300px] grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-[13px] font-medium text-[#405653] max-sm:w-full max-sm:min-w-0 max-sm:grid-cols-1">
    <span>Company</span>
    <SearchableSelect ariaLabel="Company" disabled={disabled} value={value} options={companies.map((company) => ({ value: company.id, label: company.name, description: String(company.code) }))} onChange={onChange} placeholder="Select a company" searchPlaceholder="Search companies..." emptyMessage="No companies found." />
    {disabled && <span className="col-start-2 text-[11px] font-normal text-[#7c8b88] max-sm:col-start-1">Fixed for your account</span>}
  </div>
}
