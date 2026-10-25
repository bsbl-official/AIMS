import { useState, type FormEvent } from 'react'
import type { ProjectCode, ProjectCodeFormValues, ProjectCodeStatus } from '../../../modules/project-code/project-code.types'
import { useToast } from '../../../modules/toast/hooks/useToast'
import { ApiError } from '../../api/httpClient'
import { Button } from '../Button'
import { SearchableSelect } from '../SearchableSelect'
import { SetupFormField, SetupInput, setupInputClass } from '../forms/SetupFormField'

const STATUS_OPTIONS = [{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]

export function ProjectCodeForm({ item, onSave, onCancel }: { item?: ProjectCode; onSave: (values: ProjectCodeFormValues) => Promise<void>; onCancel: () => void }) {
  const toast = useToast()
  const [values, setValues] = useState<ProjectCodeFormValues>({ code: item ? String(item.code) : '', name: item?.name ?? '', description: item?.description ?? '', status: item?.status ?? 'ACTIVE' })
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof ProjectCodeFormValues>(key: K, value: ProjectCodeFormValues[K]) => setValues((current) => ({ ...current, [key]: value }))
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); try { await onSave(values) } catch (reason) { toast.error(reason instanceof ApiError ? reason.message : 'Unable to save the project code.', 'Project code was not saved') } finally { setSaving(false) } }
  return <form className="grid grid-cols-2 gap-4 max-md:grid-cols-1" onSubmit={submit}>
    <SetupFormField label="Project code"><SetupInput value={values.code} onChange={(event) => set('code', event.target.value.replace(/\D/g, ''))} inputMode="numeric" pattern="[0-9]+" maxLength={10} disabled={Boolean(item)} required /></SetupFormField>
    <SetupFormField label="Project name"><SetupInput value={values.name} onChange={(event) => set('name', event.target.value)} maxLength={160} required /></SetupFormField>
    {item && <SetupFormField label="Status"><SearchableSelect ariaLabel="Project status" options={STATUS_OPTIONS} value={values.status} onChange={(value) => set('status', value as ProjectCodeStatus)} /></SetupFormField>}
    <SetupFormField label="Description" fullWidth><textarea className={`${setupInputClass} min-h-24 resize-y`} value={values.description} onChange={(event) => set('description', event.target.value)} maxLength={500} /></SetupFormField>
    <div className="flex justify-end gap-2.5 pt-2 md:col-span-2"><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : item ? 'Save changes' : 'Create project code'}</Button></div>
  </form>
}
