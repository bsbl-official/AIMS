import { request } from '../../../shared/api/httpClient'
import type { ChartOfAccount, ChartOfAccountFormValues } from '../coa.types'

export const coaApi = {
  list: () => request<ChartOfAccount[]>('/coa'),
  get: (coaId: number) => request<ChartOfAccount>(`/coa/${encodeURIComponent(coaId)}`),
  create: (values: ChartOfAccountFormValues) => request<ChartOfAccount>('/coa', {
    method: 'POST',
    body: JSON.stringify({ ...values, coaId: Number(values.coaId) }),
  }),
  update: (coaId: number, values: ChartOfAccountFormValues) => request<ChartOfAccount>(`/coa/${encodeURIComponent(coaId)}`, {
    method: 'PUT',
    body: JSON.stringify({ description: values.description, deviceFlag: values.deviceFlag }),
  }),
}
