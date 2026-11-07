import { useContext, useEffect } from 'react';import { OrganizationContext } from './OrganizationContext'
export function useOrganizationContext(){const value=useContext(OrganizationContext);if(!value)throw new Error('useOrganizationContext must be used inside OrganizationProvider');return value}
export function useOrganizationDirty(dirty:boolean){const {setDirty}=useOrganizationContext();useEffect(()=>{setDirty(dirty);return()=>setDirty(false)},[dirty,setDirty])}
