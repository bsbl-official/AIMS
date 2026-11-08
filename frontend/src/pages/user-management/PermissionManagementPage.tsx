import {Pencil,Plus,Search,ShieldCheck} from 'lucide-react'
import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react'
import {identityApi} from '../../modules/identity/identity.api'
import type {Capability,CreatePermissionInput,Permission,UpdatePermissionInput} from '../../modules/identity/identity.types'
import {useAuth} from '../../modules/auth/hooks/useAuth'
import {useToast} from '../../modules/toast/hooks/useToast'
import {ApiError} from '../../shared/api/httpClient'
import {Button} from '../../shared/components/Button'
import {Card} from '../../shared/components/Card'
import {DataTable,type Column} from '../../shared/components/DataTable'
import {Modal} from '../../shared/components/Modal'
import {PageContainer} from '../../shared/components/PageContainer'
import {SearchableSelect} from '../../shared/components/SearchableSelect'
import {SkeletonBoundary,TableSkeleton} from '../../shared/components/Skeleton'
import {StatusBadge} from '../../shared/components/StatusBadge'
import {TableActionButton} from '../../shared/components/TableActionButton'
import {ModalActions} from '../../shared/components/Modal'
import {useOrganizationContext,useOrganizationDirty} from '../../modules/organization-context/useOrganizationContext'

const message=(reason:unknown)=>reason instanceof ApiError?reason.message:'Unable to complete the request.'
const inputClass='w-full rounded-lg border border-[#ccd5d0] bg-white px-3 py-[11px] text-[#203236] outline-none focus:border-[#347077] focus:shadow-[0_0_0_3px_rgba(52,112,119,.12)] disabled:cursor-not-allowed disabled:bg-[#f3f5f3]'

