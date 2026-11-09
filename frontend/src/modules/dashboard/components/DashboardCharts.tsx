import { AxisBottom, AxisLeft } from '@visx/axis'
import { GridRows } from '@visx/grid'
import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale'
import { BarStack, Pie } from '@visx/shape'
import { TooltipWithBounds, useTooltip } from '@visx/tooltip'
import { motion, useReducedMotion } from 'framer-motion'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { DashboardReport, VoucherView } from '../dashboard.types'

const COLORS = { debit: '#2f7cf6', credit: '#24b36b', journal: '#ef4f98' } as const
type TrendDatum = DashboardReport['voucherTrend'][number]
type TrendKey = keyof typeof COLORS

export function VoucherTrendChart({ data, view, money }: { data: TrendDatum[]; view: VoucherView; money: (value: number) => string }) {
  return <div className="relative h-[300px] min-w-0">
    <ParentSize debounceTime={80}>{({ width, height }) =>
      <TrendSvg width={width} height={height} data={data} view={view} money={money} />
    }</ParentSize>
  </div>
}

function TrendSvg({ width, height, data, view, money }: { width: number; height: number; data: TrendDatum[]; view: VoucherView; money: (value: number) => string }) {
  const reduceMotion = useReducedMotion()
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } = useTooltip<TrendDatum>()
  if (width < 20 || height < 20) return null
  const margin = { top: 18, right: 14, bottom: 42, left: width < 520 ? 50 : 66 }
  const innerWidth = Math.max(0, width - margin.left - margin.right)
  const innerHeight = Math.max(0, height - margin.top - margin.bottom)
  const keys: TrendKey[] = view === 'total' ? ['debit', 'credit', 'journal'] : [view]
  const value = (datum: TrendDatum) => keys.reduce((sum, key) => sum + datum[key], 0)
  const maximum = Math.max(1, ...data.map(value))
  const x = scaleBand<string>({ domain: data.map(item => item.date), range: [0, innerWidth], padding: .34 })
  const y = scaleLinear<number>({ domain: [0, maximum * 1.12], range: [innerHeight, 0], nice: true })
  const color = scaleOrdinal<TrendKey, string>({ domain: ['debit', 'credit', 'journal'], range: [COLORS.debit, COLORS.credit, COLORS.journal] })
  const tickStep = Math.max(1, Math.ceil(data.length / (width < 520 ? 4 : 7)))
  const ticks = data.filter((_, index) => index % tickStep === 0).map(item => item.date)
  const pointer = (event: ReactPointerEvent<SVGRectElement>, datum: TrendDatum) => {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!bounds) return
    showTooltip({ tooltipData: datum, tooltipLeft: event.clientX - bounds.left, tooltipTop: event.clientY - bounds.top })
  }
  const noActivity = data.every(item => item.total === 0)

  return <div className="relative size-full">
    <svg width={width} height={height} role="img" aria-label="Voucher value by date and voucher class">
      <defs>
        <linearGradient id="dashboard-debit-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#65b8ff"/><stop offset=".48" stopColor="#2f7cf6"/><stop offset="1" stopColor="#2458c8"/></linearGradient>
        <linearGradient id="dashboard-credit-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#69e2a6"/><stop offset=".5" stopColor="#24b36b"/><stop offset="1" stopColor="#16824b"/></linearGradient>
        <linearGradient id="dashboard-journal-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff91c0"/><stop offset=".5" stopColor="#ef4f98"/><stop offset="1" stopColor="#b93272"/></linearGradient>
        <filter id="dashboard-bar-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <Group left={margin.left} top={margin.top}>
        <GridRows scale={y} width={innerWidth} height={innerHeight} stroke="#9fc8c7" strokeOpacity={.42} strokeDasharray="4 7" />
        <BarStack<TrendDatum, TrendKey> data={data} keys={keys} x={datum => datum.date} xScale={x} yScale={y} color={color}>
          {barStacks => barStacks.map(stack => stack.bars.map(bar => {
            const datum = data[bar.index]
            if (!datum) return null
            return <motion.rect key={`${stack.key}-${bar.index}`} x={bar.x} width={bar.width}
              rx={Math.min(7, bar.width / 3)} fill={`url(#dashboard-${stack.key}-bar)`} filter={bar.height > 6 ? 'url(#dashboard-bar-glow)' : undefined}
              initial={reduceMotion ? false : { y: innerHeight, height: 0, opacity: 0 }}
              animate={{ y: bar.y, height: bar.height, opacity: 1 }} transition={{ duration: .55, delay: reduceMotion ? 0 : bar.index * .018 }}
              onPointerMove={event => pointer(event, datum)} onPointerLeave={hideTooltip}>
              <title>{`${displayDate(datum.date)}: ${money(value(datum))}`}</title>
            </motion.rect>
          }))}
        </BarStack>
        <AxisLeft scale={y} numTicks={5} hideAxisLine hideTicks tickFormat={amount => compactNumber(Number(amount))}
          tickLabelProps={() => ({ fill: '#70817d', fontSize: 11, textAnchor: 'end', dx: -8, dy: 3 })} />
        <AxisBottom top={innerHeight} scale={x} tickValues={ticks} hideAxisLine hideTicks
          tickFormat={date => shortDate(String(date))}
          tickLabelProps={() => ({ fill: '#70817d', fontSize: 11, textAnchor: 'middle', dy: 10 })} />
      </Group>
    </svg>
    {noActivity && <div className="pointer-events-none absolute inset-0 grid place-items-center pt-4 text-center"><div><strong className="block text-sm text-[#47625d]">No voucher activity yet</strong><span className="mt-1 block text-xs text-[#7d8d89]">New vouchers for this branch will appear here.</span></div></div>}
    {tooltipOpen && tooltipData && <TooltipWithBounds left={tooltipLeft} top={tooltipTop}
      className="!rounded-xl !border !border-[#c9ddd5] !bg-white/95 !px-3 !py-2 !font-sans !shadow-[0_12px_35px_rgba(18,55,52,.2)] !backdrop-blur-md">
      <strong className="block text-xs text-[#24494a]">{displayDate(tooltipData.date)}</strong>
      <div className="mt-1.5 grid gap-1 text-[11px] text-[#5c706b]">
        {keys.map(key => <span key={key} className="flex min-w-36 justify-between gap-4"><span className="capitalize">{key}</span><b style={{ color: COLORS[key] }}>{money(tooltipData[key])}</b></span>)}
        <span className="mt-1 border-t border-[#e1ebe7] pt-1">{tooltipData.count} voucher{tooltipData.count === 1 ? '' : 's'}</span>
      </div>
    </TooltipWithBounds>}
  </div>
}

