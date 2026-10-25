type BrandProps = {
  compact?: boolean
  tone?: 'light' | 'dark'
}

export function Brand({ compact = false, tone = 'light' }: BrandProps) {
  return <div className="flex items-center gap-3">
    <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#d7b66d] font-display text-[22px] text-[#17343a]">A</span>
    <span>
      <strong className={`block ${tone === 'light' ? 'text-[#eef3ed]' : 'text-[#183137]'}`}>Account BM</strong>
      {!compact && <small className="mt-0.5 block text-[11px] tracking-[.08em] text-[#95aaa8] uppercase">General ledger</small>}
    </span>
  </div>
}
