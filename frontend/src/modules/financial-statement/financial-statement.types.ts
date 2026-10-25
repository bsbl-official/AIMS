export type StatementSpecification = {
  specificationCode: string
  specificationDescription: string
  reportType: string | null
  groupSign: string | null
  sign: string | null
  noteId: number | null
  retainEarningFlag: string | null
  reportShort: string | null
  cashFlowFlag: string | null
  receiptPaymentFlag: string | null
  ratioParameter: string | null
  liquidCashFlag: string | null
  savingsFlag: string | null
  debtFlag: string | null
  principalPaidFlag: string | null
  serviceChargePaidFlag: string | null
  currentAssetFlag: string | null
  currentLiabilityFlag: string | null
  splitFigureFlag: string | null
  combineFlag: string | null
  specificationCodeDummy: string | null
  insertedBy: string
  insertedAt: string
  updatedBy: string | null
  updatedAt: string | null
}

export type StatementLayer = {
  layerCode: string
  layerDescription: string
  summaryLabel: string | null
  sign: string | null
  specifications: StatementSpecification[]
}

export type StatementGroup = {
  groupCode: string
  groupDescription: string
  summaryLabel: string | null
  layers: StatementLayer[]
}

export type StatementReport = {
  reportCode: string
  reportDescription: string
  summaryLabel: string | null
  groups: StatementGroup[]
}

export type ReportFormValues = { reportCode: string; reportDescription: string; summaryLabel: string }
export type GroupFormValues = { groupCode: string; groupDescription: string; summaryLabel: string }
export type LayerFormValues = { layerCode: string; layerDescription: string; summaryLabel: string; sign: string }

export type SpecificationFormValues = {
  specificationCode: string
  specificationDescription: string
  reportType: string
  groupSign: string
  sign: string
  noteId: string
  retainEarningFlag: string
  reportShort: string
  cashFlowFlag: string
  receiptPaymentFlag: string
  ratioParameter: string
  liquidCashFlag: string
  savingsFlag: string
  debtFlag: string
  principalPaidFlag: string
  serviceChargePaidFlag: string
  currentAssetFlag: string
  currentLiabilityFlag: string
  splitFigureFlag: string
  combineFlag: string
  specificationCodeDummy: string
}
