import { request } from '../../../shared/api/httpClient'
import type { DashboardReport } from '../dashboard.types'

export const dashboardApi = {
  report(companyId: string, branchId: string, range?: { from: string; to: string }) {
    const query = new URLSearchParams({ branchId })
    if (range) {
      query.set('from', range.from)
      query.set('to', range.to)
    }
    return request<DashboardReport>(`/v1/companies/${companyId}/dashboard?${query}`)
  },
}
