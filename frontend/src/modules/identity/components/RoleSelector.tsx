import type { RoleSummary } from '../identity.types'

type RoleSelectorProps = {
  roles: RoleSummary[]
  selected: string[]
  onChange: (roleIds: string[]) => void
}

export function RoleSelector({ roles, selected, onChange }: RoleSelectorProps) {
  const toggle = (roleId: string) => onChange(selected.includes(roleId)
    ? selected.filter((id) => id !== roleId)
    : [...selected, roleId])

  return (
    <fieldset className="grid min-w-0 gap-2 rounded-[9px] border border-[#e0e5e0] p-3">
      <legend className="px-1.5 text-[13px] font-medium text-[#405653]">Roles</legend>
      {roles.map((role) => (
        <label className="flex cursor-pointer items-start gap-[9px] rounded-[7px] p-2 hover:bg-[#f6f8f5]" key={role.id}>
          <input className="mt-[3px] accent-[#1d4a50]" type="checkbox" checked={selected.includes(role.id)} onChange={() => toggle(role.id)} />
          <span><strong className="block text-[13px] text-[#294541]">{role.name}</strong><small className="mt-0.5 block font-normal text-[#7c8b88]">{role.code}</small></span>
        </label>
      ))}
      {roles.length === 0 && <p className="m-1 text-[13px] text-[#7b8986]">Create a role before adding users.</p>}
    </fieldset>
  )
}
