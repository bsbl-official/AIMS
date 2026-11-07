import { request } from '../../shared/api/httpClient'

export type AccountRow = Record<string, string | number | null>
export type AccountValues = Record<string, string>
export type ReportOption = { report_code: string; layer2_code: string; layer2_desc: string }
export type Category = { category_code: string; category_desc: string }
export type AccountField = { key: string; label: string; max?: number; reports?: string[]; flag?: boolean; date?: boolean }
export const layerNames = ['Root Layer', 'Group Layer', 'Control Layer', 'Sub Layer', 'Sub Sub Layer']
export const accountTypes = [{value:'L',label:'Liabilities'}, {value:'A',label:'Assets'}, {value:'I',label:'Income'}, {value:'E',label:'Expense'}]
export const accountGroups = [{value:'B',label:'Bank'}, {value:'C',label:'Cash'}, {value:'O',label:'Other'}]
const field = (key: string, label: string, max = 10): AccountField => ({key,label,max})
const flag = (key: string, label: string): AccountField => ({key,label,flag:true})
const report = (key: string, label: string, reports: string[]): AccountField => ({key,label,reports})
export const headFields: AccountField[] = [
  report('bs_is_code','BS / IS code',['BS','IS']), {key:'creation_dt',label:'Creation date',date:true},
  flag('retain_earning_flag','Retained earnings'), flag('closing_stock_flag','Closing stock'), flag('opening_stock_flag','Opening stock'),
  field('party_code','Party code',6), report('rp_dr_code','RP debit code',['RP']), report('rp_cr_code','RP credit code',['RP']),
  report('cf_code','Cash flow code',['CF']), field('ratio_indicator','Ratio indicator',20), field('cg_opb_code','CG opening balance code'),
  field('cg_dr_code','CG debit code'), field('cg_cr_code','CG credit code'), field('cg_code','CG code'),
  report('bs_is_code1','BS / IS code 1',['BS','IS']), report('cf_dr_code','CF debit code',['CF']), report('cf_cr_code','CF credit code',['CF']),
  field('bv_code','BV code'), field('bs_is_dr_pk_code','BS / IS debit PK code',12), field('bs_is_cr_pk_code','BS / IS credit PK code',12),
  field('rp_dr_pk_code','RP debit PK code',12), field('rp_cr_pk_code','RP credit PK code',12), field('bv_dr_code','BV debit code'),
  field('bv_cr_code','BV credit code'), flag('br_flag','BR flag'),
]
export const codeKey = (level: number) => `l${level}_code`
export const descriptionKey = (level: number) => level === 5 ? 'acchead' : `l${level}_desc`
export const keyFields = (level: number): AccountField[] => Array.from({length:level}, (_,i) => field(codeKey(i+1),`${layerNames[i]} code`,i<2?6:10))
export const editableFields = (level: number): AccountField[] => [
  field(descriptionKey(level),level===5?'Account Head Name':`${layerNames[level-1]} Name`,100),
  ...(level>=3?[field('acctype','Account type',1),field('accgroup','Account group',1)]:[]),
  ...(level<5?[flag('device_flage','Device flag')]:[]), ...(level===2?[field('category_code','Category',6)]:[]),
  ...(level===3?[field('acc_spl_group','Special account group',2)]:[]), ...(level===5?headFields:[]),
]
export const allFields = (level: number): AccountField[] => [
  field('company_code','Company code'),field('coa_id','Initial COA ID'),...keyFields(level),...editableFields(level),
  field('ins_user','Created by'),field('ins_date','Created at'),field('upd_user','Updated by'),field('upd_date','Updated at'),
]
export const rowKey = (row: AccountRow, level: number) => JSON.stringify(keyFields(level).map(f=>row[f.key]))
export const defaultColumns = ['l5_code','acchead','acctype','accgroup','bs_is_code']
export function reportChoices(options: ReportOption[], reports: string[]) {
  const byCode = new Map<string,string[]>()
  options.filter(o=>reports.includes(o.report_code)).forEach(o=>{
    const labels=byCode.get(o.layer2_code) ?? []
    labels.push(`${o.report_code}: ${o.layer2_desc}`)
    byCode.set(o.layer2_code,labels)
  })
  return [...byCode].map(([value,labels])=>({value,label:`${value} - ${labels.join(' / ')}`}))
}
export const accountLayerApi = {
  list: (company:string, coa:string, level:number, signal?:AbortSignal) => request<AccountRow[]>(`/companies/${company}/account-layers/${level}?coaId=${encodeURIComponent(coa)}`,{signal}),
  reports: (company:string, signal?:AbortSignal) => request<ReportOption[]>(`/companies/${company}/account-layers/report-options`,{signal}),
  categories: (company:string, signal?:AbortSignal) => request<Category[]>(`/companies/${company}/account-layers/categories`,{signal}),
  createCategory: (company:string, values:Category) => request<Category>(`/companies/${company}/account-layers/categories`,{method:'POST',body:JSON.stringify(values)}),
  save: (company:string, coa:string, level:number, values:AccountValues, editing:boolean) => request<AccountRow>(`/companies/${company}/account-layers/${level}?coaId=${encodeURIComponent(coa)}`,{method:editing?'PUT':'POST',body:JSON.stringify(values)}),
  saveBatch: (company:string, coa:string, level:number, values:AccountValues[]) => request<AccountRow[]>(`/companies/${company}/account-layers/${level}/batch?coaId=${encodeURIComponent(coa)}`,{method:'POST',body:JSON.stringify(values)}),
  remove: (company:string, coa:string, level:number, row:AccountRow) => request<void>(`/companies/${company}/account-layers/${level}?coaId=${encodeURIComponent(coa)}`,{method:'DELETE',body:JSON.stringify(row)}),
}
