export type DeviceFlag = 'Y' | 'N'

export type ChartOfAccount = {
  coaId: number
  description: string
  insertedBy: string
  insertedAt: string
  updatedBy: string | null
  updatedAt: string | null
  deviceFlag: DeviceFlag
}

export type ChartOfAccountFormValues = {
  coaId: string
  description: string
  deviceFlag: DeviceFlag
}
