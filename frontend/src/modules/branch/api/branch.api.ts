import { request } from '../../../shared/api/httpClient'
import type { Branch, BranchFormValues } from '../branch.types'

export const branchApi = {
  branches: (companyId: string) => request<Branch[]>(`/companies/${companyId}/branches`),
  createBranch: (input: BranchFormValues) =>
    request<Branch>(`/companies/${input.companyId}/branches`, {
      method: 'POST',
      body: JSON.stringify({ ...input, companyId: undefined, status: undefined }),
    }),
  updateBranch: (branch: Branch, input: BranchFormValues) =>
    request<Branch>(`/companies/${branch.companyId}/branches/${branch.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...input, companyId: undefined, code: undefined, version: branch.version }),
    }),
}
