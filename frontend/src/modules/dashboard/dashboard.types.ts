export type DashboardMetric = {
  current: number
  previous: number
  changePercent: number | null
}

export type DashboardReport = {
  scope: {
    companyId: string
    companyName: string
    branchId: string
    branchName: string
    currencyCode: string
    from: string
    to: string
    comparisonFrom: string
    comparisonTo: string
  }
  kpis: {
    voucherValue: DashboardMetric
    voucherCount: DashboardMetric
    postedJournalValue: DashboardMetric
    netProfit: DashboardMetric
  }
  voucherTrend: {
    date: string
    debit: number
    credit: number
    journal: number
    total: number
    count: number
  }[]
  voucherMix: {
    voucherClass: 'DEBIT' | 'CREDIT' | 'JOURNAL'
    count: number
    amount: number
  }[]
  financialPosition: {
    assets: number
    liabilities: number
    income: number
    expenses: number
    netProfit: number
    postedDebits: number
    postedCredits: number
    balanced: boolean
  }
  workflow: {
    draft: number
    submitted: number
    approved: number
    posted: number
    rejected: number
    voided: number
    unpostedVouchers: number
  }
  transactionLineCount: number
  recentVouchers: {
    id: string
    voucherClass: 'DEBIT' | 'CREDIT' | 'JOURNAL'
    voucherNumber: string
    voucherDate: string
    particulars: string
    amount: number
    status: string
  }[]
}

export type VoucherView = 'total' | 'debit' | 'credit' | 'journal'
