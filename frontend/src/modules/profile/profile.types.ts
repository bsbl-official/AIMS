import type { OrganizationAccess } from '../auth/auth.types'

export type Gender='MALE'|'FEMALE'|'PREFER_NOT_TO_SAY'
export type Profile={
  id:string;email:string;displayName:string;status:string;dateOfBirth:string|null;gender:Gender
  phone:string|null;address:string|null;profilePhotoAvailable:boolean;profilePhotoVersion:number
  accessScope:'GLOBAL'|'ASSIGNED';organizations:OrganizationAccess[];version:number
}
export type ProfileUpdate={displayName:string;dateOfBirth:string|null;gender:Gender;phone:string;address:string;removePhoto:boolean;version:number}
