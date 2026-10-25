import { useState, type FormEvent } from 'react'
import type { ChartOfAccount, ChartOfAccountFormValues, DeviceFlag } from '../../../modules/coa/coa.types'
import { useToast } from '../../../modules/toast/hooks/useToast'
import { ApiError } from '../../api/httpClient'
import { Button } from '../Button'
import { SearchableSelect } from '../SearchableSelect'
import { SetupFormField, SetupInput } from '../forms/SetupFormField'

const DEVICE_OPTIONS = [
  { value: 'N', label: 'No' },
  { value: 'Y', label: 'Yes' },
]

export function ChartOfAccountForm({ item, onSave, onCancel }: {
  item?: ChartOfAccount
  onSave: (values: ChartOfAccountFormValues) => Promise<void>
  onCancel: () => void
}) {
  const toast = useToast()
  const [values, setValues] = useState<ChartOfAccountFormValues>({
    coaId: item ? String(item.coaId).padStart(2, '0') : '',
    description: item?.description ?? '',
    deviceFlag: item?.deviceFlag ?? 'N',
  })
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave(values)
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : 'Unable to save the COA entry.', 'COA entry was not saved')
    } finally {
      setSaving(false)
    }
  }

  return <form className="grid grid-cols-2 gap-4 max-md:grid-cols-1" onSubmit={submit}>
    <SetupFormField label="COA ID">
      <SetupInput value={values.coaId} onChange={(event) => setValues((current) => ({ ...current, coaId: event.target.value.replace(/\D/g, '') }))} inputMode="numeric" pattern="[0-9]+" maxLength={2} disabled={Boolean(item)} required />
    </SetupFormField>
    <SetupFormField label="Device flag">
      <SearchableSelect ariaLabel="Device flag" value={values.deviceFlag} options={DEVICE_OPTIONS} onChange={(value) => setValues((current) => ({ ...current, deviceFlag: value as DeviceFlag }))} />
    </SetupFormField>
    <SetupFormField label="COA description" fullWidth>
      <SetupInput value={values.description} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} maxLength={100} required />
    </SetupFormField>
    <div className="flex justify-end gap-2.5 pt-2 md:col-span-2">
      <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      <Button type="submit" disabled={saving}>{saving ? 'Saving...' : item ? 'Save changes' : 'Create COA entry'}</Button>
    </div>
  </form>
}
