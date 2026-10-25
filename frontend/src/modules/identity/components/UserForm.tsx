import { useState, type FormEvent } from 'react'
import { ApiError } from '../../../shared/api/httpClient'
import { Button } from '../../../shared/components/Button'
import { PasswordInput } from '../../../shared/components/PasswordInput'
import type { CreateUserInput, ManagedUser, Role } from '../identity.types'
import type { Branch } from '../../branch/branch.types'
import { BranchSelector } from './BranchSelector'
import { RoleSelector } from './RoleSelector'
import { useToast } from '../../toast/hooks/useToast'
import { SearchableSelect } from '../../../shared/components/SearchableSelect'

const USER_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'LOCKED', label: 'Locked' },
  { value: 'DISABLED', label: 'Disabled' },
]

type UserFormProps = {
  organizationId: string
  roles: Role[]
  branches: Branch[]
  user?: ManagedUser
  onSave: (input: CreateUserInput | { displayName: string; status: string; organizationId: string; roleIds: string[]; branchIds: string[] }) => Promise<void>
  onCancel: () => void
}

export function UserForm({ organizationId, roles, branches, user, onSave, onCancel }: UserFormProps) {
  const toast = useToast()
  const [email, setEmail] = useState(user?.email ?? '')
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<string>(user?.status ?? 'ACTIVE')
  const [roleIds, setRoleIds] = useState(user?.roles.map((role) => role.id) ?? [])
  const [branchIds, setBranchIds] = useState(user?.branches.map((branch) => branch.id) ?? [])
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (roleIds.length === 0) { toast.error('Select at least one role.', 'Role required'); return }
    if (branchIds.length === 0) { toast.error('Select at least one branch.', 'Branch required'); return }
    setSaving(true)
    try {
      await onSave(user
        ? { displayName, status, organizationId, roleIds, branchIds }
        : { email, displayName, password, organizationId, roleIds, branchIds })
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : 'Unable to save this user.', 'User was not saved')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="grid gap-[18px]" onSubmit={submit}>
      {!user && <label className="grid gap-[7px] text-[13px] font-medium text-[#405653]">Email address<input className="w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-[11px] text-[#203236] outline-none focus:border-[#347077] focus:shadow-[0_0_0_3px_rgba(52,112,119,.12)]" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>}
      <label className="grid gap-[7px] text-[13px] font-medium text-[#405653]">Full name<input className="w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-[11px] text-[#203236] outline-none focus:border-[#347077] focus:shadow-[0_0_0_3px_rgba(52,112,119,.12)]" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={160} required /></label>
      {!user && <PasswordInput label="Temporary password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} maxLength={72} required hint="Use at least 10 characters." />}
      {user && <div className="grid gap-[7px] text-[13px] font-medium text-[#405653]"><span>Account status</span><SearchableSelect ariaLabel="Account status" options={USER_STATUS_OPTIONS} value={status} onChange={setStatus} searchPlaceholder="Search statuses..." /></div>}
      <RoleSelector roles={roles} selected={roleIds} onChange={setRoleIds} />
      <BranchSelector branches={branches} selected={branchIds} onChange={setBranchIds} />
      <div className="flex justify-end gap-2.5 pt-1"><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : user ? 'Save changes' : 'Create user'}</Button></div>
    </form>
  )
}
