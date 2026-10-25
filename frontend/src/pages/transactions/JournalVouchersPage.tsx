import { Button } from '../../shared/components/Button'
import { Card } from '../../shared/components/Card'
import { DataTable, type Column } from '../../shared/components/DataTable'
import { PageContainer } from '../../shared/components/PageContainer'
import { StatusBadge } from '../../shared/components/StatusBadge'

type JournalRow = { number: string; date: string; narration: string; debit: string; status: string }

const rows: JournalRow[] = [
  { number: 'JV-2026-0041', date: '24 Oct 2026', narration: 'Month-end accrual', debit: '$12,400.00', status: 'Draft' },
  { number: 'RV-2026-0188', date: '23 Oct 2026', narration: 'Customer receipt', debit: '$8,750.00', status: 'Posted' },
  { number: 'PV-2026-0124', date: '22 Oct 2026', narration: 'Supplier payment', debit: '$4,210.00', status: 'Approved' },
]

const columns: Column<JournalRow>[] = [
  { key: 'number', header: 'Voucher', render: (row) => <span className="font-medium text-[#1f545b]">{row.number}</span> },
  { key: 'date', header: 'Date', render: (row) => row.date },
  { key: 'narration', header: 'Narration', render: (row) => row.narration },
  { key: 'debit', header: 'Amount', align: 'right', render: (row) => row.debit },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge label={row.status} tone={row.status === 'Posted' ? 'success' : row.status === 'Approved' ? 'warning' : 'neutral'} /> },
]

export function JournalVouchersPage() {
  return (
    <PageContainer
        breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Transactions' }, { label: 'Journal vouchers' }]}
        title="Journal vouchers"
        action={<Button>New voucher</Button>}
      >
      <Card><DataTable columns={columns} rows={rows} rowKey={(row) => row.number} /></Card>
    </PageContainer>
  )
}
