import {Pencil, Plus, Search, Trash2} from 'lucide-react'
import {type ReactNode, useCallback, useEffect, useMemo, useState} from 'react'
import {useAuth} from '../../../modules/auth/hooks/useAuth'
import {companyApi} from '../../../modules/company/api/company.api'
import type {Company} from '../../../modules/company/company.types'
import {financialStatementApi} from '../../../modules/financial-statement/api/financial-statement.api'
import type {
    GroupFormValues,
    LayerFormValues,
    ReportFormValues,
    SpecificationFormValues,
    StatementGroup,
    StatementLayer,
    StatementReport,
    StatementSpecification,
} from '../../../modules/financial-statement/financial-statement.types'
import {useToast} from '../../../modules/toast/hooks/useToast'
import {ApiError} from '../../../shared/api/httpClient'
import {Button} from '../../../shared/components/Button'
import {Card} from '../../../shared/components/Card'
import {type Column, DataTable} from '../../../shared/components/DataTable'
import {
    GroupForm,
    LayerForm,
    ReportForm,
    SpecificationForm
} from '../../../shared/components/financial-statement/FinancialStatementForms'
import {Modal} from '../../../shared/components/Modal'
import {PageContainer} from '../../../shared/components/PageContainer'
import {SearchableSelect} from '../../../shared/components/SearchableSelect'
import {SkeletonBoundary, TableSkeleton} from '../../../shared/components/Skeleton'
import {TableActionButton} from '../../../shared/components/TableActionButton'
import {setupInputClass} from '../../../shared/components/forms/SetupFormField'

type StatementLevel = 'report' | 'group' | 'layer' | 'specification'
type ModalType = StatementLevel | null
type GroupListItem = StatementGroup & { reportCode: string }
type LayerListItem = StatementLayer & { reportCode: string; groupCode: string }
type SpecificationListItem = StatementSpecification & { reportCode: string; groupCode: string; layerCode: string }
type EditableItem =
    | { level: 'report'; item: StatementReport }
    | { level: 'group'; item: GroupListItem }
    | { level: 'layer'; item: LayerListItem }
    | { level: 'specification'; item: SpecificationListItem }

const LEVEL_OPTIONS = [
    {value: 'report', label: 'Report Layer'},
    {value: 'group', label: 'Group Layer'},
    {value: 'layer', label: 'Statement Sub Head'},
    {value: 'specification', label: 'Statement Sub-Sub Head'},
]

const LEVEL_TITLES: Record<StatementLevel, string> = {
    report: 'Report Layer List',
    group: 'Group Layer List',
    layer: 'Statement Sub Head List',
    specification: 'Statement Sub-Sub Head List',
}

