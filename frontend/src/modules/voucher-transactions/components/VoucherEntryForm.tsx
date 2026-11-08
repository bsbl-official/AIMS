import { ImagePlus, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AccountHeadOption, VoucherClass, VoucherCreate, VoucherOptions, VoucherSide } from '../voucher-transactions.types'
import { Button } from '../../../shared/components/Button'
import { CalendarPicker } from '../../../shared/components/CalendarPicker'
import { SetupFormField, SetupInput, setupInputClass } from '../../../shared/components/forms/SetupFormField'
import { SearchableSelect } from '../../../shared/components/SearchableSelect'
import { TableActionButton } from '../../../shared/components/TableActionButton'
import { AddRowButton } from '../../../shared/components/AddRowButton'
import { voucherTransactionsApi } from '../api/voucher-transactions.api'

export type EntryLine = { id:string; side:VoucherSide; accountKey:string; l1Code:string; l2Code:string; l3Code:string; l4Code:string; l5Code:string; particulars:string; amount:string }
export type EntryDraft = { voucherSetupId:string; voucherDate:string; voucherNumber:string; particulars:string; lines:EntryLine[] }

const money=new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})
const key=(head:AccountHeadOption)=>[head.coaId,head.l1Code,head.l2Code,head.l3Code,head.l4Code,head.l5Code].join('|')
const code=(head:AccountHeadOption)=>[head.l1Code,head.l2Code,head.l3Code,head.l4Code,head.l5Code].join('.')

export function emptyEntryDraft():EntryDraft {
  const date=new Date()
  return {voucherSetupId:'',voucherDate:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,voucherNumber:'',particulars:'',lines:[]}
}

export function validateEntry(draft:EntryDraft,options:VoucherOptions,photo:File|null) {
  const setup=options.voucherSetups.find((item)=>item.id===draft.voucherSetupId)
  if(!setup) return 'Select a voucher type.'
  if(!draft.voucherDate) return 'Select a voucher date.'
  if(!setup.autoVoucher&&(!draft.voucherNumber.trim()||/^[DCJ]$/i.test(draft.voucherNumber.trim()))) return 'Enter a voucher number.'
  if(!draft.particulars.trim()) return 'Enter particulars.'
  const debit=draft.lines.filter((line)=>line.side==='D'),credit=draft.lines.filter((line)=>line.side==='C')
  if(!debit.length||!credit.length) return 'Add at least one debit entry and one credit entry.'
  if(draft.lines.some((line)=>!line.accountKey)) return 'Select an account head for every entry.'
  if(draft.lines.some((line)=>!/^\d+(\.\d{1,2})?$/.test(line.amount)||Number(line.amount)<=0||Number(line.amount)>9_999_999_999_999.99)) return 'Enter positive amounts with no more than two decimal places.'
  if(Math.round(total(debit)*100)!==Math.round(total(credit)*100)) return 'Total debit and total credit must be equal.'
  if(photo&&(!['image/jpeg','image/png','image/webp'].includes(photo.type)||photo.size>5*1024*1024)) return 'Voucher photo must be a JPEG, PNG, or WebP image no larger than 5 MB.'
  return ''
}

export function entryValues(draft:EntryDraft,options:VoucherOptions):VoucherCreate {
  const setup=options.voucherSetups.find((item)=>item.id===draft.voucherSetupId)!
  return {voucherSetupId:draft.voucherSetupId,voucherDate:draft.voucherDate,voucherNumber:setup.autoVoucher?null:draft.voucherNumber.trim(),particulars:draft.particulars.trim(),partyCode:null,paidTo:null,chequeNumber:null,chequeDate:null,bankCode:null,bankBranchCode:null,referenceBillNumber:null,referenceBillDate:null,lines:draft.lines.map((line)=>({side:line.side,l1Code:line.l1Code,l2Code:line.l2Code,l3Code:line.l3Code,l4Code:line.l4Code,l5Code:line.l5Code,particulars:line.particulars.trim(),amount:Number(line.amount),bankCode:'',bankBranchCode:'',chequeNumber:'',chequeDate:null}))}
}

