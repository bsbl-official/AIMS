import { useState, type FormEvent, type ReactNode } from 'react'
import type {
  GroupFormValues, LayerFormValues, ReportFormValues, SpecificationFormValues,
} from '../../../modules/financial-statement/financial-statement.types'
import { useToast } from '../../../modules/toast/hooks/useToast'
import { ApiError } from '../../api/httpClient'
import { Button } from '../Button'
import { SearchableSelect } from '../SearchableSelect'
import { SetupFormField, SetupInput } from '../forms/SetupFormField'

const SIGN_OPTIONS = [
  { value: '', label: 'No sign' },
  { value: '+', label: 'Plus (+)' },
  { value: '-', label: 'Minus (-)' },
]
const FLAG_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'Y', label: 'Yes' },
  { value: 'N', label: 'No' },
]

function Actions({ saving, onCancel, submitLabel = 'Create' }: { saving: boolean; onCancel: () => void; submitLabel?: string }) {
  return <div className="flex justify-end gap-2.5 pt-2 md:col-span-2">
    <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
    <Button type="submit" disabled={saving}>{saving ? 'Saving...' : submitLabel}</Button>
  </div>
}

function useSubmit<T>(onSave: (values: T) => Promise<void>) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const submit = async (event: FormEvent, values: T) => {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave(values)
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : 'Unable to save this statement item.', 'Financial statement setup was not saved')
    } finally {
      setSaving(false)
    }
  }
  return { saving, submit }
}

export function ReportForm({ initialValues, onSave, onCancel }: { initialValues?: ReportFormValues; onSave: (values: ReportFormValues) => Promise<void>; onCancel: () => void }) {
  const [values, setValues] = useState<ReportFormValues>(initialValues ?? { reportCode: '', reportDescription: '', summaryLabel: '' })
  const { saving, submit } = useSubmit(onSave)
  return <form className="grid grid-cols-2 gap-4 max-md:grid-cols-1" onSubmit={(event) => void submit(event, values)}>
    <SetupFormField label="Report code"><SetupInput value={values.reportCode} onChange={(event) => setValues({ ...values, reportCode: code(event.target.value) })} pattern="[A-Za-z0-9]+" maxLength={2} required disabled={Boolean(initialValues)} /></SetupFormField>
    <SetupFormField label="Report description"><SetupInput value={values.reportDescription} onChange={(event) => setValues({ ...values, reportDescription: event.target.value })} maxLength={100} required /></SetupFormField>
    <SetupFormField label="Report summary label" fullWidth><SetupInput value={values.summaryLabel} onChange={(event) => setValues({ ...values, summaryLabel: event.target.value })} maxLength={100} /></SetupFormField>
    <Actions saving={saving} onCancel={onCancel} submitLabel={initialValues ? 'Save changes' : 'Create'} />
  </form>
}

export function GroupForm({ parent, initialValues, onSave, onCancel }: { parent: string; initialValues?: GroupFormValues; onSave: (values: GroupFormValues) => Promise<void>; onCancel: () => void }) {
  const [values, setValues] = useState<GroupFormValues>(initialValues ?? { groupCode: '', groupDescription: '', summaryLabel: '' })
  const { saving, submit } = useSubmit(onSave)
  return <form className="grid grid-cols-2 gap-4 max-md:grid-cols-1" onSubmit={(event) => void submit(event, values)}>
    <ParentNotice>Report: {parent}</ParentNotice>
    <SetupFormField label="Group code"><SetupInput value={values.groupCode} onChange={(event) => setValues({ ...values, groupCode: code(event.target.value) })} pattern="[A-Za-z0-9]+" maxLength={3} required disabled={Boolean(initialValues)} /></SetupFormField>
    <SetupFormField label="Group description"><SetupInput value={values.groupDescription} onChange={(event) => setValues({ ...values, groupDescription: event.target.value })} maxLength={100} required /></SetupFormField>
    <SetupFormField label="Group summary label" fullWidth><SetupInput value={values.summaryLabel} onChange={(event) => setValues({ ...values, summaryLabel: event.target.value })} maxLength={100} /></SetupFormField>
    <Actions saving={saving} onCancel={onCancel} submitLabel={initialValues ? 'Save changes' : 'Create'} />
  </form>
}

export function LayerForm({ parent, initialValues, onSave, onCancel }: { parent: string; initialValues?: LayerFormValues; onSave: (values: LayerFormValues) => Promise<void>; onCancel: () => void }) {
  const [values, setValues] = useState<LayerFormValues>(initialValues ?? { layerCode: '', layerDescription: '', summaryLabel: '', sign: '' })
  const { saving, submit } = useSubmit(onSave)
  return <form className="grid grid-cols-2 gap-4 max-md:grid-cols-1" onSubmit={(event) => void submit(event, values)}>
    <ParentNotice>Group: {parent}</ParentNotice>
    <SetupFormField label="Layer 1 code"><SetupInput value={values.layerCode} onChange={(event) => setValues({ ...values, layerCode: code(event.target.value) })} pattern="[A-Za-z0-9]+" maxLength={3} required disabled={Boolean(initialValues)} /></SetupFormField>
    <SetupFormField label="Layer 1 description"><SetupInput value={values.layerDescription} onChange={(event) => setValues({ ...values, layerDescription: event.target.value })} maxLength={100} required /></SetupFormField>
    <SetupFormField label="Summary label"><SetupInput value={values.summaryLabel} onChange={(event) => setValues({ ...values, summaryLabel: event.target.value })} maxLength={100} /></SetupFormField>
    <SetupFormField label="Sign"><SearchableSelect ariaLabel="Layer sign" value={values.sign} options={SIGN_OPTIONS} onChange={(sign) => setValues({ ...values, sign })} /></SetupFormField>
    <Actions saving={saving} onCancel={onCancel} submitLabel={initialValues ? 'Save changes' : 'Create'} />
  </form>
}

