import {apiUrl,request} from '../../shared/api/httpClient'
import type {Profile,ProfileUpdate} from './profile.types'

export const profileApi={
  get:()=>request<Profile>('/profile'),
  update:(values:ProfileUpdate,photo?:File|null)=>{const body=new FormData();body.append('profile',new Blob([JSON.stringify(values)],{type:'application/json'}));if(photo)body.append('photo',photo);return request<Profile>('/profile',{method:'PATCH',body})},
  photoUrl:(version:number)=>apiUrl(`/profile/photo?v=${version}`),
  changePassword:(currentPassword:string,newPassword:string)=>request<void>('/profile/password',{method:'POST',body:JSON.stringify({currentPassword,newPassword})}),
}
