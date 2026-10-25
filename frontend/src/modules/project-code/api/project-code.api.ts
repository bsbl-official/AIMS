import { request } from '../../../shared/api/httpClient'
import type { ProjectCode, ProjectCodeFormValues } from '../project-code.types'

export const projectCodeApi = {
  list: (companyId: string) => request<ProjectCode[]>(`/companies/${companyId}/project-codes`),
  get: (companyId: string, id: number) => request<ProjectCode>(`/companies/${companyId}/project-codes/${id}`),
  create: (companyId: string, values: ProjectCodeFormValues) => request<ProjectCode>(`/companies/${companyId}/project-codes`, { method: 'POST', body: JSON.stringify({ code: Number(values.code), name: values.name, description: values.description }) }),
  update: (item: ProjectCode, values: ProjectCodeFormValues) => request<ProjectCode>(`/companies/${item.companyId}/project-codes/${item.id}`, { method: 'PUT', body: JSON.stringify({ name: values.name, description: values.description, status: values.status, version: item.version }) }),
}
