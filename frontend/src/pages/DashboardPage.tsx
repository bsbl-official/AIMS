import { Activity, ArrowDownRight, ArrowUpRight, BookOpenCheck, CircleDollarSign, FileText, RefreshCw, Scale, WalletCards } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../modules/dashboard/api/dashboard.api'
import { VoucherMixChart, VoucherTrendChart } from '../modules/dashboard/components/DashboardCharts'
import type { DashboardMetric, DashboardReport, VoucherView } from '../modules/dashboard/dashboard.types'
import { useAuth } from '../modules/auth/hooks/useAuth'
import { useOrganizationContext } from '../modules/organization-context/useOrganizationContext'
import { ApiError } from '../shared/api/httpClient'
import { CalendarPicker } from '../shared/components/CalendarPicker'
import { Card } from '../shared/components/Card'
import { PageContainer } from '../shared/components/PageContainer'
import { CardGridSkeleton, Skeleton } from '../shared/components/Skeleton'

type DateRange = { from: string; to: string }

export function DashboardPage() {
  const { user, can } = useAuth()
  const { companyId, branchId, loading: contextLoading } = useOrganizationContext()
  const [liveReport, setReport] = useState<DashboardReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [draftRange, setDraftRange] = useState<DateRange>(() => defaultDashboardRange())
  const [appliedRange, setAppliedRange] = useState<DateRange | undefined>()
  const [reloadToken, setReloadToken] = useState(0)
  const [view, setView] = useState<VoucherView>('total')
  const canView = can('journal.read')

  useEffect(() => {
    setReport(null)
    setError('')
    setDraftRange(defaultDashboardRange())
    setAppliedRange(undefined)
    setView('total')
  }, [branchId, companyId])

  const load = useCallback(async () => {
    if (!companyId || !branchId || !canView) return
    setLoading(true)
    setError('')
    try {
      const next = await dashboardApi.report(companyId, branchId, appliedRange)
      setReport(next)
      setDraftRange({ from: next.scope.from, to: next.scope.to })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'The dashboard could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [appliedRange, branchId, canView, companyId])

  useEffect(() => { void load() }, [load, reloadToken])

  const applyRange = () => {
    if (!draftRange.from || !draftRange.to) return setError('Choose both a from date and a to date.')
    if (draftRange.from > draftRange.to) return setError('From date must not be after to date.')
    setAppliedRange({ ...draftRange })
  }

  const emptyReport = useMemo(() => createEmptyDashboardReport(appliedRange ?? defaultDashboardRange()), [appliedRange])
  const report = liveReport ?? (canView && !contextLoading && (!companyId || !branchId) ? emptyReport : null)
  const currency = liveReport?.scope.currencyCode
  const money = useMemo(() => new Intl.NumberFormat(undefined, currency ? {
    style: 'currency', currency, maximumFractionDigits: 2,
  } : { maximumFractionDigits: 2 }), [currency])
  const compactMoney = useMemo(() => new Intl.NumberFormat(undefined, currency ? {
    style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1,
  } : { notation: 'compact', maximumFractionDigits: 1 }), [currency])
  const moneyValue = useCallback((value: number) => money.format(value), [money])

  return <PageContainer breadcrumbs={[{ label: 'Dashboard' }]} title={user?.displayName ? `Welcome, ${user.displayName}` : 'Welcome'} className="overflow-hidden">
    <div className="mb-5 flex justify-end">
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
        <div className="w-full sm:w-[164px]"><span className="mb-1 block text-[10px] font-bold tracking-[.08em] text-[#55706a] uppercase">From</span><CalendarPicker value={draftRange.from} onChange={from => setDraftRange(current => ({ ...current, from }))} ariaLabel="Dashboard from date" /></div>
        <div className="w-full sm:w-[164px]"><span className="mb-1 block text-[10px] font-bold tracking-[.08em] text-[#55706a] uppercase">To</span><CalendarPicker value={draftRange.to} onChange={to => setDraftRange(current => ({ ...current, to }))} ariaLabel="Dashboard to date" /></div>
        <button type="button" onClick={applyRange} disabled={loading} className="min-h-[43px] cursor-pointer rounded-lg border-0 bg-[#235e60] px-5 text-sm font-bold text-white shadow-[0_7px_18px_rgba(35,94,96,.2)] transition hover:bg-[#194f52] disabled:cursor-not-allowed disabled:opacity-50">Apply</button>
        <button type="button" onClick={() => setReloadToken(token => token + 1)} disabled={loading || !branchId} className="grid size-[43px] shrink-0 cursor-pointer place-items-center rounded-lg border border-[#c7d8d1] bg-white text-[#37635e] transition hover:bg-[#edf5f2] disabled:opacity-50" aria-label="Refresh dashboard"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>
    </div>

    {!canView && <Card><EmptyMessage title="Dashboard access is restricted" detail="Journal read permission is required for financial reporting." /></Card>}
    {error && <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{error}</span><button type="button" className="cursor-pointer border-0 bg-transparent font-bold text-red-800 underline" onClick={() => setReloadToken(token => token + 1)}>Try again</button></div>}
    {(contextLoading || loading) && !report && <DashboardLoading />}

    {report && <AnimatePresence mode="wait"><motion.div key={`${report.scope.branchId}-${report.scope.from}-${report.scope.to}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .28 }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#6d7f7b]">
        <span>{dateLabel(report.scope.from, report.scope.to)}</span>
        <span>Compared with {dateLabel(report.scope.comparisonFrom, report.scope.comparisonTo)}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Voucher value" metric={report.kpis.voucherValue} value={compactMoney.format(report.kpis.voucherValue.current)} icon={<WalletCards />} color="blue" />
        <MetricCard label="Voucher count" metric={report.kpis.voucherCount} value={integer.format(report.kpis.voucherCount.current)} icon={<FileText />} color="pink" />
        <MetricCard label="Posted journal value" metric={report.kpis.postedJournalValue} value={compactMoney.format(report.kpis.postedJournalValue.current)} icon={<BookOpenCheck />} color="green" />
        <MetricCard label="Net profit / loss" metric={report.kpis.netProfit} value={compactMoney.format(report.kpis.netProfit.current)} icon={<CircleDollarSign />} color="gold" />
      </div>

      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,.75fr)]">
        <Card className="relative min-w-0 overflow-hidden !rounded-2xl !border-[#b9d9de] !bg-[linear-gradient(135deg,rgba(237,249,250,.96),rgba(226,243,239,.9)_50%,rgba(235,241,255,.92))] !p-0 !shadow-[0_18px_45px_rgba(35,92,94,.13)]">
          <PanelReflection tone="blue" />
          <div className="relative z-[1] flex flex-col gap-3 border-b border-[#bcd9d8]/70 px-5 pt-5 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div><span className="text-[11px] font-bold tracking-[.08em] text-[#6b7d78] uppercase">Activity</span><h2 className="m-0 mt-1 text-xl text-[#183f43]">Voucher movement</h2></div>
            <div className="flex rounded-xl border border-white/70 bg-white/45 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,.8)] backdrop-blur-md" aria-label="Voucher chart view">{(['total', 'debit', 'credit', 'journal'] as VoucherView[]).map(option => <button key={option} type="button" onClick={() => setView(option)} className={`cursor-pointer rounded-lg border-0 px-3 py-2 text-xs font-bold capitalize transition ${view === option ? 'bg-white/90 text-[#214f51] shadow-[0_4px_12px_rgba(38,88,88,.12)]' : 'bg-transparent text-[#71827e] hover:text-[#214f51]'}`}>{option === 'total' ? 'All' : option}</button>)}</div>
          </div>
          <div className="relative z-[1] px-3 pt-2 pb-1 sm:px-5"><VoucherTrendChart data={report.voucherTrend} view={view} money={moneyValue} /></div>
          <div className="relative z-[1] flex flex-wrap gap-x-5 gap-y-2 border-t border-[#c7dddd]/70 bg-white/20 px-5 py-3 text-xs text-[#61736f]"><Legend color="#2f7cf6" label="Debit"/><Legend color="#24b36b" label="Credit"/><Legend color="#ef4f98" label="Journal"/><span className="ml-auto">{report.transactionLineCount} transaction lines</span></div>
        </Card>

        <Card className="relative overflow-hidden !rounded-2xl !border-[#4a7d79] !bg-[linear-gradient(150deg,#123b43,#1e5d60_58%,#56745e)] !p-5 text-white !shadow-[0_18px_44px_rgba(16,57,59,.24)]">
          <PanelReflection tone="dark" />
          <div className="relative z-[1]"><div className="flex items-start justify-between"><div><span className="text-[11px] font-bold tracking-[.08em] text-white/60 uppercase">As of {shortDate(report.scope.to)}</span><h2 className="m-0 mt-1 text-xl text-white">Financial position</h2></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${report.financialPosition.balanced ? 'bg-emerald-300/20 text-emerald-100' : 'bg-red-300/20 text-red-100'}`}>{report.financialPosition.balanced ? 'Balanced' : 'Review ledger'}</span></div>
            <div className="mt-7"><strong className="block text-4xl tracking-[-.04em]">{compactMoney.format(report.financialPosition.netProfit)}</strong><span className="mt-1 block text-xs text-white/60">Net profit / loss for selected range</span></div>
            <PositionRow label="Assets" value={report.financialPosition.assets} max={positionMax(report)} color="#70e3b1" money={moneyValue}/>
            <PositionRow label="Liabilities" value={report.financialPosition.liabilities} max={positionMax(report)} color="#78adff" money={moneyValue}/>
            <PositionRow label="Income" value={report.financialPosition.income} max={positionMax(report)} color="#f2ce77" money={moneyValue}/>
            <PositionRow label="Expenses" value={report.financialPosition.expenses} max={positionMax(report)} color="#ff8cb8" money={moneyValue}/>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/15 pt-4 text-xs"><div><span className="text-white/55">Posted debits</span><b className="mt-1 block text-sm">{compactMoney.format(report.financialPosition.postedDebits)}</b></div><div><span className="text-white/55">Posted credits</span><b className="mt-1 block text-sm">{compactMoney.format(report.financialPosition.postedCredits)}</b></div></div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2 2xl:grid-cols-[.9fr_1fr_1.2fr]">
        <Card className="relative min-w-0 overflow-hidden !rounded-2xl !border-[#b8d8e3] !bg-[linear-gradient(145deg,rgba(239,249,255,.96),rgba(224,242,244,.91),rgba(234,238,255,.88))] !shadow-[0_14px_36px_rgba(49,98,114,.12)]">
          <PanelReflection tone="blue" />
          <div className="relative z-[1]"><div className="flex items-center justify-between"><div><span className="text-[11px] font-bold tracking-[.08em] text-[#72827e] uppercase">Composition</span><h2 className="m-0 mt-1 text-lg text-[#1d4447]">Voucher mix</h2></div><Activity className="size-5 text-[#397c83]"/></div>
            <VoucherMixChart data={report.voucherMix} money={moneyValue}/></div>
        </Card>
        <Card className="relative overflow-hidden !rounded-2xl !border-[#c5dfbd] !bg-[linear-gradient(145deg,rgba(244,252,239,.96),rgba(232,246,231,.9),rgba(255,247,218,.82))] !shadow-[0_14px_36px_rgba(64,103,67,.11)]">
          <PanelReflection tone="green" />
          <div className="relative z-[1]"><div className="flex items-center justify-between"><div><span className="text-[11px] font-bold tracking-[.08em] text-[#72827e] uppercase">Journal control</span><h2 className="m-0 mt-1 text-lg text-[#1d4447]">Workflow health</h2></div><Scale className="size-5 text-[#4b8060]"/></div>
            <WorkflowBars report={report}/></div>
        </Card>
        <Card className="relative overflow-hidden !rounded-2xl !border-[#e2c7d8] !bg-[linear-gradient(145deg,rgba(255,246,250,.96),rgba(244,235,250,.9),rgba(255,244,224,.82))] !shadow-[0_14px_36px_rgba(109,67,99,.11)] lg:col-span-2 2xl:col-span-1">
          <PanelReflection tone="rose" />
          <div className="relative z-[1]"><div className="flex items-center justify-between"><div><span className="text-[11px] font-bold tracking-[.08em] text-[#72827e] uppercase">Latest entries</span><h2 className="m-0 mt-1 text-lg text-[#1d4447]">Recent vouchers</h2></div><Link to="/transactions/vouchers" className="text-xs font-bold text-[#2f6d68] no-underline hover:underline">View all</Link></div>
            <RecentVouchers report={report} money={moneyValue}/></div>
        </Card>
      </div>
    </motion.div></AnimatePresence>}
  </PageContainer>
}

function MetricCard({ label, metric, value, icon, color }: { label: string; metric: DashboardMetric; value: string; icon: ReactNode; color: 'blue' | 'pink' | 'green' | 'gold' }) {
  const reduceMotion = useReducedMotion()
  const palette = {
    blue: { card: 'border-[#abd8ee] bg-[linear-gradient(125deg,#f4fbff,#e7f5fd)]', icon: 'bg-[#ccecff] text-[#1675ad]' },
    pink: { card: 'border-[#efc2d5] bg-[linear-gradient(125deg,#fff7fa,#ffeaf2)]', icon: 'bg-[#ffd9e8] text-[#c63770]' },
    green: { card: 'border-[#afe0c6] bg-[linear-gradient(125deg,#f4fcf7,#e2f6e9)]', icon: 'bg-[#d0f3df] text-[#238258]' },
    gold: { card: 'border-[#e8d18c] bg-[linear-gradient(125deg,#fffaf0,#fff0c9)]', icon: 'bg-[#f9e6ad] text-[#966c1f]' },
  }[color]
  const change = metric.changePercent
  return <motion.section initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`group relative min-h-[170px] overflow-hidden rounded-2xl border p-5 shadow-[0_10px_24px_rgba(31,66,63,.09),inset_0_1px_0_rgba(255,255,255,.9)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(31,66,63,.14)] ${palette.card}`}>
    <MetricArtwork color={color} icon={icon} />
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[45%] bg-gradient-to-b from-white/65 to-transparent" aria-hidden />
    <div className="relative z-[2] max-w-[68%]"><span className="text-[11px] font-bold tracking-[.055em] text-[#5f7470] uppercase">{label}</span>
      <strong className="mt-3 block text-[33px] leading-none tracking-[-.04em] text-[#173e42]">{value}</strong>
      <div className="mt-5 flex items-center gap-2 text-xs">{change === null ? <span className="text-[#71847f]">No prior activity</span> : <><span className={`flex items-center gap-0.5 font-bold ${change >= 0 ? 'text-[#24805b]' : 'text-[#bd4564]'}`}>{change >= 0 ? <ArrowUpRight className="size-3.5"/> : <ArrowDownRight className="size-3.5"/>}{Math.abs(change).toFixed(1)}%</span><span className="text-[#71847f]">vs previous period</span></>}</div>
    </div>
  </motion.section>
}

function MetricArtwork({ color, icon }: { color: 'blue' | 'pink' | 'green' | 'gold'; icon: ReactNode }) {
  const colors = {
    blue: { line: 'border-[#69acd0]/45', tile: 'bg-[#bfe7fa]/90 text-[#146d9e]', glow: 'bg-[#79c8ed]/30' },
    pink: { line: 'border-[#df82aa]/40', tile: 'bg-[#ffc9de]/90 text-[#b72f68]', glow: 'bg-[#f18db7]/30' },
    green: { line: 'border-[#69b78c]/40', tile: 'bg-[#bcebd0]/90 text-[#20744e]', glow: 'bg-[#70c897]/28' },
    gold: { line: 'border-[#c99e3f]/40', tile: 'bg-[#f7dda0]/90 text-[#8b6216]', glow: 'bg-[#e6bd5d]/30' },
  }[color]
  return <div className="pointer-events-none absolute inset-y-0 right-0 w-[46%] overflow-hidden" aria-hidden>
    <span className={`absolute -top-8 -right-10 size-36 rounded-full blur-2xl ${colors.glow}`} />
    {color === 'blue' ? <>
      <span className={`absolute top-7 right-0 h-[88px] w-[126px] rotate-6 rounded-2xl border-2 bg-white/20 ${colors.line}`} />
      <span className={`absolute top-11 right-5 h-[82px] w-[122px] -rotate-3 rounded-2xl border-2 bg-white/30 shadow-[inset_0_0_0_7px_rgba(255,255,255,.12)] ${colors.line}`} />
      <span className={`absolute top-[58px] right-[105px] size-5 rounded-full border-2 ${colors.line}`} />
      <span className={`absolute top-[105px] right-[19px] size-4 rounded-full border-2 ${colors.line}`} />
      <span className={`absolute top-[122px] right-[72px] h-8 w-16 rounded-[50%] border-t-2 border-r-2 ${colors.line}`} />
    </> : color === 'green' ? <>
      <span className={`absolute top-7 right-[66px] h-[108px] w-[70px] -skew-y-6 rounded-l-2xl rounded-r-md border-2 bg-white/24 ${colors.line}`} />
      <span className={`absolute top-7 right-0 h-[108px] w-[70px] skew-y-6 rounded-r-2xl rounded-l-md border-2 bg-white/28 ${colors.line}`} />
      <span className={`absolute top-[39px] right-[68px] h-[91px] border-l-2 ${colors.line}`} />
      {[52, 70, 110].map(top => <span key={`left-${top}`} className={`absolute right-[82px] h-px w-38 ${colors.tile.split(' ')[0]}`} style={{ top }} />)}
      {[52, 92, 110].map(top => <span key={`right-${top}`} className={`absolute right-[13px] h-px w-38 ${colors.tile.split(' ')[0]}`} style={{ top }} />)}
      <span className={`absolute top-[68px] right-[18px] h-3 w-7 border-b-2 border-l-2 rotate-[-42deg] ${colors.line}`} />
    </> : color === 'pink' ? <>
      <span className={`absolute top-8 right-3 h-24 w-20 rotate-8 rounded-xl border-2 bg-white/20 ${colors.line}`} />
      <span className={`absolute top-12 right-8 h-24 w-20 -rotate-6 rounded-xl border-2 bg-white/25 ${colors.line}`} />
      <span className={`absolute top-[70px] right-[52px] h-px w-10 ${colors.tile.split(' ')[0]}`} />
      <span className={`absolute top-[84px] right-[52px] h-px w-8 ${colors.tile.split(' ')[0]}`} />
    </> : color === 'gold' ? <>
      {[0, 30, 60, 90, 120, 150].map(angle => <span key={angle} className={`absolute top-[82px] right-[58px] h-px w-24 origin-right border-t ${colors.line}`} style={{ transform: `rotate(${angle}deg)` }} />)}
      <span className={`absolute top-[38px] right-[18px] size-24 rounded-full border-2 ${colors.line}`} />
      <span className={`absolute top-[51px] right-[31px] size-[70px] rounded-full border ${colors.line}`} />
    </> : null}
    <span className={`absolute top-[61px] right-[35px] grid size-11 place-items-center rounded-xl shadow-[0_8px_18px_rgba(40,75,72,.12)] transition-transform duration-300 group-hover:scale-110 ${colors.tile} [&>svg]:size-6`}>{icon}</span>
  </div>
}

function PanelReflection({ tone }: { tone: 'blue' | 'green' | 'rose' | 'dark' }) {
  const glow = { blue: 'bg-[#75d7e5]/25', green: 'bg-[#b6dc70]/24', rose: 'bg-[#e89ac1]/24', dark: 'bg-[#84d6c7]/20' }[tone]
  return <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
    <span className="absolute -top-[38%] left-[7%] h-[72%] w-[78%] rotate-[-8deg] rounded-[50%] bg-white/35 blur-2xl" />
    <span className={`absolute -right-16 -bottom-20 size-64 rounded-full blur-3xl ${glow}`} />
    <span className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent" />
  </div>
}

function WorkflowBars({ report }: { report: DashboardReport }) {
  const rows = [
    ['Draft', report.workflow.draft, '#2f7cf6'], ['Submitted', report.workflow.submitted, '#e9a52b'],
    ['Approved', report.workflow.approved, '#8b6ee8'], ['Posted', report.workflow.posted, '#24b36b'],
    ['Rejected / voided', report.workflow.rejected + report.workflow.voided, '#ef6688'],
  ] as const
  const max = Math.max(1, ...rows.map(([, value]) => value))
  return <div className="mt-5 space-y-3.5">{rows.map(([label, value, color]) => <div key={label}><div className="mb-1.5 flex justify-between text-xs"><span className="text-[#61736f]">{label}</span><b className="text-[#264b4c]">{value}</b></div><div className="h-2 overflow-hidden rounded-full border border-white/65 bg-white/45 shadow-inner"><motion.div initial={{ width: 0 }} animate={{ width: `${value / max * 100}%` }} className="h-full rounded-full shadow-[0_0_12px_currentColor]" style={{ background: `linear-gradient(90deg, ${color}, ${color}b8)` }}/></div></div>)}<div className="mt-4 rounded-xl border border-white/70 bg-white/40 px-3 py-2.5 text-xs text-[#54706a] shadow-[inset_0_1px_0_rgba(255,255,255,.8)] backdrop-blur"><b className="text-[#234f50]">{report.workflow.unpostedVouchers}</b> unposted transaction voucher{report.workflow.unpostedVouchers === 1 ? '' : 's'}</div></div>
}

function RecentVouchers({ report, money }: { report: DashboardReport; money: (value: number) => string }) {
  if (!report.recentVouchers.length) return <div className="grid min-h-52 place-items-center text-center"><EmptyMessage title="No vouchers in this period" detail="New debit, credit, and journal vouchers will appear here." /></div>
  const colors: Record<string, string> = { DEBIT: 'bg-blue-100 text-blue-700', CREDIT: 'bg-emerald-100 text-emerald-700', JOURNAL: 'bg-pink-100 text-pink-700' }
  return <div className="mt-4 divide-y divide-[#e6eeeb]">{report.recentVouchers.map(voucher => <div key={`${voucher.voucherClass}-${voucher.id}`} className="flex items-center gap-3 py-3 first:pt-0"><span className={`grid size-9 shrink-0 place-items-center rounded-xl text-[10px] font-black ${colors[voucher.voucherClass]}`}>{voucher.voucherClass[0]}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><b className="truncate text-sm text-[#23494b]">{voucher.voucherNumber}</b><b className="shrink-0 text-xs text-[#315b58]">{money(voucher.amount)}</b></div><div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-[#7a8985]"><span className="truncate">{voucher.particulars}</span><span className="shrink-0">{shortDate(voucher.voucherDate)}</span></div></div></div>)}</div>
}

function PositionRow({ label, value, max, color, money }: { label: string; value: number; max: number; color: string; money: (value: number) => string }) {
  return <div className="mt-5"><div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="text-white/65">{label}</span><b>{money(value)}</b></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.abs(value) / max * 100}%` }} transition={{ duration: .65 }} className="h-full rounded-full" style={{ backgroundColor: color }}/></div></div>
}

function DashboardLoading() {
  return <><CardGridSkeleton/><div className="mt-4 grid gap-4 xl:grid-cols-[1.75fr_.75fr]"><Card><Skeleton className="h-[360px]"/></Card><Card><Skeleton className="h-[360px]"/></Card></div></>
}

function Legend({ color, label }: { color: string; label: string }) { return <span className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ backgroundColor: color }}/>{label}</span> }
function EmptyMessage({ title, detail }: { title: string; detail: string }) { return <div className="py-5 text-center"><strong className="block text-[#315856]">{title}</strong><span className="mt-1 block text-xs text-[#7d8c89]">{detail}</span></div> }

const integer = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })
function shortDate(value: string) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`)) }
function dateLabel(from: string, to: string) { return `${shortDate(from)} – ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${to}T00:00:00`))}` }
function positionMax(report: DashboardReport) { const p = report.financialPosition; return Math.max(1, Math.abs(p.assets), Math.abs(p.liabilities), Math.abs(p.income), Math.abs(p.expenses)) }

function defaultDashboardRange(): DateRange {
  const today = new Date()
  return { from: localDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: localDate(today) }
}

function createEmptyDashboardReport(range: DateRange): DashboardReport {
  const from = parseLocalDate(range.from)
  const to = parseLocalDate(range.to)
  const dayCount = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1
  const comparisonTo = addDays(from, -1)
  const comparisonFrom = addDays(comparisonTo, -(dayCount - 1))
  const zeroMetric: DashboardMetric = { current: 0, previous: 0, changePercent: null }
  const voucherTrend: DashboardReport['voucherTrend'] = []

  for (let date = from; date <= to; date = addDays(date, 1)) {
    voucherTrend.push({ date: localDate(date), debit: 0, credit: 0, journal: 0, total: 0, count: 0 })
  }

  return {
    scope: {
      companyId: '', companyName: '', branchId: '', branchName: '', currencyCode: '',
      from: range.from, to: range.to,
      comparisonFrom: localDate(comparisonFrom), comparisonTo: localDate(comparisonTo),
    },
    kpis: {
      voucherValue: { ...zeroMetric }, voucherCount: { ...zeroMetric },
      postedJournalValue: { ...zeroMetric }, netProfit: { ...zeroMetric },
    },
    voucherTrend,
    voucherMix: [
      { voucherClass: 'DEBIT', count: 0, amount: 0 },
      { voucherClass: 'CREDIT', count: 0, amount: 0 },
      { voucherClass: 'JOURNAL', count: 0, amount: 0 },
    ],
    financialPosition: {
      assets: 0, liabilities: 0, income: 0, expenses: 0, netProfit: 0,
      postedDebits: 0, postedCredits: 0, balanced: true,
    },
    workflow: { draft: 0, submitted: 0, approved: 0, posted: 0, rejected: 0, voided: 0, unpostedVouchers: 0 },
    transactionLineCount: 0,
    recentVouchers: [],
  }
}

function parseLocalDate(value: string) {
  const [year = 0, month = 1, day = 1] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDays(value: Date, days: number) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + days)
}

function localDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
