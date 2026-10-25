import { request } from '../../../shared/api/httpClient'
import type { ComponentCode, ComponentCodeFormValues } from '../component-code.types'

export const componentCodeApi = {
  list: (companyId: string, projectCodeId?: string, financeCodeId?: string) => {
    const query = new URLSearchParams()
    if (projectCodeId) query.set('projectCodeId', projectCodeId)
    if (financeCodeId) query.set('financeCodeId', financeCodeId)
    return request<ComponentCode[]>(`/companies/${companyId}/component-codes${query.size ? `?${query}` : ''}`)
  },
  get: (companyId: string, id: number) => request<ComponentCode>(`/companies/${companyId}/component-codes/${id}`),
  create: (companyId: string, values: ComponentCodeFormValues) => request<ComponentCode>(`/companies/${companyId}/component-codes`, { method: 'POST', body: JSON.stringify({ projectCodeId: Number(values.projectCodeId), financeCodeId: Number(values.financeCodeId), code: Number(values.code), name: values.name, description: values.description }) }),
  update: (item: ComponentCode, values: ComponentCodeFormValues) => request<ComponentCode>(`/companies/${item.companyId}/component-codes/${item.id}`, { method: 'PUT', body: JSON.stringify({ projectCodeId: Number(values.projectCodeId), financeCodeId: Number(values.financeCodeId), name: values.name, description: values.description, status: values.status, version: item.version }) }),
}
