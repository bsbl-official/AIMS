import { Eye, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../modules/auth/hooks/useAuth'
import { companyApi } from '../../../modules/company/api/company.api'
import type { Company } from '../../../modules/company/company.types'
import { initialCoaApi } from '../../../modules/coa/api/coa.api'
import { formatInitialCoaId, type InitialCoa } from '../../../modules/coa/coa.types'
import { accountLayerApi, accountTypes, accountGroups, allFields, codeKey, defaultColumns, descriptionKey, editableFields, keyFields, layerNames, reportChoices, rowKey, type AccountField, type AccountRow, type AccountValues, type Category, type ReportOption } from '../../../modules/coa/account-layers'
import { useToast } from '../../../modules/toast/hooks/useToast'
import { Button } from '../../../shared/components/Button'
import { CalendarPicker } from '../../../shared/components/CalendarPicker'
import { Card } from '../../../shared/components/Card'
import { DataTable, type Column } from '../../../shared/components/DataTable'
import { Modal, ModalActions } from '../../../shared/components/Modal'
import { PageContainer } from '../../../shared/components/PageContainer'
import { SearchableSelect } from '../../../shared/components/SearchableSelect'
import { SkeletonBoundary, TableSkeleton } from '../../../shared/components/Skeleton'
import { TableActionButton } from '../../../shared/components/TableActionButton'
import { SetupFormField, SetupInput, setupInputClass } from '../../../shared/components/forms/SetupFormField'

const message = (error: unknown) => error instanceof Error ? error.message : 'Unable to complete the request.'
const crumbs = [{label:'Dashboard',to:'/'},{label:'Setup'},{label:'Chart of Account setup'}]

export function AccountLayersPage() {
  const {can,user} = useAuth()
  const canView = can('coa.read') || can('coa.manage')
  const [companies,setCompanies] = useState<Company[]>([])
  const [coas,setCoas] = useState<InitialCoa[]>([])
  const [company,setCompany] = useState('')
  const [coa,setCoa] = useState('')
  const [error,setError] = useState('')
  const [ready,setReady] = useState(false)
  useEffect(()=>{
    if (!canView) return
    let active=true
    Promise.all([companyApi.companies(),initialCoaApi.list()]).then(([c,a])=>{
      if (!active) return
      setCompanies(c); setCoas(a)
      setCompany(c.find(x=>x.id===user?.organizations[0]?.organizationId)?.id ?? c[0]?.id ?? '')
      setCoa(String(a[0]?.coaId ?? '')); setReady(true)
    }).catch(e=>{if(active) setError(message(e))})
    return ()=>{active=false}
  },[canView,user])
  if (!canView) return <PageContainer title="Access denied" breadcrumbs={crumbs}><Card>You do not have access to Chart of Account setup.</Card></PageContainer>
  return <PageContainer title="Chart of Account setup" breadcrumbs={crumbs}>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {ready && (!company || !coa) && <Card>Create a company and an Initial COA before adding account layers.</Card>}
    {!ready && !error && <TableSkeleton columns={5} rows={5}/>}
    {company && coa && <AccountWorkspace key={`${company}:${coa}`} company={company} coa={coa} companies={companies} coas={coas}
      onCompanyChange={setCompany} onCoaChange={setCoa} userId={user?.id ?? ''} canEdit={can('coa.manage')}/>}
  </PageContainer>
}

function AccountWorkspace({company,coa,companies,coas,onCompanyChange,onCoaChange,userId,canEdit}:{
  company:string;coa:string;companies:Company[];coas:InitialCoa[];onCompanyChange:(value:string)=>void;onCoaChange:(value:string)=>void;userId:string;canEdit:boolean;
}) {
  const toast=useToast()
  const [level,setLevel]=useState(1)
  const [rows,setRows]=useState<AccountRow[][]>([[],[],[],[],[]])
  const [reports,setReports]=useState<ReportOption[]>([])
  const [categories,setCategories]=useState<Category[]>([])
  const [parents,setParents]=useState<string[]>(['','','',''])
  const [query,setQuery]=useState('')
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [form,setForm]=useState<{row:AccountRow|null;level:number}|null>(null)
  const [view,setView]=useState<AccountRow|null>(null)
  const [deleting,setDeleting]=useState<AccountRow|null>(null)
  const [deleteBusy,setDeleteBusy]=useState(false)
  const [columnModal,setColumnModal]=useState(false)
  const storageKey=`coa-head-columns:v1:${userId}`
  const [visible,setVisible]=useState<string[]>(()=>{
    try {
      const saved:unknown=JSON.parse(localStorage.getItem(storageKey) ?? 'null')
      const allowed=allFields(5).map(f=>f.key)
      if(Array.isArray(saved)) {const valid=allowed.filter(k=>saved.includes(k)); if(valid.length) return valid}
    } catch { /* Fall back when browser storage is unavailable. */ }
    return defaultColumns
  })
  useEffect(()=>{try {localStorage.setItem(storageKey,JSON.stringify(visible))} catch { /* Storage may be disabled. */ }},[storageKey,visible])
  const load=useCallback(async(signal?:AbortSignal)=>{
    const [r,options,cats]=await Promise.all([
      Promise.all(layerNames.map((_,i)=>accountLayerApi.list(company,coa,i+1,signal))),
      accountLayerApi.reports(company,signal), accountLayerApi.categories(company,signal),
    ])
    if(signal?.aborted) return
    setRows(r);setReports(options);setCategories(cats);setError('');setLoading(false)
  },[company,coa])
  useEffect(()=>{
    const controller=new AbortController()
    void load(controller.signal).catch(e=>{if(!controller.signal.aborted){setError(message(e));setLoading(false)}})
    return ()=>controller.abort()
  },[load])

  function display(row:AccountRow,field:AccountField):string {
    const value=row[field.key]
    if(value==null || value==='') return '—'
    if(field.flag) return value==='Y'?'Yes':'No'
    if(field.key==='acctype') return accountTypes.find(t=>t.value===value)?.label ?? String(value)
    if(field.key==='accgroup') return accountGroups.find(t=>t.value===value)?.label ?? String(value)
    if(field.key==='coa_id') return formatInitialCoaId(String(value))
    if(field.reports) return reportChoices(reports,field.reports).find(o=>o.value===value)?.label ?? String(value)
    if(field.key==='category_code') {const category=categories.find(c=>c.category_code===value); if(category) return `${value} - ${category.category_desc}`}
    return String(value)
  }
  const available=allFields(level)
  const selected=level===5?available.filter(f=>visible.includes(f.key)):[...keyFields(level),...editableFields(level).slice(0,3)]
  const columns:Column<AccountRow>[]=selected.map(f=>({key:f.key,header:f.label,align:'center',render:r=>display(r,f)}))
  columns.push({key:'view',header:'View',headerGroup:'Action',align:'center',render:r=><TableActionButton label={`View ${r[descriptionKey(level)] || r[codeKey(level)]}`} onClick={()=>setView(r)}><Eye className="size-4"/></TableActionButton>})
  if(canEdit) columns.push(
    {key:'edit',header:'Edit',headerGroup:'Action',align:'center',render:r=><TableActionButton label={`Edit ${r[descriptionKey(level)] || r[codeKey(level)]}`} onClick={()=>setForm({row:r,level})}><Pencil className="size-4"/></TableActionButton>},
    {key:'delete',header:'Delete',headerGroup:'Action',align:'center',render:r=><TableActionButton label={`Delete ${r[descriptionKey(level)] || r[codeKey(level)]}`} tone="danger" onClick={()=>setDeleting(r)}><Trash2 className="size-4"/></TableActionButton>},
  )
  const term=query.trim().toLowerCase()
  const filtered=(rows[level-1] ?? []).filter(r=>parents.slice(0,level-1).every((v,i)=>!v || r[codeKey(i+1)]===v))
    .filter(r=>!term || available.some(f=>display(r,f).toLowerCase().includes(term)))
  async function remove() {
    if(!deleting) return
    setDeleteBusy(true);setError('')
    try {await accountLayerApi.remove(company,coa,level,deleting);setDeleting(null);await load();toast.success('Account deleted.','Deleted')}
    catch(e){setError(message(e))} finally {setDeleteBusy(false)}
  }
  return <>
    <div className="rounded-xl border border-[#c2d9d0] bg-[linear-gradient(120deg,rgba(220,240,233,.92),rgba(248,250,244,.96),rgba(246,232,198,.72))] p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SetupFormField label="Company"><SearchableSelect ariaLabel="Company" value={company} onChange={onCompanyChange} options={companies.map(c=>({value:c.id,label:`${c.code} - ${c.legalName}`}))}/></SetupFormField>
        <SetupFormField label="Initial COA"><SearchableSelect ariaLabel="Initial COA" value={coa} onChange={onCoaChange} options={coas.map(c=>({value:String(c.coaId),label:`${formatInitialCoaId(c.coaId)} - ${c.description}`}))}/></SetupFormField>
        <SetupFormField label="Select account layer"><SearchableSelect ariaLabel="Account layer" value={String(level)} onChange={v=>{setLevel(Number(v));setParents(['','','','']);setQuery('')}} options={layerNames.map((label,i)=>({value:String(i+1),label}))}/></SetupFormField>
        {Array.from({length:level-1},(_,i)=><SetupFormField key={i} label={layerNames[i] ?? 'Parent'}>
          <SearchableSelect ariaLabel={`${layerNames[i]} filter`} value={parents[i] ?? ''} disabled={i>0 && !parents[i-1]} onChange={v=>setParents(p=>p.map((x,j)=>j===i?v:j>i?'':x))}
            options={[{value:'',label:'All'},...(rows[i] ?? []).filter(r=>parents.slice(0,i).every((v,j)=>r[codeKey(j+1)]===v)).map(r=>({value:String(r[codeKey(i+1)]),label:`${r[codeKey(i+1)]} - ${r[descriptionKey(i+1)] ?? ''}`}))]}/>
        </SetupFormField>)}
      </div>
    </div>
    {error && !deleting && <p role="alert" className="text-red-700">{error} <button type="button" onClick={()=>void load().catch(e=>setError(message(e)))}>Retry</button></p>}
    <div className="mt-3 overflow-hidden rounded-2xl border border-[#bfd7ce] bg-white/70 shadow-[0_14px_34px_rgba(39,73,68,.10)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cfe0d9] bg-[linear-gradient(100deg,#dcefe8,#eef7f1_58%,#f5e7c5)] px-5 py-4">
        <h2 className="m-0 text-base text-[#173d42]">{layerNames[level-1]} List</h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative"><Search className="absolute top-3.5 left-3 size-4 text-[#71817e]"/><input className={`${setupInputClass} pl-9`} value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search account setup" placeholder="Search codes or names"/></div>
          {level===5 && <Button variant="secondary" onClick={()=>setColumnModal(true)}><span className="flex items-center gap-2"><SlidersHorizontal className="size-4"/>Columns</span></Button>}
          {canEdit && <Button disabled={loading || !!error} onClick={()=>setForm({row:null,level})}><span className="flex items-center gap-2"><Plus className="size-4"/>Add New</span></Button>}
        </div>
      </div>
      <div className="p-5"><SkeletonBoundary loading={loading} fallback={<TableSkeleton columns={5} rows={5}/>}><DataTable columns={columns} rows={filtered} rowKey={r=>rowKey(r,level)} emptyMessage="No accounts found for these filters."/></SkeletonBoundary></div>
    </div>
    <Modal open={columnModal} title="Choose account head columns" onClose={()=>setColumnModal(false)}>
      <p className="text-sm text-[#617774]">Your choices are saved in this browser. Keep at least one column selected.</p>
      <div className="grid gap-3 sm:grid-cols-2">{allFields(5).map(f=><label key={f.key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visible.includes(f.key)} disabled={visible.length===1 && visible.includes(f.key)} onChange={e=>setVisible(v=>e.target.checked?[...v,f.key]:v.filter(k=>k!==f.key))}/>{f.label}</label>)}</div>
      <ModalActions><Button variant="secondary" onClick={()=>setVisible(defaultColumns)}>Reset columns</Button><Button onClick={()=>setColumnModal(false)}>Done</Button></ModalActions>
    </Modal>
    <Modal open={!!view} title="Account details" onClose={()=>setView(null)}><dl>{view && available.map(f=><div key={f.key} className="grid grid-cols-2 gap-3 border-b border-[#dce8e3] py-3 text-sm"><dt className="font-medium">{f.label}</dt><dd className="m-0 break-words">{display(view,f)}</dd></div>)}</dl></Modal>
    <Modal open={!!deleting} title="Delete account" onClose={()=>{if(!deleteBusy){setDeleting(null);setError('')}}}>
      <p>Delete {deleting?.[descriptionKey(level)] || deleting?.[codeKey(level)]}? Accounts with children cannot be deleted.</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <ModalActions><Button variant="secondary" disabled={deleteBusy} onClick={()=>{setDeleting(null);setError('')}}>Cancel</Button><Button variant="danger" disabled={deleteBusy} onClick={()=>void remove()}>{deleteBusy?'Deleting...':'Delete account'}</Button></ModalActions>
    </Modal>
    {form && <AccountForm company={company} coa={coa} level={form.level} initial={form.row} rows={rows} parents={parents} reports={reports} categories={categories}
      onCategory={c=>setCategories(old=>[...old,c])} onClose={()=>setForm(null)} onSaved={async()=>{
        setForm(null);toast.success('Account saved.','Saved')
        try {await load()} catch(e) {setError(message(e))}
      }}/>} 
  </>
}

function AccountForm({company,coa,level,initial,rows,parents,reports,categories,onCategory,onClose,onSaved}:{
  company:string;coa:string;level:number;initial:AccountRow|null;rows:AccountRow[][];parents:string[];reports:ReportOption[];categories:Category[];
  onCategory:(c:Category)=>void;onClose:()=>void;onSaved:()=>Promise<void>;
}) {
  const [values,setValues]=useState<AccountValues>(()=>Object.fromEntries([...keyFields(level),...editableFields(level)].map(f=>[f.key,String(initial?.[f.key] ?? (f.flag?'N':keyFields(level-1).some(k=>k.key===f.key)?parents[Number(f.key[1])-1] ?? '':''))])))
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [newCategory,setNewCategory]=useState(false)
  const [categoryCode,setCategoryCode]=useState('')
  const [categoryDesc,setCategoryDesc]=useState('')
  const closeForm=useCallback(()=>{if(!busy) onClose()},[busy,onClose])
  const set=(key:string,value:string)=>setValues(v=>({...v,[key]:value}))
  async function save() {
    setError('')
    if(keyFields(level).some(f=>!values[f.key]?.trim())) {setError('Select all parent layers and enter the account code.');return}
    setBusy(true)
    try {await accountLayerApi.save(company,coa,level,values,!!initial);await onSaved()}
    catch(e){setError(message(e))} finally {setBusy(false)}
  }
  async function addCategory() {
    if(!categoryCode.trim() || !categoryDesc.trim()){setError('Enter a category code and description.');return}
    setBusy(true);setError('')
    try {const c=await accountLayerApi.createCategory(company,{category_code:categoryCode,category_desc:categoryDesc});onCategory(c);set('category_code',c.category_code);setNewCategory(false)}
    catch(e){setError(message(e))} finally {setBusy(false)}
  }
  const choices=(f:AccountField)=>f.key==='acctype'?accountTypes:f.key==='accgroup'?accountGroups:f.key==='category_code'?categories.map(c=>({value:c.category_code,label:`${c.category_code} - ${c.category_desc}`})):reportChoices(reports,f.reports ?? [])
  return <Modal open title={initial ? `Edit ${layerNames[level-1]}` : `Create New ${layerNames[level-1]}`} onClose={closeForm}>
    <form onSubmit={e=>{e.preventDefault();void save()}} className="grid gap-4 md:grid-cols-2">
      <fieldset disabled={busy} className="contents">
        {keyFields(level).map((f,i)=><SetupFormField key={f.key} label={f.label}>
          {i===level-1 || initial?<SetupInput aria-label={f.label} value={values[f.key] ?? ''} maxLength={f.max} required disabled={!!initial} onChange={e=>set(f.key,e.target.value)}/>:
            <SearchableSelect ariaLabel={f.label} required value={values[f.key] ?? ''} disabled={i>0 && !values[codeKey(i)]} placeholder="Select parent account"
              options={(rows[i] ?? []).filter(r=>keyFields(i).every(k=>r[k.key]===values[k.key])).map(r=>({value:String(r[f.key]),label:`${r[f.key]} - ${r[descriptionKey(i+1)] ?? ''}`}))}
              onChange={v=>setValues(old=>({...old,...Object.fromEntries(keyFields(level-1).filter((_,j)=>j>i).map(k=>[k.key,''])),[f.key]:v}))}/>}
        </SetupFormField>)}
        {editableFields(level).map(f=><SetupFormField key={f.key} label={f.label} fullWidth={f.key===descriptionKey(level)}>
          {f.flag?<input aria-label={f.label} type="checkbox" className="size-4 accent-[#347077]" checked={values[f.key]==='Y'} onChange={e=>set(f.key,e.target.checked?'Y':'N')}/>:
            f.reports || ['acctype','accgroup','category_code'].includes(f.key)?<SearchableSelect ariaLabel={f.label} value={values[f.key] ?? ''} options={[{value:'',label:'None'},...choices(f)]} onChange={v=>set(f.key,v)}/>:
              f.date?<CalendarPicker ariaLabel={f.label} value={values[f.key] ?? ''} onChange={v=>set(f.key,v)}/>:
              <SetupInput aria-label={f.label} type="text" maxLength={f.max} value={values[f.key] ?? ''} onChange={e=>set(f.key,e.target.value)}/>}
        </SetupFormField>)}
        {level===2 && <div className="md:col-span-2">
          <Button type="button" variant="secondary" onClick={()=>setNewCategory(v=>!v)}>{newCategory?'Cancel new category':'Add category'}</Button>
      {newCategory && <div className="mt-3 grid gap-3"><SetupFormField label="New category code"><SetupInput value={categoryCode} maxLength={6} onChange={e=>setCategoryCode(e.target.value)}/></SetupFormField><SetupFormField label="New category description"><SetupInput value={categoryDesc} maxLength={100} onChange={e=>setCategoryDesc(e.target.value)}/></SetupFormField><Button type="button" onClick={()=>void addCategory()}>Save</Button></div>}
        </div>}
      </fieldset>
      {error && <p role="alert" className="text-red-700 md:col-span-2">{error}</p>}
    <ModalActions><Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy?'Saving...':'Save'}</Button></ModalActions>
    </form>
  </Modal>
}
