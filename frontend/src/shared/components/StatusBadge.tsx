type StatusBadgeProps = {
  label: string
  tone?: 'success' | 'warning' | 'neutral'
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const tones = {
    success: 'bg-[#e7f4ed] text-[#2f7258]',
    warning: 'bg-[#f7eedc] text-[#8b642d]',
    neutral: 'bg-[#edf0ed] text-[#65726f]',
  }
  return <span className={`inline-block rounded-full px-[9px] py-[5px] text-[11px] font-medium ${tones[tone]}`}>{label}</span>
}
