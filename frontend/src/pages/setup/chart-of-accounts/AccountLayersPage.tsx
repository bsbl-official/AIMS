import { Eye, Filter, Pencil, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useAuth } from '../../../modules/auth/hooks/useAuth'
import { branchApi } from '../../../modules/branch/api/branch.api'
import type { Branch } from '../../../modules/branch/branch.types'
import { companyApi } from '../../../modules/company/api/company.api'
import type { Company } from '../../../modules/company/company.types'
import { componentCodeApi } from '../../../modules/component-code/api/component-code.api'
import type { ComponentCode } from '../../../modules/component-code/component-code.types'
import { initialCoaApi } from '../../../modules/coa/api/coa.api'
import { formatInitialCoaId, type InitialCoa } from '../../../modules/coa/coa.types'
import { accountLayerApi, accountTypes, accountGroups, allFields, codeKey, defaultColumns, descriptionKey, editableFields, keyFields, layerNames, reportChoices, rowKey, type AccountField, type AccountRow, type AccountValues, type Category, type ReportOption } from '../../../modules/coa/account-layers'
import { financeCodeApi } from '../../../modules/finance-code/api/finance-code.api'
import type { FinanceCode } from '../../../modules/finance-code/finance-code.types'
import { projectCodeApi } from '../../../modules/project-code/api/project-code.api'
import type { ProjectCode } from '../../../modules/project-code/project-code.types'
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
import { formatCode } from '../../../shared/utils/formatCode'
import { useOrganizationContext } from '../../../modules/organization-context/useOrganizationContext'

const message = (error: unknown) => error instanceof Error ? error.message : 'Unable to complete the request.'
const crumbs = [{label:'Dashboard',to:'/'},{label:'Setup'},{label:'Chart of Account setup'}]
type AccountContext = {company_code:string;coa_id:string;branch_code:string;project_code:string;finance_code:string;component_code:string}
const isClassificationField = (field:AccountField) => field.key==='acctype' || field.key==='accgroup'
const classificationFields = (level:number) => editableFields(level).filter(isClassificationField)
const detailFields = (level:number) => editableFields(level).filter(field=>!isClassificationField(field))
const selectedControl = (rows:AccountRow[][],parents:string[]) => parents[2] ? (rows[2] ?? []).find(row=>
  [0,1,2].every(index=>!parents[index] || String(row[codeKey(index+1)] ?? '')===parents[index])) : undefined

function focusNextFieldOnEnter(event: ReactKeyboardEvent<HTMLFormElement>) {
  if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || event.nativeEvent.isComposing) return
  const target=event.target
  if (!(target instanceof HTMLInputElement) || ['checkbox','radio','button','submit'].includes(target.type) || target.closest('[data-select-popover]')) return
  const scope=target.closest<HTMLElement>('[data-enter-navigation]')
  if (!scope) return
  const fields=Array.from(scope.querySelectorAll<HTMLElement>('input:not([type="hidden"]):not(:disabled), button[aria-haspopup="listbox"]:not(:disabled)'))
    .filter(field=>field.offsetParent!==null)
  const next=fields[fields.indexOf(target)+1]
  event.preventDefault()
  next?.focus()
}

export function AccountLayersPage() {
  const {can,user} = useAuth()
  const {companyId:globalCompanyId}=useOrganizationContext()
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
      setCompany(globalCompanyId)
      setCoa(String(a[0]?.coaId ?? '')); setReady(true)
    }).catch(e=>{if(active) setError(message(e))})
    return ()=>{active=false}
  },[canView,globalCompanyId,user])
  if (!canView) return <PageContainer title="Access denied" breadcrumbs={crumbs}><Card>You do not have access to Chart of Account setup.</Card></PageContainer>
  return <PageContainer title="Chart of Account setup" breadcrumbs={crumbs}>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {ready && (!company || !coa) && <Card>Create a company and an Initial COA before adding account layers.</Card>}
    {!ready && !error && <TableSkeleton columns={5} rows={5}/>}
    {company && coa && <AccountWorkspace key={`${company}:${coa}`} company={company} coa={coa} companies={companies} coas={coas}
      onCoaChange={setCoa} userId={user?.id ?? ''} canEdit={can('coa.manage')}/>}
  </PageContainer>
}

