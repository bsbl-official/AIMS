import { request } from '../../../shared/api/httpClient'
import type { Voucher, VoucherClass, VoucherCreate, VoucherOptions, VoucherSummary, VoucherUpdate } from '../voucher-transactions.types'

const root=(company:string,type:VoucherClass)=>`/companies/${company}/vouchers/${type}`
export const voucherTransactionsApi={
  options:(company:string,type:VoucherClass)=>request<VoucherOptions>(`${root(company,type)}/options`),
  list:(company:string,type:VoucherClass,filters:{voucherNumber?:string;fromDate?:string;toDate?:string})=>{
    const query=new URLSearchParams(Object.entries(filters).filter(([,value])=>value).map(([key,value])=>[key,value!]))
    return request<VoucherSummary[]>(`${root(company,type)}?${query}`)
  },
  get:(company:string,type:VoucherClass,id:string)=>request<Voucher>(`${root(company,type)}/${id}`),
  create:(company:string,type:VoucherClass,values:VoucherCreate,photo?:File|null)=>{
    if (!photo) return request<Voucher>(root(company,type),{method:'POST',body:JSON.stringify(values)})
    const body=new FormData()
    body.append('voucher',new Blob([JSON.stringify(values)],{type:'application/json'}))
    body.append('photo',photo)
    return request<Voucher>(root(company,type),{method:'POST',body})
  },
  photoUrl:(company:string,type:VoucherClass,id:string)=>`${root(company,type)}/${id}/photo`,
  update:(company:string,type:VoucherClass,id:string,values:VoucherUpdate)=>request<Voucher>(`${root(company,type)}/${id}`,{method:'PUT',body:JSON.stringify(values)}),
  remove:(company:string,type:VoucherClass,id:string)=>request<void>(`${root(company,type)}/${id}`,{method:'DELETE'}),
}
