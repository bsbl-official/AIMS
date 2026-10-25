import { request } from '../../../shared/api/httpClient'
import type { FinanceCode, FinanceCodeFormValues } from '../finance-code.types'

export const financeCodeApi = {
  list: (companyId: string, projectCodeId?: string) => request<FinanceCode[]>(`/companies/${companyId}/finance-codes${projectCodeId ? `?projectCodeId=${encodeURIComponent(projectCodeId)}` : ''}`),
  get: (companyId: string, id: number) => request<FinanceCode>(`/companies/${companyId}/finance-codes/${id}`),
  create: (companyId: string, values: FinanceCodeFormValues) => request<FinanceCode>(`/companies/${companyId}/finance-codes`, { method: 'POST', body: JSON.stringify({ projectCodeId: Number(values.projectCodeId), code: Number(values.code), name: values.name, description: values.description }) }),
  update: (item: FinanceCode, values: FinanceCodeFormValues) => request<FinanceCode>(`/companies/${item.companyId}/finance-codes/${item.id}`, { method: 'PUT', body: JSON.stringify({ projectCodeId: Number(values.projectCodeId), name: values.name, description: values.description, status: values.status, version: item.version }) }),
}
