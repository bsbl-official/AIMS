import { Eye, Pencil, Printer, Search, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../modules/auth/hooks/useAuth'
import { useOrganizationContext } from '../../modules/organization-context/useOrganizationContext'
import { useToast } from '../../modules/toast/hooks/useToast'
import { voucherTransactionsApi } from '../../modules/voucher-transactions/api/voucher-transactions.api'
import { entryValues, validateEntry, VoucherEntryForm, type EntryDraft } from '../../modules/voucher-transactions/components/VoucherEntryForm'
import type { CombinedVoucherSummary, Voucher, VoucherClass, VoucherFullUpdate, VoucherLine, VoucherOptions } from '../../modules/voucher-transactions/voucher-transactions.types'
import { ApiError } from '../../shared/api/httpClient'
import { Button } from '../../shared/components/Button'
import { CalendarPicker } from '../../shared/components/CalendarPicker'
import { Card } from '../../shared/components/Card'
import { DataTable, type Column } from '../../shared/components/DataTable'
import { Modal, ModalActions } from '../../shared/components/Modal'
import { PageContainer } from '../../shared/components/PageContainer'
import { SearchableSelect } from '../../shared/components/SearchableSelect'
import { SkeletonBoundary, TableSkeleton } from '../../shared/components/Skeleton'
import { TableActionButton } from '../../shared/components/TableActionButton'
import { SetupFormField, SetupInput } from '../../shared/components/forms/SetupFormField'

const crumbs=[{label:'Dashboard',to:'/'},{label:'Transactions'},{label:'Voucher List'}]
const money=new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})
const classLabel=(value:VoucherClass|string)=>value.toLowerCase()==='debit'?'Debit':value.toLowerCase()==='credit'?'Credit':'Journal'
const message=(reason:unknown)=>reason instanceof ApiError?reason.message:'Unable to complete the request.'
const displayDate=(value:string)=>{const [year,month,day]=value.split('-');return year&&month&&day?`${day}-${month}-${year}`:value}
type VoucherFilters={voucherNumber:string;fromDate:string;toDate:string;voucherClass:''|VoucherClass}
const emptyFilters:VoucherFilters={voucherNumber:'',fromDate:'',toDate:'',voucherClass:'debit'}