export function VoucherMixChart({ data, money }: { data: DashboardReport['voucherMix']; money: (value: number) => string }) {
  return <div className="h-[210px] min-w-0"><ParentSize>{({ width, height }) =>
    <MixSvg width={width} height={height} data={data} money={money} />
  }</ParentSize></div>
}

function MixSvg({ width, height, data, money }: { width: number; height: number; data: DashboardReport['voucherMix']; money: (value: number) => string }) {
  const reduceMotion = useReducedMotion()
  const total = data.reduce((sum, item) => sum + item.amount, 0)
  const radius = Math.max(0, Math.min(width * .25, height * .42))
  const centerX = Math.min(width * .32, radius + 16)
  const centerY = height / 2
  const colors: Record<string, string> = { DEBIT: COLORS.debit, CREDIT: COLORS.credit, JOURNAL: COLORS.journal }
  if (!width || !height) return null
  return <svg width={width} height={height} role="img" aria-label="Voucher mix by class">
    <defs>
      <linearGradient id="dashboard-mix-debit" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#75c7ff"/><stop offset="1" stopColor="#2466dd"/></linearGradient>
      <linearGradient id="dashboard-mix-credit" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#7de0af"/><stop offset="1" stopColor="#15915a"/></linearGradient>
      <linearGradient id="dashboard-mix-journal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ff9bc5"/><stop offset="1" stopColor="#cf367e"/></linearGradient>
      <radialGradient id="dashboard-mix-center"><stop stopColor="#ffffff" stopOpacity=".92"/><stop offset="1" stopColor="#dff1f1" stopOpacity=".72"/></radialGradient>
      <filter id="dashboard-mix-glow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#2d777b" floodOpacity=".2"/></filter>
    </defs>
    <Group top={centerY} left={centerX}>
      <circle r={radius} fill="none" stroke="#cddfdf" strokeOpacity={.72} strokeWidth={Math.max(16, radius * .28)} />
      {total > 0 && <Pie data={data} pieValue={item => item.amount} outerRadius={radius} innerRadius={radius * .68} padAngle={.035}>
        {pie => pie.arcs.map((arc, index) => <motion.path key={arc.data.voucherClass} d={pie.path(arc) ?? undefined}
          fill={`url(#dashboard-mix-${arc.data.voucherClass.toLowerCase()})`} filter="url(#dashboard-mix-glow)" initial={reduceMotion ? false : { opacity: 0, scale: .82 }}
          animate={{ opacity: 1, scale: 1 }} transition={{ duration: .45, delay: index * .08 }}>
          <title>{`${arc.data.voucherClass}: ${money(arc.data.amount)}`}</title>
        </motion.path>)}
      </Pie>}
      <circle r={radius * .6} fill="url(#dashboard-mix-center)" />
      <text textAnchor="middle" y={-3} fill="#193f42" fontSize={16} fontWeight={700}>{compactNumber(total)}</text>
      <text textAnchor="middle" y={15} fill="#7b8b87" fontSize={10}>total value</text>
    </Group>
    <Group left={Math.min(width * .61, centerX + radius + 24)} top={Math.max(25, centerY - 58)}>
      {data.map((item, index) => <g key={item.voucherClass} transform={`translate(0 ${index * 43})`}>
        <circle cx={5} cy={5} r={5} fill={colors[item.voucherClass]} />
        <text x={18} y={4} fill="#58706a" fontSize={10}>{item.voucherClass}</text>
        <text x={18} y={21} fill="#1d4447" fontSize={13} fontWeight={700}>{item.count} · {compactNumber(item.amount)}</text>
      </g>)}
    </Group>
  </svg>
}

function compactNumber(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}
