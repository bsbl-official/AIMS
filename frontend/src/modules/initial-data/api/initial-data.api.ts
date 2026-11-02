import { request } from '../../../shared/api/httpClient'
import type { AccountHeadOption, InitialDataEntry, InitialDataSummary, SaveInitialData } from '../initial-data.types'

const root = (companyId: string) => `/companies/${companyId}/initial-data`

export const initialDataApi = {
  accountHeads: (companyId: string) => request<AccountHeadOption[]>(`${root(companyId)}/account-heads`),
  entries: (companyId: string) => request<InitialDataSummary[]>(`${root(companyId)}/entries`),
  entry: (companyId: string, entryId: string) => request<InitialDataEntry>(`${root(companyId)}/entries/${entryId}`),
  save: (companyId: string, values: SaveInitialData) => request<InitialDataEntry>(`${root(companyId)}/entries`, {
    method: 'POST',
    body: JSON.stringify(values),
  }),
}
