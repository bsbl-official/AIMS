import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

type SkeletonProps = {
  width?: CSSProperties['width']
  height?: CSSProperties['height']
  radius?: CSSProperties['borderRadius']
  className?: string
}

export function Skeleton({ width = '100%', height = 16, radius = 6, className = '' }: SkeletonProps) {
  return <span className={`relative block overflow-hidden bg-[#e7eae7] after:absolute after:inset-0 after:-translate-x-full after:animate-[skeleton-shimmer_1.45s_ease-in-out_infinite] after:bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,.72)_50%,transparent_100%)] after:content-[''] motion-reduce:after:animate-none ${className}`.trim()} style={{ width, height, borderRadius: radius }} aria-hidden="true" />
}

type TableSkeletonProps = {
  columns?: number
  rows?: number
}

export function TableSkeleton({ columns = 5, rows = 5 }: TableSkeletonProps) {
  return <div className="min-w-[620px]" style={{ '--skeleton-columns': columns } as CSSProperties} role="status" aria-label="Loading table data" aria-busy="true">
    <div className="grid min-h-[43px] grid-cols-[repeat(var(--skeleton-columns,5),minmax(90px,1fr))] items-center gap-6 border-b border-[#edf0ec] px-3 [&>span]:bg-[#dfe4df]">
      {Array.from({ length: columns }, (_, column) => <Skeleton key={column} width={`${55 + (column % 3) * 12}%`} height={10} />)}
    </div>
    {Array.from({ length: rows }, (_, row) => <div className="grid min-h-[57px] grid-cols-[repeat(var(--skeleton-columns,5),minmax(90px,1fr))] items-center gap-6 border-b border-[#edf0ec] px-3 last:border-b-0" key={row}>
      {Array.from({ length: columns }, (_, column) => <Skeleton key={column} width={`${64 + ((row + column) % 3) * 12}%`} height={14} />)}
    </div>)}
    <span className="sr-only">Loading data</span>
  </div>
}

type CardGridSkeletonProps = {
  cards?: number
}

export function CardGridSkeleton({ cards = 4 }: CardGridSkeletonProps) {
  return <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1" role="status" aria-label="Loading summary" aria-busy="true">
    {Array.from({ length: cards }, (_, index) => <div className="grid min-h-[132px] content-center gap-4 rounded-xl border border-[#e1e5df] bg-white p-[22px] shadow-[0_7px_24px_rgba(29,48,44,.04)]" key={index}>
      <Skeleton width="45%" height={12} />
      <Skeleton width="68%" height={28} />
      <Skeleton width="38%" height={10} />
    </div>)}
    <span className="sr-only">Loading summary</span>
  </div>
}

type SkeletonBoundaryProps = {
  loading: boolean
  fallback: ReactNode
  children: ReactNode
  minimumDurationMs?: number
}

export function SkeletonBoundary({
  loading,
  fallback,
  children,
  minimumDurationMs = 500,
}: SkeletonBoundaryProps) {
  const [minimumVisible, setMinimumVisible] = useState(loading)
  const startedAt = useRef<number | null>(loading ? performance.now() : null)

  useEffect(() => {
    if (loading) {
      startedAt.current ??= performance.now()
      setMinimumVisible(true)
      return
    }

    if (startedAt.current === null) {
      setMinimumVisible(false)
      return
    }

    const elapsed = performance.now() - startedAt.current
    const remaining = Math.max(0, minimumDurationMs - elapsed)
    const timeout = window.setTimeout(() => {
      startedAt.current = null
      setMinimumVisible(false)
    }, remaining)

    return () => window.clearTimeout(timeout)
  }, [loading, minimumDurationMs])

  return loading || minimumVisible ? fallback : children
}
