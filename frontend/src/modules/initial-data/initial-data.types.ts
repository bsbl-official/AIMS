export type AccountHeadOption = {
  coaId: number
  l1Code: string
  l2Code: string
  l3Code: string
  l4Code: string
  l5Code: string
  accountHead: string
}

export type InitialBalanceLine = AccountHeadOption & {
  debit: number
  credit: number
  balance: number
}

export type InitialDataSummary = {
  entryId: string
  branchId: string
  branchCode: string
  branchName: string
  projectCodeId: number
  projectName: string
  financeCodeId: number
  financeName: string
  componentCodeId: number
  componentName: string
  monthYear: string
  financialYearStart: string
  lineCount: number
  debitTotal: number
  creditTotal: number
  balanceTotal: number
  updatedAt: string
}

export type InitialDataEntry = Omit<InitialDataSummary, 'lineCount' | 'debitTotal' | 'creditTotal' | 'balanceTotal'> & {
  companyId: string
  lines: InitialBalanceLine[]
  createdAt: string
}

export type SaveInitialData = {
  branchId: string
  projectCodeId: number
  financeCodeId: number
  componentCodeId: number
  monthYear: string
  lines: Array<Pick<InitialBalanceLine, 'coaId' | 'l1Code' | 'l2Code' | 'l3Code' | 'l4Code' | 'l5Code' | 'debit' | 'credit'>>
}

export const accountHeadKey = (head: AccountHeadOption) =>
  [head.coaId, head.l1Code, head.l2Code, head.l3Code, head.l4Code, head.l5Code].join('/')

export const accountHeadCode = (head: AccountHeadOption) =>
  [head.l1Code, head.l2Code, head.l3Code, head.l4Code, head.l5Code].join(' · ')
