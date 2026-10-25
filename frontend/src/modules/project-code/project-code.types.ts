export type ProjectCodeStatus = 'ACTIVE' | 'INACTIVE'
export type ProjectCode = {
  id: number; companyId: string; code: number; name: string; description: string | null
  status: ProjectCodeStatus; createdAt: string; updatedAt: string; version: number
}
export type ProjectCodeFormValues = { code: string; name: string; description: string; status: ProjectCodeStatus }