const emptySpecification: SpecificationFormValues = {
  specificationCode: '', specificationDescription: '', reportType: '', groupSign: '', sign: '', noteId: '',
  retainEarningFlag: '', reportShort: '', cashFlowFlag: '', receiptPaymentFlag: '', ratioParameter: '',
  liquidCashFlag: '', savingsFlag: '', debtFlag: '', principalPaidFlag: '', serviceChargePaidFlag: '',
  currentAssetFlag: '', currentLiabilityFlag: '', splitFigureFlag: '', combineFlag: '', specificationCodeDummy: '',
}

const flagFields: { key: keyof SpecificationFormValues; label: string }[] = [
  { key: 'retainEarningFlag', label: 'Retained earning' },
  { key: 'liquidCashFlag', label: 'Liquid cash' },
  { key: 'savingsFlag', label: 'Savings' },
  { key: 'debtFlag', label: 'Debt' },
  { key: 'principalPaidFlag', label: 'Principal paid' },
  { key: 'serviceChargePaidFlag', label: 'Service charge paid' },
  { key: 'currentAssetFlag', label: 'Current asset' },
  { key: 'currentLiabilityFlag', label: 'Current liability' },
  { key: 'splitFigureFlag', label: 'Split figure' },
  { key: 'combineFlag', label: 'Combine' },
]

export function SpecificationForm({ parent, initialValues, onSave, onCancel }: { parent: string; initialValues?: SpecificationFormValues; onSave: (values: SpecificationFormValues) => Promise<void>; onCancel: () => void }) {
  const [values, setValues] = useState<SpecificationFormValues>(initialValues ?? emptySpecification)
  const { saving, submit } = useSubmit(onSave)
  const set = (key: keyof SpecificationFormValues, value: string) => setValues((current) => ({ ...current, [key]: value }))
  return <form className="grid grid-cols-2 gap-4 max-md:grid-cols-1" onSubmit={(event) => void submit(event, values)}>
    <ParentNotice>Layer 1: {parent}</ParentNotice>
    <SetupFormField label="Layer 2 code"><SetupInput value={values.specificationCode} onChange={(event) => set('specificationCode', code(event.target.value))} pattern="[A-Za-z0-9]+" maxLength={6} required disabled={Boolean(initialValues)} /></SetupFormField>
    <SetupFormField label="Layer 2 description"><SetupInput value={values.specificationDescription} onChange={(event) => set('specificationDescription', event.target.value)} maxLength={100} required /></SetupFormField>
    <SetupFormField label="Layer 2 sign"><SearchableSelect ariaLabel="Layer 2 sign" value={values.sign} options={SIGN_OPTIONS} onChange={(value) => set('sign', value)} /></SetupFormField>
    <SetupFormField label="Group sign"><SearchableSelect ariaLabel="Group sign" value={values.groupSign} options={SIGN_OPTIONS} onChange={(value) => set('groupSign', value)} /></SetupFormField>
    <SetupFormField label="Report type"><SetupInput value={values.reportType} onChange={(event) => set('reportType', event.target.value.toUpperCase())} maxLength={1} required disabled={Boolean(initialValues)} /></SetupFormField>
    <SetupFormField label="Note ID"><SetupInput value={values.noteId} onChange={(event) => set('noteId', digits(event.target.value))} inputMode="numeric" pattern="[0-9]*" maxLength={6} /></SetupFormField>
    <SetupFormField label="Report short code"><SetupInput value={values.reportShort} onChange={(event) => set('reportShort', event.target.value.toUpperCase())} maxLength={6} /></SetupFormField>
    <SetupFormField label="Cash-flow flag"><SetupInput value={values.cashFlowFlag} onChange={(event) => set('cashFlowFlag', event.target.value.toUpperCase())} maxLength={5} /></SetupFormField>
    <SetupFormField label="Receipt/payment flag"><SetupInput value={values.receiptPaymentFlag} onChange={(event) => set('receiptPaymentFlag', event.target.value.toUpperCase())} maxLength={5} /></SetupFormField>
    <SetupFormField label="Ratio parameter"><SetupInput value={values.ratioParameter} onChange={(event) => set('ratioParameter', event.target.value)} maxLength={30} /></SetupFormField>
    <SetupFormField label="Layer 2 dummy code"><SetupInput value={values.specificationCodeDummy} onChange={(event) => set('specificationCodeDummy', event.target.value.toUpperCase())} maxLength={50} /></SetupFormField>
    {flagFields.map((field) => <SetupFormField key={field.key} label={field.label}><SearchableSelect ariaLabel={field.label} value={values[field.key]} options={FLAG_OPTIONS} onChange={(value) => set(field.key, value)} /></SetupFormField>)}
    <Actions saving={saving} onCancel={onCancel} submitLabel={initialValues ? 'Save changes' : 'Create'} />
  </form>
}

function ParentNotice({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-[#dce4df] bg-[#f4f7f5] px-3 py-2.5 text-sm text-[#405653] md:col-span-2">{children}</div>
}

function digits(value: string) {
  return value.replace(/\D/g, '')
}

function code(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}
