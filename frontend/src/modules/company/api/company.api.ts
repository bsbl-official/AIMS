import { request } from '../../../shared/api/httpClient'
import type { Company, CompanyFormValues } from '../company.types'

export const companyApi = {
  companies: () => request<Company[]>('/companies'),
  createCompany: (input: CompanyFormValues) =>
    request<Company>('/companies', { method: 'POST', body: JSON.stringify({ ...input, status: undefined }) }),
  updateCompany: (company: Company, input: CompanyFormValues) => {
    return request<Company>(`/companies/${company.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...input, code: undefined, version: company.version }),
    })
  },
  deleteCompany: (companyId: string) => request<void>(`/companies/${companyId}`, { method: 'DELETE' }),
}
