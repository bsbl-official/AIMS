import { useState, type FormEvent } from 'react'
import type { FinanceCode, FinanceCodeFormValues, FinanceCodeStatus } from '../../../modules/finance-code/finance-code.types'
import type { ProjectCode } from '../../../modules/project-code/project-code.types'
import { useToast } from '../../../modules/toast/hooks/useToast'
import { ApiError } from '../../api/httpClient'
import { Button } from '../Button'
import { SearchableSelect } from '../SearchableSelect'
import { SetupFormField, SetupInput, setupInputClass } from '../forms/SetupFormField'

const STATUS_OPTIONS = [{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]

export function FinanceCodeForm({ item, projects, defaultProjectId, onSave, onCancel }: { item?: FinanceCode; projects: ProjectCode[]; defaultProjectId: string; onSave: (values: FinanceCodeFormValues) => Promise<void>; onCancel: () => void }) {
  const toast = useToast()
  const [values, setValues] = useState<FinanceCodeFormValues>({ projectCodeId: item ? String(item.projectCodeId) : defaultProjectId, code: item ? String(item.code) : '', name: item?.name ?? '', description: item?.description ?? '', status: item?.status ?? 'ACTIVE' })
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof FinanceCodeFormValues>(key: K, value: FinanceCodeFormValues[K]) => setValues((current) => ({ ...current, [key]: value }))
  async function submit(event: FormEvent) { event.preventDefault(); if (!values.projectCodeId) { toast.error('Select a project code.', 'Project required'); return } setSaving(true); try { await onSave(values) } catch (reason) { toast.error(reason instanceof ApiError ? reason.message : 'Unable to save the finance code.', 'Finance code was not saved') } finally { setSaving(false) } }
  return <form className="grid grid-cols-2 gap-4 max-md:grid-cols-1" onSubmit={submit}>
    <SetupFormField label="Project code"><SearchableSelect ariaLabel="Project code" value={values.projectCodeId} options={projects.map((project) => ({ value: String(project.id), label: project.name, description: String(project.code), disabled: project.status !== 'ACTIVE' }))} onChange={(value) => set('projectCodeId', value)} searchPlaceholder="Search projects..." required /></SetupFormField>
    <SetupFormField label="Finance code"><SetupInput value={values.code} onChange={(event) => set('code', event.target.value.replace(/\D/g, ''))} inputMode="numeric" pattern="[0-9]+" maxLength={10} disabled={Boolean(item)} required /></SetupFormField>
    <SetupFormField label="Finance name"><SetupInput value={values.name} onChange={(event) => set('name', event.target.value)} maxLength={160} required /></SetupFormField>
    {item && <SetupFormField label="Status"><SearchableSelect ariaLabel="Finance status" options={STATUS_OPTIONS} value={values.status} onChange={(value) => set('status', value as FinanceCodeStatus)} /></SetupFormField>}
    <SetupFormField label="Description" fullWidth><textarea className={`${setupInputClass} min-h-24 resize-y`} value={values.description} onChange={(event) => set('description', event.target.value)} maxLength={500} /></SetupFormField>
    <div className="flex justify-end gap-2.5 pt-2 md:col-span-2"><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : item ? 'Save changes' : 'Create finance code'}</Button></div>
  </form>
}
