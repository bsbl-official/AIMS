import { request } from '../../../shared/api/httpClient'
import type { CreateVoucherSetup, UpdateVoucherControl, UpdateVoucherSetup, VoucherSetup, VoucherSetupOptions } from '../voucher-setup.types'

const root = (companyId: string) => `/companies/${companyId}/voucher-setups`

export const voucherSetupApi = {
  list: (companyId: string) => request<VoucherSetup[]>(root(companyId)),
  options: (companyId: string) => request<VoucherSetupOptions>(`${root(companyId)}/options`),
  create: (companyId: string, values: CreateVoucherSetup) => request<VoucherSetup[]>(root(companyId), { method: 'POST', body: JSON.stringify(values) }),
  update: (item: VoucherSetup, values: UpdateVoucherSetup) =>
    request<VoucherSetup>(`${root(item.companyId)}/${item.id}`, { method: 'PUT', body: JSON.stringify({ ...values, version: item.version }) }),
  updateControl: (item: VoucherSetup, values: UpdateVoucherControl) =>
    request<VoucherSetup>(`${root(item.companyId)}/${item.id}/control`, { method: 'PUT', body: JSON.stringify(values) }),
  remove: (item: VoucherSetup) => request<void>(`${root(item.companyId)}/${item.id}`, { method: 'DELETE' }),
}