export function VoucherListPage(){
  const {can}=useAuth(),{companyId,branchId,company,branch}=useOrganizationContext(),toast=useToast()
  const canView=can('journal.read')||can('journal.create'),canEdit=can('journal.create')
  const [filters,setFilters]=useState(emptyFilters),[applied,setApplied]=useState(emptyFilters)
  const [rows,setRows]=useState<CombinedVoucherSummary[]>([]),[loading,setLoading]=useState(true)
  const [viewing,setViewing]=useState<Voucher|null>(null),[editing,setEditing]=useState<Voucher|null>(null)
  const [deleting,setDeleting]=useState<CombinedVoucherSummary|null>(null),[actionBusy,setActionBusy]=useState(false)

  const load=useCallback(async()=>{if(!companyId||!branchId||!canView){setRows([]);setLoading(false);return}setLoading(true);try{setRows(await voucherTransactionsApi.listAll(companyId,{branchId,...applied,voucherClass:applied.voucherClass||undefined}))}catch(reason){toast.error(message(reason),'Voucher list could not be loaded')}finally{setLoading(false)}},[applied,branchId,canView,companyId,toast])
  useEffect(()=>{void load()},[load])

  const get=async(row:CombinedVoucherSummary)=>{setActionBusy(true);try{return await voucherTransactionsApi.get(companyId,row.voucherClass,row.id)}catch(reason){toast.error(message(reason),'Voucher could not be opened')}finally{setActionBusy(false)}}
  const openView=async(row:CombinedVoucherSummary)=>{const voucher=await get(row);if(voucher)setViewing(voucher)}
  const openEdit=async(row:CombinedVoucherSummary)=>{const voucher=await get(row);if(voucher)setEditing(voucher)}
  const print=async(row:CombinedVoucherSummary)=>{const voucher=await get(row);if(!voucher)return;setActionBusy(true);try{await downloadVoucherPdf(voucher,row.voucherClass,company?.name??'',()=>voucherTransactionsApi.photo(companyId,row.voucherClass,row.id));toast.success('Voucher PDF downloaded.','Downloaded')}catch(reason){toast.error(message(reason),'PDF could not be created')}finally{setActionBusy(false)}}
  const remove=async()=>{if(!deleting)return;setActionBusy(true);try{await voucherTransactionsApi.remove(companyId,deleting.voucherClass,deleting.id);setDeleting(null);await load();toast.success('Voucher deleted.','Deleted')}catch(reason){toast.error(message(reason),'Voucher was not deleted')}finally{setActionBusy(false)}}

  const columns=useMemo<Column<CombinedVoucherSummary>[]>(()=>[
    {key:'number',header:'Voucher No',render:r=><span className="font-medium text-[#23464b]">{r.voucherNumber}</span>},
    {key:'date',header:'Date',render:r=>displayDate(r.voucherDate)},
    {key:'class',header:'Voucher Class',render:r=>classLabel(r.voucherClass)},
    {key:'type',header:'Voucher Type',render:r=>r.voucherType},
    {key:'particulars',header:'Particulars',render:r=><span className="block min-w-60 max-w-xl">{r.particulars}</span>},
    {key:'amount',header:'Amount',align:'right',render:r=>money.format(r.amount)},
    {key:'view',header:'View',headerGroup:'Action',align:'center',render:r=><TableActionButton disabled={actionBusy} label={`View ${r.voucherNumber}`} onClick={()=>void openView(r)}><Eye className="size-4"/></TableActionButton>},
    ...(canEdit?[{key:'edit',header:'Edit',headerGroup:'Action',align:'center' as const,render:(r:CombinedVoucherSummary)=><TableActionButton disabled={actionBusy} label={`Edit ${r.voucherNumber}`} onClick={()=>void openEdit(r)}><Pencil className="size-4"/></TableActionButton>}]:[]),
    {key:'print',header:'Print',headerGroup:'Action',align:'center',render:r=><TableActionButton disabled={actionBusy} label={`Print ${r.voucherNumber}`} onClick={()=>void print(r)}><Printer className="size-4"/></TableActionButton>},
    ...(canEdit?[{key:'delete',header:'Delete',headerGroup:'Action',align:'center' as const,render:(r:CombinedVoucherSummary)=><TableActionButton disabled={actionBusy} tone="danger" label={`Delete ${r.voucherNumber}`} onClick={()=>setDeleting(r)}><Trash2 className="size-4"/></TableActionButton>}]:[]),
  ],[actionBusy,canEdit])

  if(!canView)return <PageContainer title="Access denied" breadcrumbs={crumbs}><Card>You do not have access to Voucher List.</Card></PageContainer>
  return <PageContainer title="Voucher List" breadcrumbs={crumbs}>
    <Card className="mb-4">
      <form className="grid items-end gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]" onSubmit={event=>{event.preventDefault();if(filters.fromDate&&filters.toDate&&filters.fromDate>filters.toDate){toast.error('From date must not be after To date.','Invalid date range');return}setApplied({...filters})}}>
        <SetupFormField label="Voucher Type"><SearchableSelect ariaLabel="Voucher Type" value={filters.voucherClass} options={[{value:'',label:'All Vouchers'},{value:'debit',label:'Debit'},{value:'credit',label:'Credit'},{value:'journal',label:'Journal'}]} onChange={voucherClass=>setFilters(current=>({...current,voucherClass:voucherClass as VoucherFilters['voucherClass']}))}/></SetupFormField>
        <SetupFormField label="Voucher No"><SetupInput value={filters.voucherNumber} placeholder="Voucher No" onChange={event=>setFilters(current=>({...current,voucherNumber:event.target.value}))}/></SetupFormField>
        <SetupFormField label="From Voucher Date"><CalendarPicker value={filters.fromDate} placeholder="Select date" onChange={fromDate=>setFilters(current=>({...current,fromDate}))}/></SetupFormField>
        <SetupFormField label="To Voucher Date"><CalendarPicker value={filters.toDate} placeholder="Select date" onChange={toDate=>setFilters(current=>({...current,toDate}))}/></SetupFormField>
        <div className="flex gap-2"><Button type="submit"><span className="flex items-center gap-2"><Search className="size-4"/>Search</span></Button><Button type="button" variant="secondary" onClick={()=>{setFilters(emptyFilters);setApplied(emptyFilters)}}><span className="flex items-center gap-2"><X className="size-4"/>Clear</span></Button></div>
      </form>
    </Card>
    <Card><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="m-0 text-lg text-[#23464b]">All Vouchers</h2><p className="m-0 mt-1 text-xs text-[#657874]">{branch?`${branch.code} - ${branch.name}`:'Select a branch'} · Debit, Credit and Journal</p></div><span className="rounded-full bg-[#e2eee9] px-3 py-1 text-xs text-[#315f5c]">{rows.length} records</span></div><SkeletonBoundary loading={loading} fallback={<TableSkeleton columns={10} rows={7}/>} minimumDurationMs={250}><DataTable columns={columns} rows={rows} rowKey={r=>`${r.voucherClass}-${r.id}`} emptyMessage={branchId?'No vouchers match these filters.':'Select a branch to view vouchers.'}/></SkeletonBoundary></Card>
    <VoucherView voucher={viewing} onClose={()=>setViewing(null)}/>
    {editing&&<VoucherEditor companyId={companyId} branchId={branchId} initial={editing} onClose={()=>setEditing(null)} onSaved={async()=>{setEditing(null);await load();toast.success('Voucher updated.','Saved')}}/>}
    <Modal open={!!deleting} title="Delete Voucher" size="medium" onClose={()=>{if(!actionBusy)setDeleting(null)}}><p className="mt-0 text-sm text-[#405653]">Delete voucher <strong>{deleting?.voucherNumber}</strong>? This cannot be undone.</p><ModalActions><Button variant="secondary" disabled={actionBusy} onClick={()=>setDeleting(null)}>Cancel</Button><Button variant="danger" disabled={actionBusy} onClick={()=>void remove()}>{actionBusy?'Deleting...':'Delete'}</Button></ModalActions></Modal>
  </PageContainer>
}