export function VoucherEntryForm({companyId,draft,options,photo,voucherClass,existingPhoto,existingPhotoRemoved=false,disabled,busy,submitLabel='Submit',onChange,onPhotoChange,onExistingPhotoRemove,onReset,onSubmit}:{companyId:string;draft:EntryDraft;options:VoucherOptions;photo:File|null;voucherClass:VoucherClass;existingPhoto?:{name:string;contentType:string;size:number}|null;existingPhotoRemoved?:boolean;disabled:boolean;busy:boolean;submitLabel?:string;onChange:(draft:EntryDraft)=>void;onPhotoChange:(photo:File|null)=>void;onExistingPhotoRemove?:()=>void;onReset:()=>void;onSubmit:()=>void}) {
  const setup=options.voucherSetups.find((item)=>item.id===draft.voucherSetupId)
  const prefix=voucherClass==='debit'?'D':voucherClass==='credit'?'C':voucherClass==='journal'?'J':''
  const numberValue=prefix&&draft.voucherNumber.toUpperCase().startsWith(prefix)?draft.voucherNumber.slice(1):draft.voucherNumber
  const [numberPreview,setNumberPreview]=useState(''),[previewLoading,setPreviewLoading]=useState(false)
  useEffect(()=>{
    if(!companyId||!setup?.autoVoucher||!draft.voucherDate||draft.voucherNumber){setNumberPreview('');setPreviewLoading(false);return}
    let active=true
    setNumberPreview('');setPreviewLoading(true)
    void voucherTransactionsApi.numberPreview(companyId,voucherClass,setup.id,draft.voucherDate)
      .then((result)=>{if(active)setNumberPreview(result.voucherNumber)})
      .catch(()=>{if(active)setNumberPreview('')})
      .finally(()=>{if(active)setPreviewLoading(false)})
    return()=>{active=false}
  },[companyId,draft.voucherDate,draft.voucherNumber,setup?.autoVoucher,setup?.id,voucherClass])
  const heads=useMemo(()=>options.accountHeads.filter((head)=>setup&&head.coaId===setup.coaId),[options.accountHeads,setup])
  const change=(values:Partial<EntryDraft>)=>onChange({...draft,...values})
  const add=(side:VoucherSide)=>change({lines:[...draft.lines,{id:crypto.randomUUID(),side,accountKey:'',l1Code:'',l2Code:'',l3Code:'',l4Code:'',l5Code:'',particulars:'',amount:''}]})
  const debit=draft.lines.filter((line)=>line.side==='D'),credit=draft.lines.filter((line)=>line.side==='C')
  return <div className="grid gap-4">
    <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
      <SetupFormField label="Voucher Date"><CalendarPicker disabled={disabled} value={draft.voucherDate} onChange={(voucherDate)=>change({voucherDate,voucherNumber:setup?.autoVoucher?'':draft.voucherNumber})}/></SetupFormField>
      <SetupFormField label="Voucher Type"><SearchableSelect disabled={disabled} ariaLabel="Voucher Type" value={draft.voucherSetupId} placeholder="Select voucher type" options={options.voucherSetups.map((item)=>({value:item.id,label:`${item.voucherType} - ${item.description}`,description:`${item.branchCode} · ${item.projectName} · ${item.financeName} · ${item.componentName}`}))} onChange={(voucherSetupId)=>change({voucherSetupId,voucherNumber:'',lines:[]})}/></SetupFormField>
      <SetupFormField label="Voucher No">{!setup?<SetupInput disabled value="" placeholder="Select voucher type first"/>:setup.autoVoucher?<SetupInput disabled value={draft.voucherNumber||numberPreview} placeholder={previewLoading?'Loading preview...':'Auto-generated on save'}/>:<div className="flex min-h-[43px] overflow-hidden rounded-lg border border-[#ccd5d0] bg-white focus-within:border-[#347077] focus-within:shadow-[0_0_0_3px_rgba(52,112,119,.12)]"><span className="grid w-11 shrink-0 place-items-center border-r border-[#ccd5d0] bg-[#edf4f1] text-sm font-semibold text-[#315f5c]">{prefix}</span><SetupInput disabled={disabled} className="min-h-[41px] rounded-none border-0 shadow-none focus:shadow-none" maxLength={prefix?19:20} placeholder="Enter voucher number" value={numberValue} onChange={(event)=>change({voucherNumber:`${prefix}${event.target.value}`})}/></div>}</SetupFormField>
      <div className="md:col-span-2 lg:col-span-2"><SetupFormField label="Particulars"><textarea disabled={disabled} className={`${setupInputClass} h-[104px] resize-none`} maxLength={200} placeholder="Enter particulars here" value={draft.particulars} onChange={(event)=>change({particulars:event.target.value})}/></SetupFormField></div>
      <div className="md:col-span-2 lg:col-span-1"><PhotoPicker disabled={disabled} photo={photo} existingPhoto={existingPhotoRemoved?null:existingPhoto} onRemoveExisting={onExistingPhotoRemove} onChange={onPhotoChange}/></div>
    </div>
    <EntrySection title="Debit Entries" side="D" lines={debit} heads={heads} disabled={disabled} onAdd={()=>add('D')} onChange={(line)=>change({lines:draft.lines.map((item)=>item.id===line.id?line:item)})} onRemove={(id)=>change({lines:draft.lines.filter((item)=>item.id!==id)})}/>
    <EntrySection title="Credit Entries" side="C" lines={credit} heads={heads} disabled={disabled} onAdd={()=>add('C')} onChange={(line)=>change({lines:draft.lines.map((item)=>item.id===line.id?line:item)})} onRemove={(id)=>change({lines:draft.lines.filter((item)=>item.id!==id)})}/>
    <div className="flex justify-center gap-2"><Button variant="secondary" disabled={disabled||busy} onClick={onReset}>Reset</Button><Button disabled={disabled||busy} onClick={onSubmit}>{busy?'Saving...':submitLabel}</Button></div>
  </div>
}

