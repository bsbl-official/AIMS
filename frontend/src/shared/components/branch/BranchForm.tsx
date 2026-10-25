import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/httpClient'
import { Button } from '../Button'
import { useToast } from '../../../modules/toast/hooks/useToast'
import type { Branch, BranchFormValues, BranchStatus, BranchType } from '../../../modules/branch/branch.types'
import type { Company } from '../../../modules/company/company.types'
import { SetupFormField, SetupInput } from '../forms/SetupFormField'
import { SearchableSelect } from '../SearchableSelect'

const BRANCH_TYPE_OPTIONS = [
  { value: 'HEAD_OFFICE', label: 'Head office' },
  { value: 'BRANCH', label: 'Branch' },
]

const BRANCH_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'CLOSED', label: 'Closed' },
]

type BranchFormProps = {
  branch?: Branch
  companies: Company[]
  defaultCompanyId: string
  onSave: (values: BranchFormValues) => Promise<void>
  onCancel: () => void
}

function initialValues(branch: Branch | undefined, defaultCompanyId: string): BranchFormValues {
  return {
    companyId: branch?.companyId ?? defaultCompanyId,
    code: branch?.code ?? '',
    name: branch?.name ?? '',
    branchType: branch?.branchType ?? 'BRANCH',
    countryCode: branch?.countryCode ?? 'BD',
    addressLine1: branch?.addressLine1 ?? '',
    addressLine2: branch?.addressLine2 ?? '',
    city: branch?.city ?? '',
    stateProvince: branch?.stateProvince ?? '',
    postalCode: branch?.postalCode ?? '',
    email: branch?.email ?? '',
    phone: branch?.phone ?? '',
    timezone: branch?.timezone ?? 'Asia/Dhaka',
    status: branch?.status ?? 'ACTIVE',
  }
}

export function BranchForm({ branch, companies, defaultCompanyId, onSave, onCancel }: BranchFormProps) {
  const toast = useToast()
  const [values, setValues] = useState(() => initialValues(branch, defaultCompanyId))
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof BranchFormValues>(key: K, value: BranchFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!values.companyId) { toast.error('Select a company for this branch.', 'Company required'); return }
    setSaving(true)
    try {
      await onSave(values)
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : 'Unable to save the branch.', 'Branch was not saved')
    } finally {
      setSaving(false)
    }
  }

  return <form className="grid grid-cols-2 gap-4 max-md:grid-cols-1" onSubmit={submit}>
    <SetupFormField label="Company"><SearchableSelect ariaLabel="Company" value={values.companyId} options={companies.map((company) => ({ value: company.id, label: company.legalName, description: company.code }))} onChange={(value) => set('companyId', value)} disabled={Boolean(branch)} placeholder="Select a company" searchPlaceholder="Search companies..." required /></SetupFormField>
    <SetupFormField label="Branch code"><SetupInput value={values.code} onChange={(event) => set('code', event.target.value.toUpperCase())} maxLength={40} disabled={Boolean(branch)} required /></SetupFormField>
    <SetupFormField label="Branch name"><SetupInput value={values.name} onChange={(event) => set('name', event.target.value)} maxLength={200} required /></SetupFormField>
    <SetupFormField label="Branch type"><SearchableSelect ariaLabel="Branch type" options={BRANCH_TYPE_OPTIONS} value={values.branchType} onChange={(value) => set('branchType', value as BranchType)} searchPlaceholder="Search branch types..." /></SetupFormField>
    {branch && <SetupFormField label="Status"><SearchableSelect ariaLabel="Branch status" options={BRANCH_STATUS_OPTIONS} value={values.status} onChange={(value) => set('status', value as BranchStatus)} searchPlaceholder="Search statuses..." /></SetupFormField>}
    <SetupFormField label="Country code"><SetupInput value={values.countryCode} onChange={(event) => set('countryCode', event.target.value.toUpperCase())} maxLength={2} placeholder="BD" /></SetupFormField>
    <SetupFormField label="Timezone"><SetupInput value={values.timezone} onChange={(event) => set('timezone', event.target.value)} maxLength={60} required /></SetupFormField>
    <SetupFormField label="Address line 1" fullWidth><SetupInput value={values.addressLine1} onChange={(event) => set('addressLine1', event.target.value)} maxLength={200} /></SetupFormField>
    <SetupFormField label="Address line 2" fullWidth><SetupInput value={values.addressLine2} onChange={(event) => set('addressLine2', event.target.value)} maxLength={200} /></SetupFormField>
    <SetupFormField label="City"><SetupInput value={values.city} onChange={(event) => set('city', event.target.value)} maxLength={100} /></SetupFormField>
    <SetupFormField label="State or province"><SetupInput value={values.stateProvince} onChange={(event) => set('stateProvince', event.target.value)} maxLength={100} /></SetupFormField>
    <SetupFormField label="Postal code"><SetupInput value={values.postalCode} onChange={(event) => set('postalCode', event.target.value)} maxLength={30} /></SetupFormField>
    <SetupFormField label="Email"><SetupInput type="email" value={values.email} onChange={(event) => set('email', event.target.value)} maxLength={320} /></SetupFormField>
    <SetupFormField label="Phone"><SetupInput value={values.phone} onChange={(event) => set('phone', event.target.value)} maxLength={50} /></SetupFormField>
    <div className="flex justify-end gap-2.5 pt-2 md:col-span-2"><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : branch ? 'Save changes' : 'Create branch'}</Button></div>
  </form>
}
