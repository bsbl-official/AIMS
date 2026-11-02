import { request } from '../../../shared/api/httpClient'
import type { InitialCoa, InitialCoaFormValues } from '../coa.types'

export const initialCoaApi = {
  list: () => request<InitialCoa[]>('/initial-coa'),
  get: (coaId: number) => request<InitialCoa>(`/initial-coa/${encodeURIComponent(coaId)}`),
  create: (values: InitialCoaFormValues) => request<InitialCoa>('/initial-coa', {
    method: 'POST',
    body: JSON.stringify({ ...values, coaId: Number(values.coaId) }),
  }),
  update: (coaId: number, values: InitialCoaFormValues) => request<InitialCoa>(`/initial-coa/${encodeURIComponent(coaId)}`, {
    method: 'PUT',
    body: JSON.stringify({ description: values.description, deviceFlag: values.deviceFlag }),
  }),
}
