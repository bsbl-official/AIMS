type SetupOptionProps = {
  title: string
  description: string
}

export function SetupOption({ title, description }: SetupOptionProps) {
  return <div className="rounded-lg border border-[#e0e5e0] bg-[#f8faf7] p-5">
    <h2 className="m-0 text-base font-medium text-[#203236]">{title}</h2>
    <p className="mt-2 mb-0 text-sm leading-6 text-[#70807d]">{description}</p>
  </div>
}
