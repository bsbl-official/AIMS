export type VoucherClass = 'DEBIT' | 'CREDIT' | 'JOURNAL'
export type VoucherType = 'BCR' | 'CCR' | 'BDR' | 'CDR' | 'JJV'
export type DocumentType = 'BANK' | 'CASH' | 'OTHERS'

export type VoucherSetup = {
  id: string
  companyId: string
  branchId: string
  branchCode: string
  branchName: string
  projectCodeId: number
  projectName: string
  financeCodeId: number
  financeName: string
  componentCodeId: number
  componentName: string
  coaId: number
  coaDescription: string
  voucherClass: VoucherClass
  voucherType: VoucherType
  documentType: DocumentType
  description: string
  autoVoucher: boolean
  voucherLastNo: number
  insertedBy: string
  insertedAt: string
  updatedBy: string | null
  updatedAt: string | null
  version: number
}

export type VoucherSetupOptions = {
  branches: Array<{ id: string; code: string; name: string }>
  projects: Array<{ id: number; name: string }>
  finances: Array<{ id: number; projectCodeId: number; name: string }>
  components: Array<{ id: number; projectCodeId: number; financeCodeId: number; name: string }>
  coas: Array<{ id: number; description: string }>
}

export type CreateVoucherSetup = {
  branchId: string; projectCodeId: number; financeCodeId: number; componentCodeId: number; coaId: number
  vouchers: Array<{ voucherClass: VoucherClass; voucherType: VoucherType; documentType: DocumentType; description: string }>
}

export type UpdateVoucherSetup = {
  branchId: string; projectCodeId: number; financeCodeId: number; componentCodeId: number; coaId: number
  voucherClass: VoucherClass; voucherType: VoucherType; documentType: DocumentType; description: string
}

export type UpdateVoucherControl = {
  autoVoucher: boolean
  voucherLastNo: number
  version: number
}