function VoucherView({voucher,onClose}:{voucher:Voucher|null;onClose:()=>void}){
  const columns=useMemo<Column<VoucherLine>[]>(()=>[
    {key:'side',header:'Side',render:l=>l.side==='D'?'Debit':'Credit'},
    {key:'code',header:'Account Code',render:l=>[l.l1Code,l.l2Code,l.l3Code,l.l4Code,l.l5Code].join('.')},
    {key:'head',header:'Account Head',render:l=>l.accountHead},
    {key:'particulars',header:'Particulars',render:l=>l.particulars||'—'},
    {key:'amount',header:'Amount',align:'right',render:l=>money.format(l.amount)},
  ],[])
  if(!voucher)return null
  return <Modal open title={`${classLabel(voucher.voucherClass)} Voucher Details`} description={voucher.voucherNumber} size="xlarge" onClose={onClose}><dl className="grid gap-3 rounded-xl border border-[#cbded6] bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-4"><Detail label="Voucher No" value={voucher.voucherNumber}/><Detail label="Date" value={displayDate(voucher.voucherDate)}/><Detail label="Class / Type" value={`${classLabel(voucher.voucherClass)} / ${voucher.voucherType}`}/><Detail label="Status" value={voucher.status}/><Detail label="Branch" value={`${voucher.branchCode} - ${voucher.branchName}`}/><Detail label="Project" value={voucher.projectName}/><Detail label="Finance" value={voucher.financeName}/><Detail label="Component" value={voucher.componentName}/><div className="sm:col-span-2 lg:col-span-4"><Detail label="Particulars" value={voucher.particulars}/></div>{voucher.photo&&<Detail label="Photo" value={`${voucher.photo.name} (${Math.ceil(voucher.photo.size/1024)} KB)`}/>}</dl><div className="mt-4"><DataTable columns={columns} rows={voucher.lines} rowKey={line=>line.id}/></div><div className="mt-3 flex justify-end gap-6 text-sm text-[#294b4e]"><span>Debit: {money.format(voucher.totalDebit)}</span><span>Credit: {money.format(voucher.totalCredit)}</span></div><ModalActions><Button variant="secondary" onClick={onClose}>Close</Button></ModalActions></Modal>
}

