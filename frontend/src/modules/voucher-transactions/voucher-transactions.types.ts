export type VoucherClass = 'debit' | 'credit' | 'journal'
export type VoucherSide = 'D' | 'C'

export type VoucherLineInput = {
  side: VoucherSide; l1Code:string; l2Code:string; l3Code:string; l4Code:string; l5Code:string
  particulars:string; amount:number; bankCode:string; bankBranchCode:string; chequeNumber:string; chequeDate:string|null
}
export type VoucherSetupOption = {
  id:string; branchId:string; branchCode:string; branchName:string; projectCodeId:number; projectName:string
  financeCodeId:number; financeName:string; componentCodeId:number; componentName:string; coaId:number; coaDescription:string
  voucherType:string; documentType:string; description:string; autoVoucher:boolean
}
export type AccountHeadOption = { coaId:number; l1Code:string; l2Code:string; l3Code:string; l4Code:string; l5Code:string; name:string }
export type VoucherOptions = { voucherSetups:VoucherSetupOption[]; accountHeads:AccountHeadOption[] }
export type VoucherNumberPreview = { voucherNumber:string }
export type VoucherSummary = { id:string; voucherNumber:string; voucherDate:string; voucherType:string; documentType:string; particulars:string; amount:number; status:string; version:number }
export type CombinedVoucherSummary = VoucherSummary & { voucherClass:VoucherClass }
export type VoucherLine = VoucherLineInput & { id:string; lineNumber:number; accountHead:string }
export type Voucher = {
  id:string; companyId:string; voucherSetupId:string; branchId:string; branchCode:string; branchName:string
  projectCodeId:number; projectName:string; financeCodeId:number; financeName:string; componentCodeId:number; componentName:string
  coaId:number; coaDescription:string; voucherNumber:string; voucherDate:string; voucherClass:string; voucherType:string; documentType:string
  particulars:string; partyCode:string|null; paidTo:string|null; chequeNumber:string|null; chequeDate:string|null
  bankCode:string|null; bankBranchCode:string|null; referenceBillNumber:string|null; referenceBillDate:string|null
  status:string; totalDebit:number; totalCredit:number; lines:VoucherLine[]
  photo:{name:string;contentType:string;size:number}|null; version:number
}
export type VoucherCreate = {
  voucherSetupId:string; voucherDate:string; voucherNumber:string|null; particulars:string; partyCode:string|null; paidTo:string|null
  chequeNumber:string|null; chequeDate:string|null; bankCode:string|null; bankBranchCode:string|null
  referenceBillNumber:string|null; referenceBillDate:string|null; lines:VoucherLineInput[]
}
export type VoucherUpdate = Omit<VoucherCreate,'voucherSetupId'|'voucherDate'|'voucherNumber'> & { version:number }
export type VoucherFullUpdate = VoucherCreate & { voucherClass:VoucherClass; removePhoto:boolean; version:number }
