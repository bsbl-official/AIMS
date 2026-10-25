import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { ApiError } from '../../api/httpClient'
import { Button } from '../Button'
import { useToast } from '../../../modules/toast/hooks/useToast'
import type { Company, CompanyFormValues, CompanyStatus } from '../../../modules/company/company.types'
import { SetupFormField, SetupInput } from '../forms/SetupFormField'
import { SearchableSelect } from '../SearchableSelect'

const COMPANY_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'CLOSED', label: 'Closed' },
]

type CompanyFormProps = {
  company?: Company
  onSave: (values: CompanyFormValues) => Promise<void>
  onCancel: () => void
}

function initialValues(company?: Company): CompanyFormValues {
  return {
    code: company ? String(company.code) : '',
    legalName: company?.legalName ?? '',
    tradingName: company?.tradingName ?? '',
    registrationNumber: company?.registrationNumber ?? '',
    taxIdentifier: company?.taxIdentifier ?? '',
    baseCurrencyCode: company?.baseCurrencyCode ?? 'BDT',
    timezone: company?.timezone ?? 'Asia/Dhaka',
    locale: company?.locale ?? 'en-BD',
    countryCode: company?.countryCode ?? 'BD',
    addressLine1: company?.addressLine1 ?? '',
    addressLine2: company?.addressLine2 ?? '',
    city: company?.city ?? '',
    stateProvince: company?.stateProvince ?? '',
    postalCode: company?.postalCode ?? '',
    email: company?.email ?? '',
    phone: company?.phone ?? '',
    website: company?.website ?? '',
    status: company?.status ?? 'ACTIVE',
  }
}

export function CompanyForm({ company, onSave, onCancel }: CompanyFormProps) {
  const toast = useToast()
  const [values, setValues] = useState(() => initialValues(company))
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof CompanyFormValues>(key: K, value: CompanyFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  function moveToNextInput(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement)) return
    event.preventDefault()
    const inputs = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>(
      'input:not([disabled]):not([type="hidden"])',
    ))
    const nextInput = inputs[inputs.indexOf(event.target) + 1]
    if (nextInput) nextInput.focus()
    else event.currentTarget.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus()
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave(values)
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : 'Unable to save the company.', 'Company was not saved')
    } finally {
      setSaving(false)
    }
  }

  return <form className="grid grid-cols-2 gap-4 max-md:grid-cols-1" onSubmit={submit} onKeyDown={moveToNextInput}>
    <SetupFormField label="Company code"><SetupInput value={values.code} onChange={(event) => set('code', event.target.value.replace(/\D/g, ''))} inputMode="numeric" pattern="[0-9]+" minLength={1} maxLength={18} disabled={Boolean(company)} required /></SetupFormField>
    <SetupFormField label="Legal company name"><SetupInput value={values.legalName} onChange={(event) => set('legalName', event.target.value)} maxLength={200} required /></SetupFormField>
    <SetupFormField label="Trading name"><SetupInput value={values.tradingName} onChange={(event) => set('tradingName', event.target.value)} maxLength={200} /></SetupFormField>
    <SetupFormField label="Registration number"><SetupInput value={values.registrationNumber} onChange={(event) => set('registrationNumber', event.target.value)} maxLength={100} /></SetupFormField>
    <SetupFormField label="Tax identifier"><SetupInput value={values.taxIdentifier} onChange={(event) => set('taxIdentifier', event.target.value)} maxLength={100} /></SetupFormField>
    <SetupFormField label="Base currency"><SetupInput value={values.baseCurrencyCode} onChange={(event) => set('baseCurrencyCode', event.target.value.toUpperCase())} minLength={3} maxLength={3} required /></SetupFormField>
    <SetupFormField label="Country code"><SetupInput value={values.countryCode} onChange={(event) => set('countryCode', event.target.value.toUpperCase())} maxLength={2} placeholder="BD" /></SetupFormField>
    <SetupFormField label="Timezone"><SetupInput value={values.timezone} onChange={(event) => set('timezone', event.target.value)} maxLength={60} required /></SetupFormField>
    <SetupFormField label="Locale"><SetupInput value={values.locale} onChange={(event) => set('locale', event.target.value)} maxLength={20} required /></SetupFormField>
    {company && <SetupFormField label="Status"><SearchableSelect ariaLabel="Company status" options={COMPANY_STATUS_OPTIONS} value={values.status} onChange={(value) => set('status', value as CompanyStatus)} searchPlaceholder="Search statuses..." /></SetupFormField>}
    <SetupFormField label="Address line 1" fullWidth><SetupInput value={values.addressLine1} onChange={(event) => set('addressLine1', event.target.value)} maxLength={200} /></SetupFormField>
    <SetupFormField label="Address line 2" fullWidth><SetupInput value={values.addressLine2} onChange={(event) => set('addressLine2', event.target.value)} maxLength={200} /></SetupFormField>
    <SetupFormField label="City"><SetupInput value={values.city} onChange={(event) => set('city', event.target.value)} maxLength={100} /></SetupFormField>
    <SetupFormField label="State or province"><SetupInput value={values.stateProvince} onChange={(event) => set('stateProvince', event.target.value)} maxLength={100} /></SetupFormField>
    <SetupFormField label="Postal code"><SetupInput value={values.postalCode} onChange={(event) => set('postalCode', event.target.value)} maxLength={30} /></SetupFormField>
    <SetupFormField label="Email"><SetupInput type="email" value={values.email} onChange={(event) => set('email', event.target.value)} maxLength={320} /></SetupFormField>
    <SetupFormField label="Phone"><SetupInput value={values.phone} onChange={(event) => set('phone', event.target.value)} maxLength={50} /></SetupFormField>
    <SetupFormField label="Website"><SetupInput type="url" value={values.website} onChange={(event) => set('website', event.target.value)} maxLength={255} placeholder="https://" /></SetupFormField>
    <div className="flex justify-end gap-2.5 pt-2 md:col-span-2"><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : company ? 'Save changes' : 'Create company'}</Button></div>
  </form>
}