function VoucherEditor({companyId,branchId,initial,onClose,onSaved}:{companyId:string;branchId:string;initial:Voucher;onClose:()=>void;onSaved:()=>Promise<void>}){
  const toast=useToast()
  const initialClass=initial.voucherClass.toLowerCase() as VoucherClass
  const makeDraft=():EntryDraft=>({voucherSetupId:initial.voucherSetupId,voucherDate:initial.voucherDate,voucherNumber:initial.voucherNumber,particulars:initial.particulars,lines:initial.lines.map(line=>({id:line.id,side:line.side,accountKey:[initial.coaId,line.l1Code,line.l2Code,line.l3Code,line.l4Code,line.l5Code].join('|'),l1Code:line.l1Code,l2Code:line.l2Code,l3Code:line.l3Code,l4Code:line.l4Code,l5Code:line.l5Code,particulars:line.particulars||'',amount:String(line.amount)}))})
  const [voucherClass,setVoucherClass]=useState<VoucherClass>(initialClass),[draft,setDraft]=useState<EntryDraft>(makeDraft)
  const [allOptions,setAllOptions]=useState<Partial<Record<VoucherClass,VoucherOptions>>>({}),[photo,setPhoto]=useState<File|null>(null),[removePhoto,setRemovePhoto]=useState(false)
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false)
  useEffect(()=>{let active=true;void Promise.all((['debit','credit','journal'] as VoucherClass[]).map(type=>voucherTransactionsApi.options(companyId,type))).then(values=>{if(active)setAllOptions({debit:values[0],credit:values[1],journal:values[2]})}).catch(reason=>toast.error(message(reason),'Voucher editor could not be loaded')).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[companyId,toast])
  const raw=allOptions[voucherClass]??{voucherSetups:[],accountHeads:[]},options={...raw,voucherSetups:raw.voucherSetups.filter(item=>item.branchId===branchId)}
  const reset=()=>{setVoucherClass(initialClass);setDraft(makeDraft());setPhoto(null);setRemovePhoto(false)}
  const save=async()=>{const validation=validateEntry(draft,options,photo);if(validation){toast.error(validation,'Voucher could not be saved');return}setBusy(true);try{const values=entryValues(draft,options);const lines=values.lines.map((line,index)=>{const old=initial.lines.find(item=>item.id===draft.lines[index]?.id);return {...line,bankCode:old?.bankCode??'',bankBranchCode:old?.bankBranchCode??'',chequeNumber:old?.chequeNumber??'',chequeDate:old?.chequeDate??null}});const request:VoucherFullUpdate={...values,lines,voucherClass,partyCode:initial.partyCode,paidTo:initial.paidTo,chequeNumber:initial.chequeNumber,chequeDate:initial.chequeDate,bankCode:initial.bankCode,bankBranchCode:initial.bankBranchCode,referenceBillNumber:initial.referenceBillNumber,referenceBillDate:initial.referenceBillDate,removePhoto,version:initial.version};await voucherTransactionsApi.fullUpdate(companyId,initialClass,initial.id,request,photo);await onSaved()}catch(reason){toast.error(message(reason),'Voucher could not be saved')}finally{setBusy(false)}}
  return <Modal open title="Edit Voucher" description="Change the voucher identity, attachment, or balanced accounting lines." size="xlarge" onClose={()=>{if(!busy)onClose()}}><SkeletonBoundary loading={loading} fallback={<TableSkeleton columns={4} rows={5}/>} minimumDurationMs={200}><div className="mb-4 max-w-sm"><SetupFormField label="Voucher Class"><SearchableSelect ariaLabel="Voucher Class" disabled={busy} value={voucherClass} options={[{value:'debit',label:'Debit'},{value:'credit',label:'Credit'},{value:'journal',label:'Journal'}]} onChange={value=>{setVoucherClass(value as VoucherClass);setDraft(current=>({...current,voucherSetupId:''}))}}/></SetupFormField></div><VoucherEntryForm companyId={companyId} voucherClass={voucherClass} draft={draft} options={options} photo={photo} existingPhoto={initial.photo} existingPhotoRemoved={removePhoto} disabled={busy} busy={busy} submitLabel="Save Changes" onChange={setDraft} onPhotoChange={value=>{setPhoto(value);if(value)setRemovePhoto(false)}} onExistingPhotoRemove={()=>{setRemovePhoto(true);setPhoto(null)}} onReset={reset} onSubmit={()=>void save()}/></SkeletonBoundary></Modal>
}