function PhotoPicker({photo,existingPhoto,disabled,onChange,onRemoveExisting}:{photo:File|null;existingPhoto?:{name:string;contentType:string;size:number}|null;disabled:boolean;onChange:(photo:File|null)=>void;onRemoveExisting?:()=>void}) {
  const input=useRef<HTMLInputElement>(null),[preview,setPreview]=useState('')
  useEffect(()=>{if(!photo){setPreview('');return}const url=URL.createObjectURL(photo);setPreview(url);return()=>URL.revokeObjectURL(url)},[photo])
  if(existingPhoto&&!photo)return <div className="grid min-w-0 grid-rows-[auto_1fr] gap-[7px]"><p className="m-0 text-[13px] font-medium text-[#405653]">Voucher Photo <span className="font-normal text-[#7b8986]">(optional)</span></p><input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={(event)=>onChange(event.target.files?.[0]??null)}/><div className="flex h-[104px] items-center justify-between gap-3 rounded-lg border border-[#c5d8d0] bg-white/80 px-4"><div className="min-w-0"><p className="m-0 truncate text-sm text-[#24484c]">{existingPhoto.name}</p><p className="m-0 mt-1 text-xs text-[#758682]">{Math.ceil(existingPhoto.size/1024)} KB attached</p></div><div className="flex gap-2"><button type="button" disabled={disabled} className="cursor-pointer rounded-md border border-[#bfd2ca] bg-[#e8f1ed] px-2 py-1 text-xs text-[#244247]" onClick={()=>input.current?.click()}>Replace</button><button type="button" disabled={disabled} className="grid size-7 cursor-pointer place-items-center rounded-md bg-red-50 text-red-600" onClick={onRemoveExisting} aria-label="Remove existing voucher photo"><X className="size-4"/></button></div></div></div>
  return <div className="grid min-w-0 grid-rows-[auto_1fr] gap-[7px]"><p className="m-0 truncate text-[13px] font-medium text-[#405653]" title="Optional JPEG, PNG or WebP, maximum 5 MB">Voucher Photo <span className="font-normal text-[#7b8986]">(optional)</span></p><input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={(event)=>onChange(event.target.files?.[0]??null)}/>{photo?<div className="group relative h-[104px] overflow-hidden rounded-lg border border-[#c5d8d0] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,.75)]"><img className="h-full w-full object-contain" src={preview} alt="Voucher preview"/><div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-[linear-gradient(transparent,rgba(16,42,45,.78))] px-2 pt-5 pb-1.5"><button type="button" disabled={disabled} className="cursor-pointer rounded-md border border-white/35 bg-white/90 px-2 py-1 text-[11px] text-[#24484c] shadow hover:bg-white disabled:cursor-not-allowed disabled:opacity-60" onClick={()=>input.current?.click()}>Replace</button><button type="button" disabled={disabled} className="grid size-6 cursor-pointer place-items-center rounded-md border border-white/25 bg-[#a94b42] text-white shadow hover:bg-[#8f3b34] disabled:cursor-not-allowed disabled:opacity-60" onClick={()=>{onChange(null);if(input.current)input.current.value=''}} aria-label="Remove voucher photo"><X className="size-3.5"/></button></div></div>:<button type="button" disabled={disabled} className="grid h-[104px] w-full cursor-pointer place-items-center rounded-lg border border-dashed border-[#9dbdb2] bg-[linear-gradient(145deg,rgba(255,255,255,.8),rgba(231,243,238,.76))] px-3 text-center text-[#315f5c] transition hover:border-[#6f9f91] hover:bg-[#eaf3ef] focus:outline-none focus:ring-3 focus:ring-[#347077]/15 disabled:cursor-not-allowed disabled:opacity-60" onClick={()=>input.current?.click()}><span className="flex items-center justify-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e0eee8] text-[#2f716d]"><ImagePlus className="size-4.5"/></span><span className="text-left"><span className="block text-sm font-medium">Upload photo</span><span className="block text-[10px] leading-4 text-[#758682]">JPEG, PNG or WebP · Max 5 MB</span></span></span></button>}</div>
}

function EntrySection({title,side,lines,heads,disabled,onAdd,onChange,onRemove}:{title:string;side:VoucherSide;lines:EntryLine[];heads:AccountHeadOption[];disabled:boolean;onAdd:()=>void;onChange:(line:EntryLine)=>void;onRemove:(id:string)=>void}) {
  return <section className="rounded-xl border border-[#cbded6] bg-white/75"><div className="border-b border-[#dce8e3] px-4 py-3"><h2 className="m-0 text-sm font-semibold text-[#23464b]">{title}</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-[13px]"><thead className="bg-[#edf4f1]"><tr>{['Account Head','Particulars','Amount','Actions'].map((header)=><th key={header} className={`border-b border-[#dce8e3] px-3 py-2 text-left text-[11px] font-semibold tracking-[.04em] text-[#315f5c] uppercase ${header==='Amount'?'text-right':''}`}>{header}</th>)}</tr></thead><tbody>{lines.map((line)=><EntryRow key={line.id} line={line} heads={heads} disabled={disabled} onChange={onChange} onRemove={()=>onRemove(line.id)}/>) }{!lines.length&&<tr><td colSpan={4} className="h-20 text-center text-[#87938f]">No data</td></tr>}<tr><td colSpan={4} className="border-t border-[#dce8e3] p-2"><AddRowButton disabled={disabled} onClick={onAdd}>Add Voucher Row</AddRowButton></td></tr></tbody><tfoot><tr><td colSpan={4} className="border-t border-[#dce8e3] px-4 py-3 text-sm font-semibold text-[#23464b]">Total {side==='D'?'Debit':'Credit'}: {money.format(total(lines))}</td></tr></tfoot></table></div></section>
}

function EntryRow({line,heads,disabled,onChange,onRemove}:{line:EntryLine;heads:AccountHeadOption[];disabled:boolean;onChange:(line:EntryLine)=>void;onRemove:()=>void}) {
  return <tr><td className="min-w-80 border-b border-[#e4ece8] p-2"><SearchableSelect disabled={disabled} ariaLabel="Account Head" value={line.accountKey} placeholder="Select account code and head" searchPlaceholder="Search account code or name..." options={heads.map((head)=>({value:key(head),label:`${code(head)} - ${head.name}`}))} onChange={(value)=>{const head=heads.find((item)=>key(item)===value);if(head)onChange({...line,accountKey:value,l1Code:head.l1Code,l2Code:head.l2Code,l3Code:head.l3Code,l4Code:head.l4Code,l5Code:head.l5Code})}}/></td><td className="min-w-64 border-b border-[#e4ece8] p-2"><input disabled={disabled} aria-label="Entry particulars" className={setupInputClass} maxLength={100} value={line.particulars} onChange={(event)=>onChange({...line,particulars:event.target.value})}/></td><td className="w-44 border-b border-[#e4ece8] p-2"><input disabled={disabled} aria-label="Entry amount" className={`${setupInputClass} text-right tabular-nums`} type="number" min="0.01" step="0.01" value={line.amount} onChange={(event)=>onChange({...line,amount:event.target.value})}/></td><td className="w-20 border-b border-[#e4ece8] p-2"><TableActionButton disabled={disabled} label="Delete entry" tone="danger" onClick={onRemove}><Trash2 className="size-4"/></TableActionButton></td></tr>
}

function total(lines:EntryLine[]){return lines.reduce((sum,line)=>sum+(Number(line.amount)||0),0)}
