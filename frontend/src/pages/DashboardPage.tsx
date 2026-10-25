import { Card } from '../shared/components/Card'
import { PageContainer } from '../shared/components/PageContainer'

const metrics = [
  { label: 'Assets', value: '$1,284,900', change: 'As of today' },
  { label: 'Liabilities', value: '$492,600', change: 'As of today' },
  { label: 'Current period P&L', value: '$86,240', change: 'October 2026' },
  { label: 'Draft vouchers', value: '12', change: '4 awaiting review' },
]

export function DashboardPage() {
  return (
    <PageContainer
        breadcrumbs={[{ label: 'Dashboard' }]}
        title="Good morning"
      >
      <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <span className="block text-[13px] text-[#6b7b78]">{metric.label}</span>
            <strong className="my-4 block font-display text-[27px] text-[#17343a]">{metric.value}</strong>
            <small className="block text-[#8a9794]">{metric.change}</small>
          </Card>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-[1.3fr_1fr] gap-4 max-sm:grid-cols-1">
        <Card>
          <div className="flex items-center justify-between"><h2 className="m-0 text-[17px]">Ledger health</h2><span className="text-xs text-[#84918f]">October 2026</span></div>
          <div className="grid grid-cols-2 gap-[18px] pt-[25px]">
            <div className="rounded-lg bg-[#f5f7f3] p-4"><span className="block text-xs text-[#71817e]">Total debits</span><strong className="mt-[7px] block text-lg">$2,418,720.00</strong></div>
            <div className="rounded-lg bg-[#f5f7f3] p-4"><span className="block text-xs text-[#71817e]">Total credits</span><strong className="mt-[7px] block text-lg">$2,418,720.00</strong></div>
            <p className="col-span-full mt-[3px] mb-0 text-[13px] text-[#39755e]"><span className="mr-[7px] inline-block size-[7px] rounded-full bg-[#63b991] shadow-[0_0_0_3px_rgba(99,185,145,.15)]" /> General ledger is balanced</p>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between"><h2 className="m-0 text-[17px]">Period controls</h2><span className="text-xs text-[#84918f]">31 days</span></div>
          <ul className="m-0 list-none pt-3.5 pl-0">
            <li className="flex justify-between border-b border-[#edf0ec] py-[13px] text-[13px]"><span className="text-[#71817e]">Posting period</span><strong>Open</strong></li>
            <li className="flex justify-between border-b border-[#edf0ec] py-[13px] text-[13px]"><span className="text-[#71817e]">Unposted drafts</span><strong>12</strong></li>
            <li className="flex justify-between py-[13px] text-[13px]"><span className="text-[#71817e]">Last posting</span><strong>Today, 10:42</strong></li>
          </ul>
        </Card>
      </div>
    </PageContainer>
  )
}
