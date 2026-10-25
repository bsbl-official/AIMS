export type FinanceCodeStatus = 'ACTIVE' | 'INACTIVE'
export type FinanceCode = {
  id: number; companyId: string; projectCodeId: number; projectCode: number; projectName: string
  code: number; name: string; description: string | null; status: FinanceCodeStatus
  createdAt: string; updatedAt: string; version: number
}
export type FinanceCodeFormValues = { projectCodeId: string; code: string; name: string; description: string; status: FinanceCodeStatus }
