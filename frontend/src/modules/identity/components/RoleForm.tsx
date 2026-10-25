import { useState, type FormEvent } from 'react'
import { ApiError } from '../../../shared/api/httpClient'
import { Button } from '../../../shared/components/Button'
import type { Permission, Role } from '../identity.types'
import { useToast } from '../../toast/hooks/useToast'

type RoleFormProps = { organizationId: string; permissions: Permission[]; role?: Role; onSave: (input: { organizationId: string; code: string; name: string; permissions: string[] }) => Promise<void>; onCancel: () => void }

export function RoleForm({ organizationId, permissions, role, onSave, onCancel }: RoleFormProps) {
  const toast = useToast()
  const [name, setName] = useState(role?.name ?? '')
  const [code, setCode] = useState(role?.code ?? '')
  const [selected, setSelected] = useState<string[]>(role?.permissions ?? [])
  const [saving, setSaving] = useState(false)
  const toggle = (permission: string) => setSelected((current) => current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission])
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); try { await onSave({ organizationId, code, name, permissions: selected }) } catch (reason) { toast.error(reason instanceof ApiError ? reason.message : 'Unable to save this role.', 'Role was not saved') } finally { setSaving(false) } }
  const fieldClass = 'grid gap-[7px] text-[13px] font-medium text-[#405653]'
  const inputClass = 'w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-[11px] text-[#203236] outline-none focus:border-[#347077] focus:shadow-[0_0_0_3px_rgba(52,112,119,.12)] disabled:cursor-not-allowed disabled:bg-[#f3f5f3]'
  return <form className="grid gap-[18px]" onSubmit={submit}>
    <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1"><label className={fieldClass}>Role name<input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required /></label><label className={fieldClass}>Role code<input className={inputClass} value={code} onChange={(event) => setCode(event.target.value)} disabled={role?.systemRole} required /></label></div>
    <fieldset className="grid max-h-[330px] min-w-0 grid-cols-2 gap-2 overflow-y-auto rounded-[9px] border border-[#e0e5e0] p-3 max-sm:grid-cols-1"><legend className="px-1.5 text-[13px] font-medium text-[#405653]">Permissions</legend>{permissions.map((permission) => <label className="flex cursor-pointer items-start gap-[9px] rounded-[7px] p-2 hover:bg-[#f6f8f5]" key={permission.code}><input className="mt-[3px] accent-[#1d4a50]" type="checkbox" checked={selected.includes(permission.code)} onChange={() => toggle(permission.code)} /><span><strong className="block text-[13px] text-[#294541]">{permission.code}</strong><small className="mt-0.5 block font-normal text-[#7c8b88]">{permission.description}</small></span></label>)}</fieldset>
    <div className="flex justify-end gap-2.5 pt-1"><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save role'}</Button></div>
  </form>
}
