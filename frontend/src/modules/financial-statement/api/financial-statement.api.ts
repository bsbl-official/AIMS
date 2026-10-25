import { request } from '../../../shared/api/httpClient'
import type {
  GroupFormValues, LayerFormValues, ReportFormValues, SpecificationFormValues,
  StatementGroup, StatementLayer, StatementReport, StatementSpecification,
} from '../financial-statement.types'

const root = (companyId: string) => `/companies/${companyId}/financial-statements`

export const financialStatementApi = {
  hierarchy: (companyId: string) => request<StatementReport[]>(root(companyId)),
  createReport: (companyId: string, values: ReportFormValues) =>
    request<StatementReport>(`${root(companyId)}/reports`, {
      method: 'POST', body: JSON.stringify(values),
    }),
  createGroup: (companyId: string, reportCode: string, values: GroupFormValues) =>
    request<StatementGroup>(`${root(companyId)}/groups`, {
      method: 'POST', body: JSON.stringify({ ...values, reportCode }),
    }),
  createLayer: (companyId: string, reportCode: string, groupCode: string, values: LayerFormValues) =>
    request<StatementLayer>(`${root(companyId)}/layers`, {
      method: 'POST', body: JSON.stringify({ ...values, reportCode, groupCode }),
    }),
  createSpecification: (companyId: string, reportCode: string, groupCode: string, layerCode: string, values: SpecificationFormValues) =>
    request<StatementSpecification>(`${root(companyId)}/specifications`, {
      method: 'POST', body: JSON.stringify({ ...values, reportCode, groupCode, layerCode, noteId: values.noteId ? Number(values.noteId) : null }),
    }),
  updateReport: (companyId: string, reportCode: string, values: ReportFormValues) =>
    request<StatementReport>(`${root(companyId)}/reports/${encodeURIComponent(reportCode)}`, {
      method: 'PUT', body: JSON.stringify({ reportDescription: values.reportDescription, summaryLabel: values.summaryLabel }),
    }),
  deleteReport: (companyId: string, reportCode: string) =>
    request<void>(`${root(companyId)}/reports/${encodeURIComponent(reportCode)}`, { method: 'DELETE' }),
  updateGroup: (companyId: string, reportCode: string, groupCode: string, values: GroupFormValues) =>
    request<StatementGroup>(`${root(companyId)}/groups/${encodeURIComponent(reportCode)}/${encodeURIComponent(groupCode)}`, {
      method: 'PUT', body: JSON.stringify({ groupDescription: values.groupDescription, summaryLabel: values.summaryLabel }),
    }),
  deleteGroup: (companyId: string, reportCode: string, groupCode: string) =>
    request<void>(`${root(companyId)}/groups/${encodeURIComponent(reportCode)}/${encodeURIComponent(groupCode)}`, { method: 'DELETE' }),
  updateLayer: (companyId: string, reportCode: string, groupCode: string, layerCode: string, values: LayerFormValues) =>
    request<StatementLayer>(`${root(companyId)}/layers/${encodeURIComponent(reportCode)}/${encodeURIComponent(groupCode)}/${encodeURIComponent(layerCode)}`, {
      method: 'PUT', body: JSON.stringify({ layerDescription: values.layerDescription, summaryLabel: values.summaryLabel, sign: values.sign }),
    }),
  deleteLayer: (companyId: string, reportCode: string, groupCode: string, layerCode: string) =>
    request<void>(`${root(companyId)}/layers/${encodeURIComponent(reportCode)}/${encodeURIComponent(groupCode)}/${encodeURIComponent(layerCode)}`, { method: 'DELETE' }),
  updateSpecification: (companyId: string, reportCode: string, groupCode: string, layerCode: string, reportType: string, specificationCode: string, values: SpecificationFormValues) =>
    request<StatementSpecification>(`${root(companyId)}/specifications/${encodeURIComponent(reportCode)}/${encodeURIComponent(groupCode)}/${encodeURIComponent(layerCode)}/${encodeURIComponent(reportType)}/${encodeURIComponent(specificationCode)}`, {
      method: 'PUT', body: JSON.stringify(specificationUpdateBody(values)),
    }),
  deleteSpecification: (companyId: string, reportCode: string, groupCode: string, layerCode: string, reportType: string, specificationCode: string) =>
    request<void>(`${root(companyId)}/specifications/${encodeURIComponent(reportCode)}/${encodeURIComponent(groupCode)}/${encodeURIComponent(layerCode)}/${encodeURIComponent(reportType)}/${encodeURIComponent(specificationCode)}`, { method: 'DELETE' }),
}

function specificationUpdateBody({ specificationCode, reportType, ...values }: SpecificationFormValues) {
  void specificationCode
  void reportType
  return { ...values, noteId: values.noteId ? Number(values.noteId) : null }
}