function AccountWorkspace({company,coa,companies,coas,onCoaChange,userId,canEdit}:{
  company:string;coa:string;companies:Company[];coas:InitialCoa[];onCoaChange:(value:string)=>void;userId:string;canEdit:boolean;
}) {
  const toast=useToast()
  const {branchId:globalBranchId}=useOrganizationContext()
  const [level,setLevel]=useState(1)
  const [rows,setRows]=useState<AccountRow[][]>([[],[],[],[],[]])
  const [reports,setReports]=useState<ReportOption[]>([])
  const [categories,setCategories]=useState<Category[]>([])
  const [branches,setBranches]=useState<Branch[]>([])
  const [projects,setProjects]=useState<ProjectCode[]>([])
  const [finances,setFinances]=useState<FinanceCode[]>([])
  const [components,setComponents]=useState<ComponentCode[]>([])
  const [branchId,setBranchId]=useState('')
  const [projectId,setProjectId]=useState('')
  const [financeId,setFinanceId]=useState('')
  const [componentId,setComponentId]=useState('')
  const [parents,setParents]=useState<string[]>(['','','',''])
  const [query,setQuery]=useState('')
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [contextError,setContextError]=useState('')
  const [form,setForm]=useState<{row:AccountRow|null;level:number}|null>(null)
  const [view,setView]=useState<AccountRow|null>(null)
  const [deleting,setDeleting]=useState<AccountRow|null>(null)
  const [deleteBusy,setDeleteBusy]=useState(false)
  const [filterOpen,setFilterOpen]=useState(false)
  const [draftParents,setDraftParents]=useState<string[]>(['','','',''])
  const filterPopoverRef=useRef<HTMLDivElement>(null)
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
  useEffect(()=>{
    let active=true
    setContextError('')
    void Promise.all([branchApi.branches(company),projectCodeApi.list(company)]).then(([nextBranches,nextProjects])=>{
      if(!active) return
      const activeBranches=nextBranches.filter(item=>item.status==='ACTIVE')
      const activeProjects=nextProjects.filter(item=>item.status==='ACTIVE')
      setBranches(activeBranches);setProjects(activeProjects)
      setBranchId(activeBranches.some(item=>item.id===globalBranchId)?globalBranchId:activeBranches[0]?.id ?? '')
      setProjectId(String(activeProjects[0]?.id ?? ''))
    }).catch(reason=>{if(active) setContextError(message(reason))})
    return ()=>{active=false}
  },[company,globalBranchId])
  useEffect(()=>{
    let active=true
    setFinances([]);setComponents([]);setFinanceId('');setComponentId('')
    if(!projectId) return ()=>{active=false}
    void financeCodeApi.list(company,projectId).then(next=>{
      if(!active) return
      const available=next.filter(item=>item.status==='ACTIVE')
      setFinances(available);setFinanceId(String(available[0]?.id ?? ''))
    }).catch(reason=>{if(active) setContextError(message(reason))})
    return ()=>{active=false}
  },[company,projectId])
  useEffect(()=>{
    let active=true
    setComponents([]);setComponentId('')
    if(!projectId || !financeId) return ()=>{active=false}
    void componentCodeApi.list(company,projectId,financeId).then(next=>{
      if(!active) return
      const available=next.filter(item=>item.status==='ACTIVE')
      setComponents(available);setComponentId(String(available[0]?.id ?? ''))
    }).catch(reason=>{if(active) setContextError(message(reason))})
    return ()=>{active=false}
  },[company,financeId,projectId])

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
  function openFilters() {
    setDraftParents([...parents])
    setFilterOpen(current=>!current)
  }
  function applyFilters() {
    setParents(draftParents.map((value,index)=>index<level-1?value:''))
    setFilterOpen(false)
  }
  useEffect(()=>{
    if(!filterOpen) return
    const closeOnOutsideClick=(event:PointerEvent)=>{
      const target=event.target as Node
      const element=event.target as Element
      if(!filterPopoverRef.current?.contains(target) && !element.closest('[data-select-popover]')) setFilterOpen(false)
    }
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape') setFilterOpen(false)}
    document.addEventListener('pointerdown',closeOnOutsideClick)
    window.addEventListener('keydown',closeOnEscape)
    return ()=>{
      document.removeEventListener('pointerdown',closeOnOutsideClick)
      window.removeEventListener('keydown',closeOnEscape)
    }
  },[filterOpen])
  const activeFilterCount=parents.slice(0,level-1).filter(Boolean).length
  const selectedCompany=companies.find(item=>item.id===company)
  const selectedBranch=branches.find(item=>item.id===branchId)
  const selectedProject=projects.find(item=>String(item.id)===projectId)
  const selectedFinance=finances.find(item=>String(item.id)===financeId)
  const selectedComponent=components.find(item=>String(item.id)===componentId)
  const accountContext:AccountContext={
    company_code:selectedCompany?.code ?? '',coa_id:coa,branch_code:selectedBranch?.code ?? '',
    project_code:String(selectedProject?.code ?? ''),finance_code:String(selectedFinance?.code ?? ''),component_code:String(selectedComponent?.code ?? ''),
  }
  const contextReady=Object.values(accountContext).every(Boolean)
  return <>
    <div className="rounded-xl border border-[#c2d9d0] bg-[linear-gradient(120deg,rgba(220,240,233,.92),rgba(248,250,244,.96),rgba(246,232,198,.72))] p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SetupFormField label="Initial COA"><SearchableSelect ariaLabel="Initial COA" value={coa} onChange={onCoaChange} options={coas.map(c=>({value:String(c.coaId),label:`${formatInitialCoaId(c.coaId)} - ${c.description}`}))}/></SetupFormField>
        <SetupFormField label="Select account layer"><SearchableSelect ariaLabel="Account layer" value={String(level)} onChange={value=>{setLevel(Number(value));setParents(['','','','']);setQuery('')}} options={layerNames.map((label,index)=>({value:String(index+1),label}))}/></SetupFormField>
        <SetupFormField label="Project code"><SearchableSelect ariaLabel="Project code" value={projectId} onChange={setProjectId} options={projects.map(item=>({value:String(item.id),label:`${formatCode(item.code)} - ${item.name}`}))}/></SetupFormField>
        <SetupFormField label="Finance code"><SearchableSelect ariaLabel="Finance code" value={financeId} onChange={setFinanceId} disabled={!projectId} options={finances.map(item=>({value:String(item.id),label:`${formatCode(item.code)} - ${item.name}`}))}/></SetupFormField>
        <SetupFormField label="Component code"><SearchableSelect ariaLabel="Component code" value={componentId} onChange={setComponentId} disabled={!financeId} options={components.map(item=>({value:String(item.id),label:`${formatCode(item.code)} - ${item.name}`}))}/></SetupFormField>
      </div>
    </div>
    {contextError && <p role="alert" className="text-red-700">{contextError}</p>}
    {error && !deleting && <p role="alert" className="text-red-700">{error} <button type="button" onClick={()=>void load().catch(e=>setError(message(e)))}>Retry</button></p>}
    <div className="mt-3 rounded-2xl border border-[#bfd7ce] bg-white/70 shadow-[0_14px_34px_rgba(39,73,68,.10)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cfe0d9] bg-[linear-gradient(100deg,#dcefe8,#eef7f1_58%,#f5e7c5)] px-5 py-4">
        <h2 className="m-0 text-base text-[#173d42]">{layerNames[level-1]} List</h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative"><Search className="absolute top-3.5 left-3 size-4 text-[#71817e]"/><input className={`${setupInputClass} pl-9`} value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search account setup" placeholder="Search codes or names"/></div>
          <div className="relative" ref={filterPopoverRef}>
            <Button variant="secondary" onClick={openFilters} aria-expanded={filterOpen} aria-haspopup="dialog" aria-label={activeFilterCount?`Filters, ${activeFilterCount} active`:'Filters'}><span className="flex items-center gap-2"><Filter className="size-4"/>Filters{activeFilterCount>0 && <span className="grid min-w-5 place-items-center rounded-full bg-[#347077] px-1.5 py-0.5 text-xs leading-4 text-white">{activeFilterCount}</span>}</span></Button>
            {activeFilterCount>0 && <button type="button" aria-label="Clear active filters" title="Clear active filters" onClick={()=>setParents(['','','',''])} className="absolute -top-2 -right-2 grid size-6 cursor-pointer place-items-center rounded-full border-2 border-white bg-[#a94b42] text-white shadow-sm transition hover:bg-[#8f3b34]"><X className="size-3.5" aria-hidden/></button>}
            {filterOpen && <div role="dialog" aria-label={`Filter ${layerNames[level-1]} accounts`} className="absolute top-[calc(100%+10px)] right-0 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-[#c5d8d0] bg-white p-4 text-left shadow-[0_18px_48px_rgba(17,44,46,.22)]">
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#dce8e3] pb-3">
                <div><h3 className="m-0 text-sm font-semibold text-[#173d42]">Filter {layerNames[level-1]} accounts</h3><p className="m-0 mt-1 text-xs text-[#617774]">Select parent account layers.</p></div>
                <button type="button" aria-label="Close filters" onClick={()=>setFilterOpen(false)} className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-[#617774] hover:bg-[#e8f1ed] hover:text-[#173d42]"><X className="size-4" aria-hidden/></button>
              </div>
              <div className="grid gap-3">
                {level===1 && <p className="m-0 text-sm text-[#617774]">The Root Layer has no parent-layer filters.</p>}
                {Array.from({length:level-1},(_,index)=><SetupFormField key={index} label={layerNames[index] ?? 'Parent'}>
                  <SearchableSelect ariaLabel={`${layerNames[index]} filter`} value={draftParents[index] ?? ''} disabled={index>0 && !draftParents[index-1]}
                    onChange={value=>setDraftParents(current=>current.map((parent,parentIndex)=>parentIndex===index?value:parentIndex>index?'':parent))}
                    options={[{value:'',label:'All'},...(rows[index] ?? []).filter(row=>draftParents.slice(0,index).every((parent,parentIndex)=>!parent || row[codeKey(parentIndex+1)]===parent)).map(row=>({value:String(row[codeKey(index+1)]),label:`${row[codeKey(index+1)]} - ${row[descriptionKey(index+1)] ?? ''}`}))]}/>
                </SetupFormField>)}
              </div>
              <div className="-mx-4 -mb-4 mt-4 flex flex-wrap justify-end gap-2 border-t border-[#dce8e3] bg-[#f4f8f6] px-4 py-3">
                <Button variant="secondary" onClick={()=>setDraftParents(['','','',''])}>Clear</Button>
                <Button onClick={applyFilters}>Apply</Button>
              </div>
            </div>}
          </div>
          {level===5 && <Button variant="secondary" onClick={()=>setColumnModal(true)}><span className="flex items-center gap-2"><SlidersHorizontal className="size-4"/>Columns</span></Button>}
          {canEdit && <Button disabled={loading || !!error || !contextReady} onClick={()=>setForm({row:null,level})}><span className="flex items-center gap-2"><Plus className="size-4"/>Add New</span></Button>}
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
    {form && (form.row ? <AccountForm company={company} coa={coa} context={accountContext} level={form.level} initial={form.row} rows={rows} parents={parents} reports={reports} categories={categories}
      onCategory={c=>setCategories(old=>[...old,c])} onClose={()=>setForm(null)} onSaved={async()=>{
        setForm(null);toast.success('Account saved.','Saved')
        try {await load()} catch(e) {setError(message(e))}
      }}/> : <AccountBatchForm company={company} coa={coa} context={accountContext} level={form.level} rows={rows} parents={parents} reports={reports} categories={categories}
        onClose={()=>setForm(null)} onSaved={async count=>{
          setForm(null);toast.success(`${count} account record(s) saved.`,'Saved')
          try {await load()} catch(e) {setError(message(e))}
        }}/>) }
  </>
}

function AccountBatchForm({company,coa,context,level,rows,parents,reports,categories,onClose,onSaved}:{
  company:string;coa:string;context:AccountContext;level:number;rows:AccountRow[][];parents:string[];reports:ReportOption[];categories:Category[];
  onClose:()=>void;onSaved:(count:number)=>Promise<void>;
}) {
  const parentControl=selectedControl(rows,parents)
  const emptyValues=(copy?:AccountValues):AccountValues=>Object.fromEntries([...keyFields(level),...editableFields(level)].map(field=>[
    field.key,field.flag?'N':isClassificationField(field)?copy?.[field.key] ?? String(parentControl?.[field.key] ?? ''):
      keyFields(level-1).some(key=>key.key===field.key)?copy?.[field.key] ?? parents[Number(field.key[1])-1] ?? '':''
  ]))
  const [drafts,setDrafts]=useState<AccountValues[]>(()=>[emptyValues()])
  const [active,setActive]=useState(0)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const accountKey=(values:AccountValues)=>JSON.stringify(keyFields(level).map(field=>(values[field.key] ?? '').trim().toUpperCase()))
  const existingKeys=new Set((rows[level-1] ?? []).map(row=>JSON.stringify(keyFields(level).map(field=>String(row[field.key] ?? '').trim().toUpperCase()))))
  const setDraft=(index:number,values:AccountValues)=>setDrafts(current=>current.map((draft,draftIndex)=>draftIndex===index?values:draft))
  const validate=(values:AccountValues,index:number)=>{
    if(level>=3 && (!values.acctype?.trim() || !values.accgroup?.trim())) return 'Select an account type and account group.'
    if(keyFields(level).some(field=>!values[field.key]?.trim())) return 'Select all parent layers and enter the account code.'
    const key=accountKey(values)
    if(existingKeys.has(key)) return 'This account code already exists in the selected layer.'
    if(drafts.some((draft,draftIndex)=>draftIndex!==index && accountKey(draft)===key)) return 'This account code is duplicated in the current batch.'
    return ''
  }
  const addAnother=()=>{
    const currentIndex=active
    const problem=validate(drafts[currentIndex]!,currentIndex)
    if(problem){setError(problem);return}
    const next=emptyValues(drafts[currentIndex]!)
    setDrafts(current=>[...current,next]);setActive(drafts.length);setError('')
  }
  const removeDraft=(index:number)=>{
    if(drafts.length===1) return
    setDrafts(current=>current.filter((_,draftIndex)=>draftIndex!==index))
    setActive(current=>current===index?Math.min(index,drafts.length-2):current>index?current-1:current)
    setError('')
  }
  const choices=(field:AccountField)=>field.key==='acctype'?accountTypes:field.key==='accgroup'?accountGroups:field.key==='category_code'?categories.map(category=>({value:category.category_code,label:`${category.category_code} - ${category.category_desc}`})):reportChoices(reports,field.reports ?? [])
  const setClassification=(index:number,values:AccountValues,key:string,value:string)=>setDraft(index,{
    ...values,[key]:value,
    ...Object.fromEntries(keyFields(level-1).filter((_,fieldIndex)=>fieldIndex>=2).map(field=>[field.key,''])),
  })
  const renderKeyField=(field:AccountField,fieldIndex:number,index:number,values:AccountValues)=><SetupFormField key={field.key} label={field.label}>
    {fieldIndex===level-1?<SetupInput aria-label={field.label} value={values[field.key] ?? ''} maxLength={field.max} required onChange={event=>setDraft(index,{...values,[field.key]:event.target.value})}/>:
      <SearchableSelect ariaLabel={field.label} required value={values[field.key] ?? ''} disabled={(fieldIndex>0 && !values[codeKey(fieldIndex)]) || (level>3 && fieldIndex===2 && (!values.acctype || !values.accgroup))} placeholder="Select parent account"
        options={(rows[fieldIndex] ?? []).filter(row=>keyFields(fieldIndex).every(key=>String(row[key.key] ?? '')===values[key.key]))
          .filter(row=>level<=3 || fieldIndex!==2 || (row.acctype===values.acctype && row.accgroup===values.accgroup))
          .map(row=>({value:String(row[field.key]),label:`${row[field.key]} - ${row[descriptionKey(fieldIndex+1)] ?? ''}`}))}
        onChange={value=>setDraft(index,{...values,...Object.fromEntries(keyFields(level-1).filter((_,childIndex)=>childIndex>fieldIndex).map(key=>[key.key,''])),[field.key]:value})}/>}
  </SetupFormField>
  async function save() {
    for(let index=0;index<drafts.length;index++) {const problem=validate(drafts[index]!,index);if(problem){setActive(index);setError(`Record ${index+1}: ${problem}`);return}}
    setBusy(true);setError('')
    try {await accountLayerApi.saveBatch(company,coa,level,drafts.map(values=>({...values,...context})));await onSaved(drafts.length)}
    catch(reason){setError(message(reason))} finally {setBusy(false)}
  }
  return <Modal open title={`Create ${layerNames[level-1]} records`} description="Add multiple records and save them together." onClose={()=>{if(!busy)onClose()}} size="batch">
    <form onKeyDown={focusNextFieldOnEnter} onSubmit={event=>{event.preventDefault();void save()}}>
      <fieldset disabled={busy} className="grid gap-3">
        {drafts.map((values,index)=><section key={index} className="overflow-hidden rounded-xl border border-[#c7dad2] bg-white/80">
          <div className="flex items-center justify-between gap-3 bg-[#eef6f2] px-4 py-3 text-sm text-[#173d42]">
            <button type="button" onClick={()=>setActive(index)} aria-expanded={active===index} aria-label={active===index?`Editing record ${index+1}`:`Open record ${index+1}`} title={active===index?'Editing':'Open record'} className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 text-left">
              <span className="truncate"><strong>Record {index+1}</strong>{values[codeKey(level)] && ` — ${values[codeKey(level)]}`}{values[descriptionKey(level)] && ` · ${values[descriptionKey(level)]}`}</span>
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${active===index?'bg-[#dcece6] text-[#285d5e]':'text-[#52716b] transition hover:bg-[#dcece6] hover:text-[#285d5e]'}`} aria-hidden>
                {active===index?<Pencil className="size-4"/>:<Eye className="size-4"/>}
              </span>
            </button>
            {drafts.length>1 && <button type="button" onClick={()=>removeDraft(index)} aria-label={`Remove record ${index+1}`} title="Remove record" className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-[#a94b42] transition hover:bg-red-50 hover:text-[#8f3b34]"><Trash2 className="size-4" aria-hidden/></button>}
          </div>
          {active===index && <div className="grid gap-4 p-4 md:grid-cols-3" data-enter-navigation>
            {keyFields(level).slice(0,2).map((field,fieldIndex)=>renderKeyField(field,fieldIndex,index,values))}
            {level>=3 && classificationFields(level).map(field=><SetupFormField key={field.key} label={field.label}>
              <SearchableSelect ariaLabel={field.label} required value={values[field.key] ?? ''} placeholder={`Select ${field.label.toLowerCase()}`}
                options={choices(field)} onChange={value=>setClassification(index,values,field.key,value)}/>
            </SetupFormField>)}
            {keyFields(level).slice(2).map((field,indexAfterGroup)=>renderKeyField(field,indexAfterGroup+2,index,values))}
            {(level>=3?detailFields(level):editableFields(level)).map(field=>field.flag?<FlagCheckbox key={field.key} label={field.label} checked={values[field.key]==='Y'} onChange={checked=>setDraft(index,{...values,[field.key]:checked?'Y':'N'})}/>:<SetupFormField key={field.key} label={field.label}>
              {
                field.reports || ['acctype','accgroup','category_code'].includes(field.key)?<SearchableSelect ariaLabel={field.label} required={isClassificationField(field)} value={values[field.key] ?? ''} options={isClassificationField(field)?choices(field):[{value:'',label:'None'},...choices(field)]} onChange={value=>setDraft(index,{...values,[field.key]:value})}/>:
                  field.date?<CalendarPicker ariaLabel={field.label} value={values[field.key] ?? ''} onChange={value=>setDraft(index,{...values,[field.key]:value})}/>:
                  <SetupInput aria-label={field.label} maxLength={field.max} value={values[field.key] ?? ''} onChange={event=>setDraft(index,{...values,[field.key]:event.target.value})}/>}
            </SetupFormField>)}
          </div>}
        </section>)}
      </fieldset>
      <button
        type="button"
        disabled={busy}
        onClick={addAnother}
        className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#abc5ba] bg-white/55 py-2.5 text-sm text-[#315f5c] transition hover:bg-[#eaf3ef] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="size-4" aria-hidden />
        Add Another Record
      </button>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={busy}>{busy?'Saving...':'Save'}</Button>
      </div>
    </form>
  </Modal>
}

function AccountForm({company,coa,context,level,initial,rows,parents,reports,categories,onCategory,onClose,onSaved}:{
  company:string;coa:string;context:AccountContext;level:number;initial:AccountRow|null;rows:AccountRow[][];parents:string[];reports:ReportOption[];categories:Category[];
  onCategory:(c:Category)=>void;onClose:()=>void;onSaved:()=>Promise<void>;
}) {
  const parentControl=selectedControl(rows,parents)
  const [values,setValues]=useState<AccountValues>(()=>Object.fromEntries([...keyFields(level),...editableFields(level)].map(f=>[
    f.key,String(initial?.[f.key] ?? (f.flag?'N':isClassificationField(f)?parentControl?.[f.key] ?? '':
      keyFields(level-1).some(k=>k.key===f.key)?parents[Number(f.key[1])-1] ?? '':'')),
  ])))
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [newCategory,setNewCategory]=useState(false)
  const [categoryCode,setCategoryCode]=useState('')
  const [categoryDesc,setCategoryDesc]=useState('')
  const closeForm=useCallback(()=>{if(!busy) onClose()},[busy,onClose])
  const set=(key:string,value:string)=>setValues(v=>({...v,[key]:value}))
  async function save() {
    setError('')
    if(level>=3 && (!values.acctype?.trim() || !values.accgroup?.trim())) {setError('Select an account type and account group.');return}
    if(keyFields(level).some(f=>!values[f.key]?.trim())) {setError('Select all parent layers and enter the account code.');return}
    setBusy(true)
    try {await accountLayerApi.save(company,coa,level,{...values,...context},!!initial);await onSaved()}
    catch(e){setError(message(e))} finally {setBusy(false)}
  }
  async function addCategory() {
    if(!categoryCode.trim() || !categoryDesc.trim()){setError('Enter a category code and description.');return}
    setBusy(true);setError('')
    try {const c=await accountLayerApi.createCategory(company,{category_code:categoryCode,category_desc:categoryDesc});onCategory(c);set('category_code',c.category_code);setNewCategory(false)}
    catch(e){setError(message(e))} finally {setBusy(false)}
  }
  const choices=(f:AccountField)=>f.key==='acctype'?accountTypes:f.key==='accgroup'?accountGroups:f.key==='category_code'?categories.map(c=>({value:c.category_code,label:`${c.category_code} - ${c.category_desc}`})):reportChoices(reports,f.reports ?? [])
  const setClassification=(key:string,value:string)=>setValues(old=>({
    ...old,[key]:value,
    ...Object.fromEntries(keyFields(level-1).filter((_,fieldIndex)=>fieldIndex>=2).map(field=>[field.key,''])),
  }))
  const renderKeyField=(f:AccountField,i:number)=><SetupFormField key={f.key} label={f.label}>
    {i===level-1 || initial?<SetupInput aria-label={f.label} value={values[f.key] ?? ''} maxLength={f.max} required disabled={!!initial} onChange={e=>set(f.key,e.target.value)}/>:
      <SearchableSelect ariaLabel={f.label} required value={values[f.key] ?? ''} disabled={(i>0 && !values[codeKey(i)]) || (level>3 && i===2 && (!values.acctype || !values.accgroup))} placeholder="Select parent account"
        options={(rows[i] ?? []).filter(r=>keyFields(i).every(k=>r[k.key]===values[k.key]))
          .filter(r=>level<=3 || i!==2 || (r.acctype===values.acctype && r.accgroup===values.accgroup))
          .map(r=>({value:String(r[f.key]),label:`${r[f.key]} - ${r[descriptionKey(i+1)] ?? ''}`}))}
        onChange={v=>setValues(old=>({...old,...Object.fromEntries(keyFields(level-1).filter((_,j)=>j>i).map(k=>[k.key,''])),[f.key]:v}))}/>}
  </SetupFormField>
  return <Modal open title={initial ? `Edit ${layerNames[level-1]}` : `Create New ${layerNames[level-1]}`} onClose={closeForm}>
    <form onKeyDown={focusNextFieldOnEnter} onSubmit={e=>{e.preventDefault();void save()}} className="grid gap-4 md:grid-cols-2" data-enter-navigation>
      <fieldset disabled={busy} className="contents">
        {keyFields(level).slice(0,2).map((f,i)=>renderKeyField(f,i))}
        {level>=3 && classificationFields(level).map(f=><SetupFormField key={f.key} label={f.label}>
          <SearchableSelect ariaLabel={f.label} required value={values[f.key] ?? ''} disabled={!!initial && level>3} placeholder={`Select ${f.label.toLowerCase()}`}
            options={choices(f)} onChange={v=>setClassification(f.key,v)}/>
        </SetupFormField>)}
        {keyFields(level).slice(2).map((f,indexAfterGroup)=>renderKeyField(f,indexAfterGroup+2))}
        {(level>=3?detailFields(level):editableFields(level)).map(f=>f.flag?<FlagCheckbox key={f.key} label={f.label} checked={values[f.key]==='Y'} onChange={checked=>set(f.key,checked?'Y':'N')}/>:<SetupFormField key={f.key} label={f.label}>
          {
            f.reports || ['acctype','accgroup','category_code'].includes(f.key)?<SearchableSelect ariaLabel={f.label} required={isClassificationField(f)} value={values[f.key] ?? ''} options={isClassificationField(f)?choices(f):[{value:'',label:'None'},...choices(f)]} onChange={v=>set(f.key,v)}/>:
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

function FlagCheckbox({label,checked,onChange}:{label:string;checked:boolean;onChange:(checked:boolean)=>void}) {
  return <label className="flex min-h-[42px] self-end items-center justify-between rounded-lg border border-[#ccd5d0] bg-white px-3 py-[11px] text-[13px] font-medium text-[#405653] focus-within:border-[#347077] focus-within:shadow-[0_0_0_3px_rgba(52,112,119,.12)]">
    <span>{label}</span>
    <input aria-label={label} type="checkbox" className="size-4 accent-[#347077]" checked={checked} onChange={event=>onChange(event.target.checked)}/>
  </label>
}
