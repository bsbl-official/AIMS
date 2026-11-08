import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../modules/auth/hooks/useAuth'
import { useOrganizationContext, useOrganizationDirty } from '../../modules/organization-context/useOrganizationContext'
import { useToast } from '../../modules/toast/hooks/useToast'
import { voucherTransactionsApi } from '../../modules/voucher-transactions/api/voucher-transactions.api'
import { emptyEntryDraft, entryValues, validateEntry, VoucherEntryForm, type EntryDraft } from '../../modules/voucher-transactions/components/VoucherEntryForm'
import type { VoucherOptions } from '../../modules/voucher-transactions/voucher-transactions.types'
import { ApiError } from '../../shared/api/httpClient'
import { Card } from '../../shared/components/Card'
import { PageContainer } from '../../shared/components/PageContainer'

const emptyOptions:VoucherOptions={voucherSetups:[],accountHeads:[]}
const message=(reason:unknown)=>reason instanceof ApiError?reason.message:'Unable to complete the request.'

export function JournalVoucherPage(){
  const {can}=useAuth(),toast=useToast(),canView=can('journal.read')||can('journal.create'),canCreate=can('journal.create')
  const {companyId,branchId}=useOrganizationContext();const [options,setOptions]=useState<VoucherOptions>(emptyOptions)
  const [draft,setDraft]=useState<EntryDraft>(emptyEntryDraft),[photo,setPhoto]=useState<File|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const load=useCallback(async()=>{if(!companyId||!branchId){setOptions(emptyOptions);setLoading(false);return}setLoading(true);setError('');try{const next=await voucherTransactionsApi.options(companyId,'journal');setOptions({...next,voucherSetups:next.voucherSetups.filter((item)=>item.branchId===branchId)})}catch(reason){setError(message(reason))}finally{setLoading(false)}},[branchId,companyId])
  useEffect(()=>{if(canView)void load();else setLoading(false)},[canView,load]);useOrganizationDirty(Boolean(photo||draft.voucherSetupId||draft.particulars||draft.lines.length))
  const reset=()=>{setDraft(emptyEntryDraft());setPhoto(null);setError('')}
  const submit=async()=>{const validation=validateEntry(draft,options,photo);if(validation){setError(validation);return}setBusy(true);setError('');try{const saved=await voucherTransactionsApi.create(companyId,'journal',entryValues(draft,options),photo);toast.success(`Journal Voucher ${saved.voucherNumber} created.`,'Created');reset()}catch(reason){const text=message(reason);setError(text);toast.error(text,'Journal Voucher was not created')}finally{setBusy(false)}}
  const crumbs=[{label:'Dashboard',to:'/'},{label:'Transactions'},{label:'Journal Voucher'}]
  if(!canView)return <PageContainer title="Access denied" breadcrumbs={crumbs}><Card>You do not have access to Journal Voucher.</Card></PageContainer>
  return <PageContainer title="Journal Voucher" breadcrumbs={crumbs}>{error&&<p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}<Card><VoucherEntryForm companyId={companyId} voucherClass="journal" draft={draft} options={options} photo={photo} disabled={!canCreate||loading||!branchId} busy={busy} onChange={setDraft} onPhotoChange={setPhoto} onReset={reset} onSubmit={()=>void submit()}/></Card></PageContainer>
}
