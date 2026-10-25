import { useMemo, useState, type FormEvent } from 'react'
import type { ComponentCode, ComponentCodeFormValues, ComponentCodeStatus } from '../../../modules/component-code/component-code.types'
import type { FinanceCode } from '../../../modules/finance-code/finance-code.types'
import type { ProjectCode } from '../../../modules/project-code/project-code.types'
import { useToast } from '../../../modules/toast/hooks/useToast'
import { ApiError } from '../../api/httpClient'
import { Button } from '../Button'
import { SearchableSelect } from '../SearchableSelect'
import { SetupFormField, SetupInput, setupInputClass } from '../forms/SetupFormField'

const STATUS_OPTIONS = [{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]

export function ComponentCodeForm({ item, projects, finances, defaultProjectId, defaultFinanceId, onSave, onCancel }: { item?: ComponentCode; projects: ProjectCode[]; finances: FinanceCode[]; defaultProjectId: string; defaultFinanceId: string; onSave: (values: ComponentCodeFormValues) => Promise<void>; onCancel: () => void }) {
  const toast = useToast()
  const [values, setValues] = useState<ComponentCodeFormValues>({ projectCodeId: item ? String(item.projectCodeId) : defaultProjectId, financeCodeId: item ? String(item.financeCodeId) : defaultFinanceId, code: item ? String(item.code) : '', name: item?.name ?? '', description: item?.description ?? '', status: item?.status ?? 'ACTIVE' })
  const [saving, setSaving] = useState(false)
  const matchingFinances = useMemo(() => finances.filter((finance) => String(finance.projectCodeId) === values.projectCodeId), [finances, values.projectCodeId])
  const set = <K extends keyof ComponentCodeFormValues>(key: K, value: ComponentCodeFormValues[K]) => setValues((current) => ({ ...current, [key]: value }))
  async function submit(event: FormEvent) { event.preventDefault(); if (!values.projectCodeId || !values.financeCodeId) { toast.error('Select both a project code and finance code.', 'Hierarchy required'); return } setSaving(true); try { await onSave(values) } catch (reason) { toast.error(reason instanceof ApiError ? reason.message : 'Unable to save the component code.', 'Component code was not saved') } finally { setSaving(false) } }
  return <form className="grid grid-cols-2 gap-4 max-md:grid-cols-1" onSubmit={submit}>
    <SetupFormField label="Project code"><SearchableSelect ariaLabel="Project code" value={values.projectCodeId} options={projects.map((project) => ({ value: String(project.id), label: project.name, description: String(project.code), disabled: project.status !== 'ACTIVE' }))} onChange={(value) => setValues((current) => ({ ...current, projectCodeId: value, financeCodeId: '' }))} searchPlaceholder="Search projects..." required /></SetupFormField>
    <SetupFormField label="Finance code"><SearchableSelect ariaLabel="Finance code" value={values.financeCodeId} options={matchingFinances.map((finance) => ({ value: String(finance.id), label: finance.name, description: String(finance.code), disabled: finance.status !== 'ACTIVE' }))} onChange={(value) => set('financeCodeId', value)} disabled={!values.projectCodeId} searchPlaceholder="Search finance codes..." required /></SetupFormField>
    <SetupFormField label="Component code"><SetupInput value={values.code} onChange={(event) => set('code', event.target.value.replace(/\D/g, ''))} inputMode="numeric" pattern="[0-9]+" maxLength={10} disabled={Boolean(item)} required /></SetupFormField>
    <SetupFormField label="Component name"><SetupInput value={values.name} onChange={(event) => set('name', event.target.value)} maxLength={160} required /></SetupFormField>
    {item && <SetupFormField label="Status"><SearchableSelect ariaLabel="Component status" options={STATUS_OPTIONS} value={values.status} onChange={(value) => set('status', value as ComponentCodeStatus)} /></SetupFormField>}
    <SetupFormField label="Description" fullWidth><textarea className={`${setupInputClass} min-h-24 resize-y`} value={values.description} onChange={(event) => set('description', event.target.value)} maxLength={500} /></SetupFormField>
    <div className="flex justify-end gap-2.5 pt-2 md:col-span-2"><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : item ? 'Save changes' : 'Create component code'}</Button></div>
  </form>
}
