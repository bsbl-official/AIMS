import type { Branch } from '../../branch/branch.types'

type BranchSelectorProps = {
  branches: Branch[]
  selected: string[]
  onChange: (branchIds: string[]) => void
}

export function BranchSelector({ branches, selected, onChange }: BranchSelectorProps) {
  const toggle = (branchId: string) => {
    onChange(selected.includes(branchId)
      ? selected.filter((id) => id !== branchId)
      : [...selected, branchId])
  }

  return <fieldset className="grid gap-2 border-0 p-0">
    <legend className="mb-[7px] text-[13px] font-medium text-[#405653]">Branch access</legend>
    <div className="grid max-h-44 gap-2 overflow-y-auto rounded-lg border border-[#dbe2de] bg-[#f9fbfa] p-3">
      {branches.map((branch) => <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-[#314744]" key={branch.id}>
        <input className="size-4 accent-[#347077]" type="checkbox" checked={selected.includes(branch.id)} onChange={() => toggle(branch.id)} />
        <span><strong>{branch.name}</strong> <span className="text-[#7c8b88]">({branch.code})</span></span>
      </label>)}
      {branches.length === 0 && <span className="text-[13px] text-[#7c8b88]">Create an active branch before assigning this user.</span>}
    </div>
  </fieldset>
}
