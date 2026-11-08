import femaleAvatar from '../../assets/avatar-female.svg'
import maleAvatar from '../../assets/avatar-male.svg'
import neutralAvatar from '../../assets/avatar-neutral.svg'
import {profileApi} from '../../modules/profile/profile.api'
import type {Gender} from '../../modules/profile/profile.types'

export function UserAvatar({gender='PREFER_NOT_TO_SAY',photoAvailable=false,photoVersion=0,className='size-10'}:{gender?:Gender;photoAvailable?:boolean;photoVersion?:number;className?:string}){
  const fallback=gender==='MALE'?maleAvatar:gender==='FEMALE'?femaleAvatar:neutralAvatar
  return <img className={`${className} shrink-0 rounded-full border border-[#d5b66d] bg-white object-cover shadow-[0_4px_12px_rgba(49,79,70,.2)]`} src={photoAvailable?profileApi.photoUrl(photoVersion):fallback} alt="User profile"/>
}
