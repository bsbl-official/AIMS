import type { Company } from '../../../modules/company/company.types'

type CompanyDetailsProps = { company: Company }

const display = (value: string | number | null) => value === null || value === '' ? '—' : String(value)

export function CompanyDetails({ company }: CompanyDetailsProps) {
  const details = [
    ['Company code', company.code], ['Legal name', company.legalName], ['Trading name', company.tradingName],
    ['Registration number', company.registrationNumber], ['Tax identifier', company.taxIdentifier],
    ['Base currency', company.baseCurrencyCode], ['Status', company.status], ['Country', company.countryCode],
    ['Timezone', company.timezone], ['Locale', company.locale], ['Address line 1', company.addressLine1],
    ['Address line 2', company.addressLine2], ['City', company.city], ['State or province', company.stateProvince],
    ['Postal code', company.postalCode], ['Email', company.email], ['Phone', company.phone], ['Website', company.website],
  ] as const

  return <dl className="grid grid-cols-2 gap-x-6 gap-y-4 max-md:grid-cols-1">
    {details.map(([label, value]) => <div key={label} className="border-b border-[#edf0ec] pb-3">
      <dt className="text-xs text-[#788681]">{label}</dt>
      <dd className="mt-1 text-sm text-[#203236]">{display(value)}</dd>
    </div>)}
  </dl>
}
