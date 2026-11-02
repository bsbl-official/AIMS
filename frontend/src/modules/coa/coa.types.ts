import { formatCode } from '../../shared/utils/formatCode'

export type DeviceFlag = 'Y' | 'N'

export const formatInitialCoaId = (coaId: string | number) => formatCode(coaId)

export type InitialCoa = {
  coaId: number
  description: string
  insertedBy: string
  insertedAt: string
  updatedBy: string | null
  updatedAt: string | null
  deviceFlag: DeviceFlag
}

export type InitialCoaFormValues = {
  coaId: string
  description: string
  deviceFlag: DeviceFlag
}
