import { request } from '../../../shared/api/httpClient'
import type { FinancialPeriod } from '../financial-year.types'

export const financialYearApi = {
  list: (companyId: string) => request<FinancialPeriod[]>(`/companies/${companyId}/financial-year`),
  update: (companyId: string, startMonth: number) => request<FinancialPeriod[]>(`/companies/${companyId}/financial-year`, {
    method: 'PUT',
    body: JSON.stringify({ startMonth }),
  }),
}
