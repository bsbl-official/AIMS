export type ComponentCodeStatus = 'ACTIVE' | 'INACTIVE'
export type ComponentCode = {
  id: number; companyId: string; projectCodeId: number; projectCode: number; projectName: string
  financeCodeId: number; financeCode: number; financeName: string
  code: number; name: string; description: string | null; status: ComponentCodeStatus
  createdAt: string; updatedAt: string; version: number
}
export type ComponentCodeFormValues = { projectCodeId: string; financeCodeId: string; code: string; name: string; description: string; status: ComponentCodeStatus }
