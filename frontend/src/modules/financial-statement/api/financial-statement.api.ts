import { request } from '../../../shared/api/httpClient'
import type {
  FinancialStatementContext, GroupFormValues, LayerFormValues, ReportFormValues, SpecificationFormValues,
  StatementGroup, StatementLayer, StatementReport, StatementSpecification,
} from '../financial-statement.types'

const root = (companyId: string) => `/companies/${companyId}/financial-statements`

export const financialStatementApi = {
  hierarchy: (companyId: string, coaId?: string) => request<StatementReport[]>(`${root(companyId)}${coaId ? `?coaId=${encodeURIComponent(coaId)}` : ''}`),
  createReport: (companyId: string, values: ReportFormValues, context: FinancialStatementContext) =>
    request<StatementReport>(`${root(companyId)}/reports`, {
      method: 'POST', body: JSON.stringify({ ...values, ...context }),
    }),
  createReports: (companyId: string, values: ReportFormValues[], context: FinancialStatementContext) =>
    request<StatementReport[]>(`${root(companyId)}/reports/batch`, { method: 'POST', body: JSON.stringify(values.map((value) => ({ ...value, ...context }))) }),
  createGroup: (companyId: string, reportCode: string, values: GroupFormValues, context: FinancialStatementContext) =>
    request<StatementGroup>(`${root(companyId)}/groups`, {
      method: 'POST', body: JSON.stringify({ ...values, reportCode, ...context }),
    }),
  createGroups: (companyId: string, reportCode: string, values: GroupFormValues[], context: FinancialStatementContext) =>
    request<StatementGroup[]>(`${root(companyId)}/groups/batch`, { method: 'POST', body: JSON.stringify(values.map((value) => ({ ...value, reportCode, ...context }))) }),
  createLayer: (companyId: string, reportCode: string, groupCode: string, values: LayerFormValues, context: FinancialStatementContext) =>
    request<StatementLayer>(`${root(companyId)}/layers`, {
      method: 'POST', body: JSON.stringify({ ...values, reportCode, groupCode, ...context }),
    }),
  createLayers: (companyId: string, reportCode: string, groupCode: string, values: LayerFormValues[], context: FinancialStatementContext) =>
    request<StatementLayer[]>(`${root(companyId)}/layers/batch`, { method: 'POST', body: JSON.stringify(values.map((value) => ({ ...value, reportCode, groupCode, ...context }))) }),
  createSpecification: (companyId: string, reportCode: string, groupCode: string, layerCode: string, values: SpecificationFormValues, context: FinancialStatementContext) =>
    request<StatementSpecification>(`${root(companyId)}/specifications`, {
      method: 'POST', body: JSON.stringify({ ...values, reportCode, groupCode, layerCode, noteId: values.noteId ? Number(values.noteId) : null, ...context }),
    }),
  createSpecifications: (companyId: string, reportCode: string, groupCode: string, layerCode: string, values: SpecificationFormValues[], context: FinancialStatementContext) =>
    request<StatementSpecification[]>(`${root(companyId)}/specifications/batch`, { method: 'POST', body: JSON.stringify(values.map((value) => ({ ...value, reportCode, groupCode, layerCode, noteId: value.noteId ? Number(value.noteId) : null, ...context }))) }),
  updateReport: (companyId: string, reportCode: string, values: ReportFormValues, context: FinancialStatementContext) =>
    request<StatementReport>(`${root(companyId)}/reports/${encodeURIComponent(reportCode)}`, {
      method: 'PUT', body: JSON.stringify({ reportDescription: values.reportDescription, summaryLabel: values.summaryLabel, ...context }),
    }),
  deleteReport: (companyId: string, coaId: string, reportCode: string) =>
    request<void>(`${root(companyId)}/reports/${encodeURIComponent(reportCode)}?coaId=${encodeURIComponent(coaId)}`, { method: 'DELETE' }),
  updateGroup: (companyId: string, reportCode: string, groupCode: string, values: GroupFormValues, context: FinancialStatementContext) =>
    request<StatementGroup>(`${root(companyId)}/groups/${encodeURIComponent(reportCode)}/${encodeURIComponent(groupCode)}`, {
      method: 'PUT', body: JSON.stringify({ groupDescription: values.groupDescription, summaryLabel: values.summaryLabel, ...context }),
    }),
  deleteGroup: (companyId: string, coaId: string, reportCode: string, groupCode: string) =>
    request<void>(`${root(companyId)}/groups/${encodeURIComponent(reportCode)}/${encodeURIComponent(groupCode)}?coaId=${encodeURIComponent(coaId)}`, { method: 'DELETE' }),
  updateLayer: (companyId: string, reportCode: string, groupCode: string, layerCode: string, values: LayerFormValues, context: FinancialStatementContext) =>
    request<StatementLayer>(`${root(companyId)}/layers/${encodeURIComponent(reportCode)}/${encodeURIComponent(groupCode)}/${encodeURIComponent(layerCode)}`, {
      method: 'PUT', body: JSON.stringify({ layerDescription: values.layerDescription, summaryLabel: values.summaryLabel, sign: values.sign, ...context }),
    }),
  deleteLayer: (companyId: string, coaId: string, reportCode: string, groupCode: string, layerCode: string) =>
    request<void>(`${root(companyId)}/layers/${encodeURIComponent(reportCode)}/${encodeURIComponent(groupCode)}/${encodeURIComponent(layerCode)}?coaId=${encodeURIComponent(coaId)}`, { method: 'DELETE' }),
  updateSpecification: (companyId: string, reportCode: string, groupCode: string, layerCode: string, reportType: string, specificationCode: string, values: SpecificationFormValues, context: FinancialStatementContext) =>
    request<StatementSpecification>(`${root(companyId)}/specifications/${encodeURIComponent(reportCode)}/${encodeURIComponent(groupCode)}/${encodeURIComponent(layerCode)}/${encodeURIComponent(reportType)}/${encodeURIComponent(specificationCode)}`, {
      method: 'PUT', body: JSON.stringify({ ...specificationUpdateBody(values), ...context }),
    }),
  deleteSpecification: (companyId: string, coaId: string, reportCode: string, groupCode: string, layerCode: string, reportType: string, specificationCode: string) =>
    request<void>(`${root(companyId)}/specifications/${encodeURIComponent(reportCode)}/${encodeURIComponent(groupCode)}/${encodeURIComponent(layerCode)}/${encodeURIComponent(reportType)}/${encodeURIComponent(specificationCode)}?coaId=${encodeURIComponent(coaId)}`, { method: 'DELETE' }),
}

function specificationUpdateBody({ specificationCode, reportType, ...values }: SpecificationFormValues) {
  void specificationCode
  void reportType
  return { ...values, noteId: values.noteId ? Number(values.noteId) : null }
}