export function PermissionManagementPage(){
  const {can}=useAuth(),toast=useToast(),canView=can('permissions.read')||can('permissions.manage'),canManage=can('permissions.manage')
  const {companyId:organizationId}=useOrganizationContext()
  const [items,setItems]=useState<Permission[]>([]),[capabilities,setCapabilities]=useState<Capability[]>([])
  const [query,setQuery]=useState(''),[status,setStatus]=useState('ALL'),[kind,setKind]=useState('ALL')
  const [editing,setEditing]=useState<Permission|null|undefined>(undefined),[loading,setLoading]=useState(true)
  const load=useCallback(async(id:string)=>{if(!id){setLoading(false);return}setLoading(true);try{const [nextItems,nextCapabilities]=await Promise.all([identityApi.permissions(id),identityApi.capabilities(id)]);setItems(nextItems);setCapabilities(nextCapabilities)}catch(reason){toast.error(message(reason),'Permissions unavailable')}finally{setLoading(false)}},[toast])
  useEffect(()=>{if(!canView){setLoading(false);return}void load(organizationId)},[canView,load,organizationId])
  useOrganizationDirty(editing!==undefined)
  const visible=useMemo(()=>{const term=query.trim().toLowerCase();return items.filter(item=>(status==='ALL'||item.status===status)&&(kind==='ALL'||(kind==='SYSTEM')===item.systemPermission)&&(!term||[item.code,item.name,item.description,...item.capabilityCodes].some(value=>value.toLowerCase().includes(term))))},[items,kind,query,status])
  const columns=useMemo<Column<Permission>[]>(()=>[
    {key:'permission',header:'Permission',render:item=><div><strong className="block text-[#203236]">{item.name}</strong><small className="mt-0.5 block font-mono text-[11px] text-[#6f807c]">{item.code}</small></div>},
    {key:'description',header:'Description',render:item=><span className="line-clamp-2">{item.description}</span>},
    {key:'capabilities',header:'Capabilities',render:item=><span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-[#39746e]"/>{item.capabilityCodes.length} mapped</span>},
    {key:'type',header:'Type',render:item=><StatusBadge label={item.systemPermission?'System':'Custom'} tone={item.systemPermission?'warning':'neutral'}/>},
    {key:'status',header:'Status',render:item=><StatusBadge label={item.status} tone={item.status==='ACTIVE'?'success':'neutral'}/>},
    ...(canManage?[{key:'action',header:'Edit',headerGroup:'Action',align:'center' as const,render:(item:Permission)=>item.systemPermission?null:<TableActionButton label={`Edit ${item.name}`} onClick={()=>setEditing(item)}><Pencil className="size-4"/></TableActionButton>}]:[]),
  ],[canManage])
  const save=async(input:CreatePermissionInput|UpdatePermissionInput)=>{const updating=Boolean(editing);if(editing)await identityApi.updatePermission(organizationId,editing.id,input as UpdatePermissionInput);else await identityApi.createPermission(input as CreatePermissionInput);setEditing(undefined);toast.success(updating?'Permission updated.':'Permission created.',updating?'Updated':'Created');await load(organizationId)}
  const crumbs=[{label:'Dashboard',to:'/'},{label:'User Management'},{label:'Permissions'}]
  if(!canView)return <PageContainer title="Access denied" breadcrumbs={crumbs}><Card>You do not have access to permission management.</Card></PageContainer>
  return <PageContainer title="Permissions" breadcrumbs={crumbs} action={canManage?<Button onClick={()=>setEditing(null)}><span className="inline-flex items-center gap-2"><Plus className="size-4"/>Add Permission</span></Button>:undefined}>
    <div className="mb-4 grid gap-3 rounded-xl border border-[#d6e2dd] bg-white/75 p-4 lg:grid-cols-[minmax(240px,1fr)_180px_180px]">
      <label className="relative"><span className="sr-only">Search permissions</span><Search className="absolute top-3.5 left-3 size-4 text-[#73837f]"/><input className={`${inputClass} pl-9`} placeholder="Search permissions or capabilities..." value={query} onChange={event=>setQuery(event.target.value)}/></label>
      <SearchableSelect ariaLabel="Permission status" value={status} onChange={setStatus} options={[{value:'ALL',label:'All statuses'},{value:'ACTIVE',label:'Active'},{value:'INACTIVE',label:'Inactive'}]}/>
      <SearchableSelect ariaLabel="Permission type" value={kind} onChange={setKind} options={[{value:'ALL',label:'All types'},{value:'SYSTEM',label:'System'},{value:'CUSTOM',label:'Custom'}]}/>
    </div>
    <Card className="overflow-x-auto"><SkeletonBoundary loading={loading} fallback={<TableSkeleton columns={6} rows={7}/>} minimumDurationMs={350}><DataTable columns={columns} rows={visible} rowKey={item=>item.id} emptyMessage="No permissions match the selected filters."/></SkeletonBoundary></Card>
    <Modal open={editing!==undefined} title={editing?'Edit Permission':'Create Permission'} description="Map this permission to real application capabilities." size="large" onClose={()=>setEditing(undefined)}>{organizationId&&<PermissionForm organizationId={organizationId} permission={editing??undefined} capabilities={capabilities} onSave={save} onCancel={()=>setEditing(undefined)}/>}</Modal>
  </PageContainer>
}

function PermissionForm({organizationId,permission,capabilities,onSave,onCancel}:{organizationId:string;permission?:Permission;capabilities:Capability[];onSave:(input:CreatePermissionInput|UpdatePermissionInput)=>Promise<void>;onCancel:()=>void}){
  const toast=useToast(),[name,setName]=useState(permission?.name??''),[code,setCode]=useState(permission?.code??''),[description,setDescription]=useState(permission?.description??''),[status,setStatus]=useState<'ACTIVE'|'INACTIVE'>(permission?.status??'ACTIVE'),[selected,setSelected]=useState<string[]>(permission?.capabilityCodes??[]),[saving,setSaving]=useState(false)
  const groups=useMemo(()=>capabilities.reduce<Record<string,Capability[]>>((all,item)=>{(all[item.module]??=[]).push(item);return all},{}),[capabilities])
  const toggle=(value:string)=>setSelected(current=>current.includes(value)?current.filter(item=>item!==value):[...current,value])
  const submit=async(event:FormEvent)=>{event.preventDefault();if(!selected.length){toast.error('Select at least one capability.','Capability required');return}setSaving(true);try{await onSave(permission?{name,description,status,capabilityCodes:selected,version:permission.version}:{organizationId,code:code.trim().toLowerCase(),name,description,capabilityCodes:selected})}catch(reason){toast.error(message(reason),'Permission was not saved')}finally{setSaving(false)}}
  return <form className="grid gap-4" onSubmit={submit}>
    <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1"><label className="grid gap-1.5 text-[13px] font-medium text-[#405653]">Permission name<input className={inputClass} maxLength={120} required value={name} onChange={event=>setName(event.target.value)}/></label><label className="grid gap-1.5 text-[13px] font-medium text-[#405653]">Permission code<input className={inputClass} pattern="[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+" title="Use lowercase module.action format" maxLength={100} disabled={Boolean(permission)} required value={code} onChange={event=>setCode(event.target.value.toLowerCase().replace(/\s+/g,'_'))}/></label></div>
    <label className="grid gap-1.5 text-[13px] font-medium text-[#405653]">Description<textarea className={`${inputClass} min-h-20 resize-y`} maxLength={255} required value={description} onChange={event=>setDescription(event.target.value)}/></label>
    {permission&&<div className="max-w-56"><SearchableSelect ariaLabel="Permission status" value={status} onChange={value=>setStatus(value as 'ACTIVE'|'INACTIVE')} options={[{value:'ACTIVE',label:'Active'},{value:'INACTIVE',label:'Inactive'}]}/></div>}
    <fieldset className="max-h-[360px] overflow-y-auto rounded-xl border border-[#d7e2de] p-3"><legend className="px-2 text-sm font-semibold text-[#294b4e]">Application capabilities</legend><div className="grid gap-4">{Object.entries(groups).map(([module,values])=><section key={module}><h3 className="mb-2 text-[11px] font-semibold tracking-[.08em] text-[#637873] uppercase">{module.replaceAll('_',' ')}</h3><div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">{values.map(item=><label key={item.code} className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#e0e8e4] p-2.5 hover:bg-[#eef5f2]"><input className="mt-1 accent-[#24575a]" type="checkbox" checked={selected.includes(item.code)} onChange={()=>toggle(item.code)}/><span><strong className="block text-[13px] text-[#294541]">{item.name}</strong><small className="block text-[11px] text-[#70817d]">{item.code}</small></span></label>)}</div></section>)}</div></fieldset>
    <ModalActions><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving}>{saving?'Saving...':'Save Permission'}</Button></ModalActions>
  </form>
}