function Detail({label,value}:{label:string;value:string}){return <div><dt className="text-xs tracking-[.05em] text-[#657874] uppercase">{label}</dt><dd className="m-0 mt-1 text-sm text-[#203236]">{value||'—'}</dd></div>}

async function downloadVoucherPdf(voucher:Voucher,voucherClass:VoucherClass,companyName:string,loadPhoto:()=>Promise<Blob>){
  const {jsPDF}=await import('jspdf'),document=new jsPDF({unit:'mm',format:'a4'}),margin=14,pageWidth=document.internal.pageSize.getWidth()
  let y=16
  document.setFont('helvetica','bold');document.setFontSize(17);document.text(companyName||'AIMS',margin,y);y+=8
  document.setFontSize(14);document.text(`${classLabel(voucherClass)} Voucher`,margin,y);document.setFont('helvetica','normal');document.setFontSize(9);document.text(voucher.voucherNumber,pageWidth-margin,y,{align:'right'});y+=7
  const details=[`Date: ${displayDate(voucher.voucherDate)}`,`Type: ${voucher.voucherType} (${voucher.documentType})`,`Branch: ${voucher.branchCode} - ${voucher.branchName}`,`Project: ${voucher.projectName}   Finance: ${voucher.financeName}   Component: ${voucher.componentName}`]
  details.forEach(text=>{document.text(text,margin,y);y+=5});const particulars=document.splitTextToSize(`Particulars: ${voucher.particulars}`,pageWidth-margin*2);document.text(particulars,margin,y);y+=particulars.length*4+4
  const widths=[18,45,67,28],headers=['Side','Account code / head','Particulars','Amount'];document.setFillColor(224,238,232);document.rect(margin,y,widths.reduce((a,b)=>a+b,0),7,'F');let x=margin;headers.forEach((header,index)=>{document.text(header,x+2,y+4.7);x+=widths[index]!});y+=7
  document.setFontSize(8)
  for(const line of voucher.lines){const account=document.splitTextToSize(`${[line.l1Code,line.l2Code,line.l3Code,line.l4Code,line.l5Code].join('.')} - ${line.accountHead}`,widths[1]!-4),part=document.splitTextToSize(line.particulars||'',widths[2]!-4),height=Math.max(7,Math.max(account.length,part.length)*3.5+3);if(y+height>280){document.addPage();y=15}document.setDrawColor(217,228,223);document.rect(margin,y,widths.reduce((a,b)=>a+b,0),height);x=margin;document.text(line.side==='D'?'Debit':'Credit',x+2,y+4.5);x+=widths[0]!;document.text(account,x+2,y+4.5);x+=widths[1]!;document.text(part,x+2,y+4.5);x+=widths[2]!;document.text(money.format(line.amount),x+widths[3]!-2,y+4.5,{align:'right'});y+=height}
  y+=7;document.setFontSize(9);document.text(`Debit total: ${money.format(voucher.totalDebit)}    Credit total: ${money.format(voucher.totalCredit)}`,pageWidth-margin,y,{align:'right'})
  if(voucher.photo){try{const blob=await loadPhoto(),data=await blobDataUrl(blob);document.addPage();document.setFontSize(13);document.text('Voucher Attachment',margin,16);document.addImage(data,blob.type.includes('png')?'PNG':blob.type.includes('webp')?'WEBP':'JPEG',margin,24,180,245,undefined,'FAST')}catch{document.setFontSize(8);document.text(`Attachment: ${voucher.photo.name} (could not be embedded)`,margin,y+7)}}
  document.save(`voucher-${voucher.voucherNumber.replace(/[^a-z0-9_-]+/gi,'-')}.pdf`)
}

function blobDataUrl(blob:Blob){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)})}