export function FinancialStatementSetupPage() {
    const {can, user} = useAuth()
    const toast = useToast()
    const [companies, setCompanies] = useState<Company[]>([])
    const [companyId, setCompanyId] = useState('')
    const [reports, setReports] = useState<StatementReport[]>([])
    const [reportCode, setReportCode] = useState('')
    const [groupCode, setGroupCode] = useState('')
    const [layerCode, setLayerCode] = useState('')
    const [level, setLevel] = useState<StatementLevel>('specification')
    const [query, setQuery] = useState('')
    const [modal, setModal] = useState<ModalType>(null)
    const [editing, setEditing] = useState<EditableItem | null>(null)
    const [deleting, setDeleting] = useState<EditableItem | null>(null)
    const [deleteBusy, setDeleteBusy] = useState(false)
    const [loading, setLoading] = useState(true)
    const canView = can('financial_statements.read') || can('financial_statements.manage')
    const canEdit = can('financial_statements.manage')

    const loadHierarchy = useCallback(async (nextCompanyId: string) => {
        if (!nextCompanyId) {
            setReports([]);
            setLoading(false);
            return
        }
        setLoading(true)
        try {
            setReports(await financialStatementApi.hierarchy(nextCompanyId))
        } catch (reason) {
            toast.error(reason instanceof ApiError ? reason.message : 'Unable to load financial statement setup.', 'Statement setup unavailable')
        } finally {
            setLoading(false)
        }
    }, [toast])

    useEffect(() => {
        if (!canView) {
            setLoading(false);
            return
        }
        void (async () => {
            try {
                const nextCompanies = await companyApi.companies()
                setCompanies(nextCompanies)
                const assigned = user?.organizations[0]?.organizationId
                const nextCompanyId = !user?.superAdmin && assigned ? assigned : (nextCompanies[0]?.id ?? '')
                setCompanyId(nextCompanyId)
                await loadHierarchy(nextCompanyId)
            } catch (reason) {
                toast.error(reason instanceof ApiError ? reason.message : 'Unable to load setup choices.', 'Setup data unavailable')
                setLoading(false)
            }
        })()
    }, [canView, loadHierarchy, toast, user])

    const selectedCompany = companies.find((item) => item.id === companyId)
    const selectedReport = reports.find((item) => String(item.reportCode) === reportCode)
    const groups = selectedReport?.groups ?? []
    const selectedGroup = groups.find((item) => String(item.groupCode) === groupCode)
    const layers = selectedGroup?.layers ?? []
    const selectedLayer = layers.find((item) => String(item.layerCode) === layerCode)

    const allGroups = useMemo<GroupListItem[]>(() => reports.flatMap((report) =>
        report.groups.map((group) => ({...group, reportCode: report.reportCode}))), [reports])
    const allLayers = useMemo<LayerListItem[]>(() => reports.flatMap((report) =>
        report.groups.flatMap((group) => group.layers.map((layer) => ({
            ...layer,
            reportCode: report.reportCode,
            groupCode: group.groupCode
        })))), [reports])
    const allSpecifications = useMemo<SpecificationListItem[]>(() => reports.flatMap((report) =>
        report.groups.flatMap((group) => group.layers.flatMap((layer) => layer.specifications.map((specification) => ({
            ...specification, reportCode: report.reportCode, groupCode: group.groupCode, layerCode: layer.layerCode,
        }))))), [reports])

    const term = query.trim().toLocaleLowerCase()
    const matches = (...values: (string | number | null)[]) => !term || values.some((value) => value != null && String(value).toLocaleLowerCase().includes(term))
    const visibleReports = reports.filter((item) => matches(item.reportCode, item.reportDescription, item.summaryLabel))
    const visibleGroups = allGroups.filter((item) => matches(item.reportCode, item.groupCode, item.groupDescription, item.summaryLabel))
    const visibleLayers = allLayers.filter((item) => matches(item.reportCode, item.groupCode, item.layerCode, item.layerDescription, item.summaryLabel, item.sign))
    const visibleSpecifications = allSpecifications.filter((item) => matches(item.reportCode, item.groupCode, item.layerCode, item.specificationCode, item.specificationDescription, item.reportType))

    const reportColumns = useMemo<Column<StatementReport>[]>(() => [
        {key: 'code', header: 'Report Code', render: (item) => formatId(item.reportCode, 2)},
        {key: 'description', header: 'Report Description', render: (item) => item.reportDescription},
        {key: 'summary', header: 'Summary Label', render: (item) => item.summaryLabel ?? '—'},
        ...(canEdit ? actionColumns<StatementReport>(
            (item) => setEditing({level: 'report', item}),
            (item) => setDeleting({level: 'report', item}),
            (item) => item.reportDescription,
        ) : []),
    ], [canEdit])
    const groupColumns = useMemo<Column<GroupListItem>[]>(() => [
        {key: 'report', header: 'Report Code', render: (item) => <CodeBadge>{formatId(item.reportCode, 2)}</CodeBadge>},
        {key: 'code', header: 'Group Layer Code', render: (item) => formatId(item.groupCode, 3)},
        {key: 'description', header: 'Group Layer Name', render: (item) => item.groupDescription},
        {key: 'summary', header: 'Summary Label', render: (item) => item.summaryLabel ?? '—'},
        ...(canEdit ? actionColumns<GroupListItem>(
            (item) => setEditing({level: 'group', item}),
            (item) => setDeleting({level: 'group', item}),
            (item) => item.groupDescription,
        ) : []),
    ], [canEdit])
    const layerColumns = useMemo<Column<LayerListItem>[]>(() => [
        {key: 'report', header: 'Report Code', render: (item) => <CodeBadge>{formatId(item.reportCode, 2)}</CodeBadge>},
        {key: 'group', header: 'Group Code', render: (item) => <CodeBadge>{formatId(item.groupCode, 3)}</CodeBadge>},
        {key: 'code', header: 'Sub Head Code', render: (item) => formatId(item.layerCode, 3)},
        {key: 'description', header: 'Sub Head Name', render: (item) => item.layerDescription},
        {key: 'sign', header: 'Sign', align: 'center', render: (item) => item.sign ?? '—'},
        ...(canEdit ? actionColumns<LayerListItem>(
            (item) => setEditing({level: 'layer', item}),
            (item) => setDeleting({level: 'layer', item}),
            (item) => item.layerDescription,
        ) : []),
    ], [canEdit])
    const specificationColumns = useMemo<Column<SpecificationListItem>[]>(() => [
        {key: 'report', header: 'Report', render: (item) => <CodeBadge>{formatId(item.reportCode, 2)}</CodeBadge>},
        {key: 'group', header: 'Group', render: (item) => <CodeBadge>{formatId(item.groupCode, 3)}</CodeBadge>},
        {key: 'layer', header: 'Sub Head', render: (item) => <CodeBadge>{formatId(item.layerCode, 3)}</CodeBadge>},
        {key: 'code', header: 'Sub-Sub Head Code', render: (item) => formatId(item.specificationCode, 6)},
        {key: 'description', header: 'Sub-Sub Head Name', render: (item) => item.specificationDescription},
        {key: 'type', header: 'Report Type', align: 'center', render: (item) => item.reportType ?? '—'},
        {key: 'sign', header: 'Sign', align: 'center', render: (item) => item.sign ?? '—'},
        ...(canEdit ? actionColumns<SpecificationListItem>(
            (item) => setEditing({level: 'specification', item}),
            (item) => setDeleting({level: 'specification', item}),
            (item) => item.specificationDescription,
        ) : []),
    ], [canEdit])

    async function afterCreate(message: string) {
        setModal(null)
        toast.success(message, 'Created')
        await loadHierarchy(companyId)
    }

    async function afterUpdate(message: string) {
        setEditing(null)
        toast.success(message, 'Updated')
        await loadHierarchy(companyId)
    }

    async function removeItem() {
        if (!deleting) return
        setDeleteBusy(true)
        try {
            const {level: itemLevel, item} = deleting
            if (itemLevel === 'report') await financialStatementApi.deleteReport(companyId, item.reportCode)
            if (itemLevel === 'group') await financialStatementApi.deleteGroup(companyId, item.reportCode, item.groupCode)
            if (itemLevel === 'layer') await financialStatementApi.deleteLayer(companyId, item.reportCode, item.groupCode, item.layerCode)
            if (itemLevel === 'specification') await financialStatementApi.deleteSpecification(companyId, item.reportCode, item.groupCode, item.layerCode, item.reportType ?? '', item.specificationCode)
            setDeleting(null)
            toast.success('The financial statement item was deleted.', 'Deleted')
            await loadHierarchy(companyId)
        } catch (reason) {
            toast.error(reason instanceof ApiError ? reason.message : 'Unable to delete this item.', 'Item was not deleted')
        } finally {
            setDeleteBusy(false)
        }
    }

    const openCreateModal = () => {
        setReportCode('');
        setGroupCode('');
        setLayerCode('')
        setModal(level)
    }
    const modalTitle = `Create ${LEVEL_OPTIONS.find((item) => item.value === level)?.label ?? 'statement layer'}`
    const crumbs = [{label: 'Dashboard', to: '/'}, {label: 'Setup'}, {label: 'Financial statement setup'}]
    if (!canView) return <PageContainer breadcrumbs={crumbs} title="Access denied"><Card>You do not have access to
        financial statement setup.</Card></PageContainer>

    return <PageContainer breadcrumbs={crumbs} title="Financial Statement setup">
        <div
            className="mb-5 rounded-2xl border border-[#c2d9d0] bg-[linear-gradient(120deg,rgba(220,240,233,.92),rgba(248,250,244,.96),rgba(246,232,198,.72))] p-5 shadow-[0_10px_28px_rgba(35,84,77,.09)]">
            <div className="grid grid-cols-2 gap-5 max-md:grid-cols-1">
                <LabeledControl label="Company">
                    <div
                        className="flex min-h-[43px] items-center rounded-lg border border-[#bfcfc8] bg-white/90 px-3 text-[13px] text-[#24484b] shadow-sm">{selectedCompany?.legalName ?? user?.organizations[0]?.organizationName ?? 'Company'}</div>
                </LabeledControl>
                <LabeledControl label="Select statement layer"><SearchableSelect ariaLabel="Statement layer"
                                                                                 value={level} options={LEVEL_OPTIONS}
                                                                                 onChange={(value) => {
                                                                                     setLevel(value as StatementLevel);
                                                                                     setQuery('')
                                                                                 }}/></LabeledControl>
            </div>
        </div>

        <div
            className="overflow-hidden rounded-2xl border border-[#bfd7ce] bg-[rgba(255,255,255,.72)] shadow-[0_14px_34px_rgba(39,73,68,.10)] backdrop-blur-sm">
            <div
                className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cfe0d9] bg-[linear-gradient(100deg,#dcefe8,#eef7f1_58%,#f5e7c5)] px-5 py-4">
                <div><h2 className="m-0 text-base font-normal text-[#173d42]">{LEVEL_TITLES[level]}</h2><p
                    className="mt-1 mb-0 text-xs text-[#617774]">All
                    existing {LEVEL_OPTIONS.find((item) => item.value === level)?.label.toLowerCase()} codes for this
                    company.</p></div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <div className="relative w-[250px] max-sm:w-full"><Search
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#71817e]"
                        aria-hidden/><input className={`${setupInputClass} border-[#bfd0c9] bg-white/90 pl-9`}
                                            value={query} onChange={(event) => setQuery(event.target.value)}
                                            placeholder="Search codes or names" aria-label="Search statement setup"/>
                    </div>
                    {canEdit && <Button type="button" onClick={openCreateModal}><span
                        className="flex items-center gap-1.5"><Plus className="size-4"
                                                                    aria-hidden/>Add New</span></Button>}
                </div>
            </div>
            <div className="p-5"><SkeletonBoundary loading={loading} fallback={<TableSkeleton columns={5} rows={8}/>}
                                                   minimumDurationMs={400}>
                {level === 'report' &&
                    <DataTable columns={reportColumns} rows={visibleReports} rowKey={(item) => item.reportCode}
                               emptyMessage="No report layers are configured."/>}
                {level === 'group' && <DataTable columns={groupColumns} rows={visibleGroups}
                                                 rowKey={(item) => `${item.reportCode}-${item.groupCode}`}
                                                 emptyMessage="No group layers are configured."/>}
                {level === 'layer' && <DataTable columns={layerColumns} rows={visibleLayers}
                                                 rowKey={(item) => `${item.reportCode}-${item.groupCode}-${item.layerCode}`}
                                                 emptyMessage="No statement sub heads are configured."/>}
                {level === 'specification' && <DataTable columns={specificationColumns} rows={visibleSpecifications}
                                                         rowKey={(item) => `${item.reportCode}-${item.groupCode}-${item.layerCode}-${item.reportType}-${item.specificationCode}`}
                                                         emptyMessage="No statement sub-sub heads are configured."/>}
            </SkeletonBoundary></div>
        </div>

        <Modal open={modal !== null} title={modalTitle} onClose={() => setModal(null)}>
            {modal && <ParentCodeSelectors level={modal} reports={reports} reportCode={reportCode} groupCode={groupCode}
                                           layerCode={layerCode} onReportChange={(value) => {
                setReportCode(value);
                setGroupCode('');
                setLayerCode('')
            }} onGroupChange={(value) => {
                setGroupCode(value);
                setLayerCode('')
            }} onLayerChange={setLayerCode}/>}
            <div className={modal === 'report' ? '' : 'mt-5 border-t border-[#d8e5df] pt-5'}>
                {modal === 'report' &&
                    <ReportForm onCancel={() => setModal(null)} onSave={async (values: ReportFormValues) => {
                        await financialStatementApi.createReport(companyId, values);
                        await afterCreate('Report layer created.')
                    }}/>}
                {modal === 'group' && selectedReport &&
                    <GroupForm parent={`${selectedReport.reportCode} — ${selectedReport.reportDescription}`}
                               onCancel={() => setModal(null)} onSave={async (values: GroupFormValues) => {
                        await financialStatementApi.createGroup(companyId, reportCode, values);
                        await afterCreate('Group layer created.')
                    }}/>}
                {modal === 'layer' && selectedGroup &&
                    <LayerForm parent={`${selectedGroup.groupCode} — ${selectedGroup.groupDescription}`}
                               onCancel={() => setModal(null)} onSave={async (values: LayerFormValues) => {
                        await financialStatementApi.createLayer(companyId, reportCode, groupCode, values);
                        await afterCreate('Statement sub head created.')
                    }}/>}
                {modal === 'specification' && selectedLayer &&
                    <SpecificationForm parent={`${selectedLayer.layerCode} — ${selectedLayer.layerDescription}`}
                                       onCancel={() => setModal(null)}
                                       onSave={async (values: SpecificationFormValues) => {
                                           await financialStatementApi.createSpecification(companyId, reportCode, groupCode, layerCode, values);
                                           await afterCreate('Statement sub-sub head created.')
                                       }}/>}
                {modal && modal !== 'report' && !parentReady(modal, selectedReport, selectedGroup, selectedLayer) &&
                    <div
                        className="rounded-xl border border-dashed border-[#b8cec5] bg-[#edf6f1] px-4 py-5 text-center text-sm text-[#58716c]">Select
                        the existing parent code above to continue.</div>}
            </div>
        </Modal>

        <Modal open={editing !== null}
               title={`Edit ${editing ? LEVEL_OPTIONS.find((option) => option.value === editing.level)?.label ?? 'statement item' : 'statement item'}`}
               onClose={() => setEditing(null)}>
            {editing?.level === 'report' && <ReportForm
                initialValues={{
                    reportCode: formatId(editing.item.reportCode, 2),
                    reportDescription: editing.item.reportDescription,
                    summaryLabel: editing.item.summaryLabel ?? ''
                }}
                onCancel={() => setEditing(null)}
                onSave={async (values) => {
                    await financialStatementApi.updateReport(companyId, editing.item.reportCode, values);
                    await afterUpdate('Report layer updated.')
                }}
            />}
            {editing?.level === 'group' && <GroupForm
                parent={formatId(editing.item.reportCode, 2)}
                initialValues={{
                    groupCode: formatId(editing.item.groupCode, 3),
                    groupDescription: editing.item.groupDescription,
                    summaryLabel: editing.item.summaryLabel ?? ''
                }}
                onCancel={() => setEditing(null)}
                onSave={async (values) => {
                    await financialStatementApi.updateGroup(companyId, editing.item.reportCode, editing.item.groupCode, values);
                    await afterUpdate('Group layer updated.')
                }}
            />}
            {editing?.level === 'layer' && <LayerForm
                parent={formatId(editing.item.groupCode, 3)}
                initialValues={{
                    layerCode: formatId(editing.item.layerCode, 3),
                    layerDescription: editing.item.layerDescription,
                    summaryLabel: editing.item.summaryLabel ?? '',
                    sign: editing.item.sign ?? ''
                }}
                onCancel={() => setEditing(null)}
                onSave={async (values) => {
                    await financialStatementApi.updateLayer(companyId, editing.item.reportCode, editing.item.groupCode, editing.item.layerCode, values);
                    await afterUpdate('Statement sub head updated.')
                }}
            />}
            {editing?.level === 'specification' && <SpecificationForm
                parent={formatId(editing.item.layerCode, 3)}
                initialValues={specificationValues(editing.item)}
                onCancel={() => setEditing(null)}
                onSave={async (values) => {
                    await financialStatementApi.updateSpecification(companyId, editing.item.reportCode, editing.item.groupCode, editing.item.layerCode, editing.item.reportType ?? '', editing.item.specificationCode, values);
                    await afterUpdate('Statement sub-sub head updated.')
                }}
            />}
        </Modal>

        <Modal open={deleting !== null} title="Delete financial statement item" onClose={() => {
            if (!deleteBusy) setDeleting(null)
        }} size="medium">
            {deleting && <div className="grid gap-6">
                <p className="m-0 text-sm leading-6 text-[#405653]">Delete {itemLabel(deleting)}? Parent items with
                    dependent layers cannot be deleted until their child records are removed.</p>
                <div className="flex justify-end gap-2.5">
                    <Button type="button" variant="secondary" disabled={deleteBusy}
                            onClick={() => setDeleting(null)}>Cancel</Button>
                    <Button type="button" variant="danger" disabled={deleteBusy}
                            onClick={() => void removeItem()}>{deleteBusy ? 'Deleting...' : 'Delete'}</Button>
                </div>
            </div>}
        </Modal>
    </PageContainer>
}

function ParentCodeSelectors({
                                 level,
                                 reports,
                                 reportCode,
                                 groupCode,
                                 layerCode,
                                 onReportChange,
                                 onGroupChange,
                                 onLayerChange
                             }: {
    level: StatementLevel;
    reports: StatementReport[];
    reportCode: string;
    groupCode: string;
    layerCode: string;
    onReportChange: (value: string) => void;
    onGroupChange: (value: string) => void;
    onLayerChange: (value: string) => void
}) {
    if (level === 'report') return null
    const report = reports.find((item) => String(item.reportCode) === reportCode)
    const groups = report?.groups ?? []
    const group = groups.find((item) => String(item.groupCode) === groupCode)
    const layers = group?.layers ?? []
    return <div className="rounded-xl border border-[#c6dbd2] bg-[linear-gradient(120deg,#e7f4ef,#fbf7ea)] p-4">
        <p className="mt-0 mb-3 text-xs font-normal uppercase tracking-[.12em] text-[#52716b]">Select existing parent
            codes</p>
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <LabeledControl label="Report layer code"><SearchableSelect ariaLabel="Report layer code" value={reportCode}
                                                                        options={reports.map((item) => ({
                                                                            value: String(item.reportCode),
                label: `${formatId(item.reportCode, 2)} — ${item.reportDescription}`
                                                                        }))} onChange={onReportChange}
                                                                        placeholder="Select report code"
                                                                        searchPlaceholder="Search report codes..."/></LabeledControl>
            {(level === 'layer' || level === 'specification') &&
                <LabeledControl label="Group layer code"><SearchableSelect ariaLabel="Group layer code"
                                                                           value={groupCode}
                                                                           options={groups.map((item) => ({
                                                                               value: String(item.groupCode),
                label: `${formatId(item.groupCode, 3)} — ${item.groupDescription}`
                                                                           }))} onChange={onGroupChange}
                                                                           placeholder="Select group code"
                                                                           searchPlaceholder="Search group codes..."
                                                                           disabled={!report}/></LabeledControl>}
            {level === 'specification' &&
                <LabeledControl label="Sub head code"><SearchableSelect ariaLabel="Sub head code" value={layerCode}
                                                                        options={layers.map((item) => ({
                                                                            value: String(item.layerCode),
                label: `${formatId(item.layerCode, 3)} — ${item.layerDescription}`
                                                                        }))} onChange={onLayerChange}
                                                                        placeholder="Select sub head code"
                                                                        searchPlaceholder="Search sub head codes..."
                                                                        disabled={!group}/></LabeledControl>}
        </div>
    </div>
}

function LabeledControl({label, children}: { label: string; children: ReactNode }) {
    return <label
        className="grid content-start gap-2 text-[13px] font-normal text-[#355b58]"><span>{label}</span>{children}
    </label>
}

function CodeBadge({children}: { children: ReactNode }) {
    return <span
        className="inline-flex rounded-md border border-[#c8ddd5] bg-[#e8f3ee] px-2 py-1 font-normal text-[#285a58]">{children}</span>
}

function parentReady(level: StatementLevel, report?: StatementReport, group?: StatementGroup, layer?: StatementLayer) {
    if (level === 'group') return Boolean(report)
    if (level === 'layer') return Boolean(group)
    if (level === 'specification') return Boolean(layer)
    return true
}

function actionColumns<T>(onEdit: (item: T) => void, onDelete: (item: T) => void, label: (item: T) => string): Column<T>[] {
    return [
        {
            key: 'edit',
            header: 'Edit',
            headerGroup: 'Action',
            align: 'center',
            render: (item) => <TableActionButton label={`Edit ${label(item)}`} onClick={() => onEdit(item)}><Pencil
                className="size-4" aria-hidden/></TableActionButton>
        },
        {
            key: 'delete',
            header: 'Delete',
            headerGroup: 'Action',
            align: 'center',
            render: (item) => <TableActionButton label={`Delete ${label(item)}`} tone="danger"
                                                 onClick={() => onDelete(item)}><Trash2 className="size-4" aria-hidden/></TableActionButton>
        },
    ]
}

function specificationValues(item: SpecificationListItem): SpecificationFormValues {
    return {
        specificationCode: formatId(item.specificationCode, 6),
        specificationDescription: item.specificationDescription,
        reportType: item.reportType ?? '',
        groupSign: item.groupSign ?? '',
        sign: item.sign ?? '',
        noteId: item.noteId == null ? '' : String(item.noteId),
        retainEarningFlag: item.retainEarningFlag ?? '',
        reportShort: item.reportShort ?? '',
        cashFlowFlag: item.cashFlowFlag ?? '',
        receiptPaymentFlag: item.receiptPaymentFlag ?? '',
        ratioParameter: item.ratioParameter ?? '',
        liquidCashFlag: item.liquidCashFlag ?? '',
        savingsFlag: item.savingsFlag ?? '',
        debtFlag: item.debtFlag ?? '',
        principalPaidFlag: item.principalPaidFlag ?? '',
        serviceChargePaidFlag: item.serviceChargePaidFlag ?? '',
        currentAssetFlag: item.currentAssetFlag ?? '',
        currentLiabilityFlag: item.currentLiabilityFlag ?? '',
        splitFigureFlag: item.splitFigureFlag ?? '',
        combineFlag: item.combineFlag ?? '',
        specificationCodeDummy: item.specificationCodeDummy ?? '',
    }
}

function itemLabel(target: EditableItem) {
    if (target.level === 'report') return `${formatId(target.item.reportCode, 2)} — ${target.item.reportDescription}`
    if (target.level === 'group') return `${formatId(target.item.groupCode, 3)} — ${target.item.groupDescription}`
    if (target.level === 'layer') return `${formatId(target.item.layerCode, 3)} — ${target.item.layerDescription}`
    return `${formatId(target.item.specificationCode, 6)} — ${target.item.specificationDescription}`
}

function formatId(value: string, width: number) {
    void width
    return value
}

