import {Pencil, Plus, Search, Trash2} from 'lucide-react'
import {type ReactNode, useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Filter, X} from 'lucide-react'
import {useAuth} from '../../../modules/auth/hooks/useAuth'
import {branchApi} from '../../../modules/branch/api/branch.api'
import type {Branch} from '../../../modules/branch/branch.types'
import {companyApi} from '../../../modules/company/api/company.api'
import type {Company} from '../../../modules/company/company.types'
import {componentCodeApi} from '../../../modules/component-code/api/component-code.api'
import type {ComponentCode} from '../../../modules/component-code/component-code.types'
import {initialCoaApi} from '../../../modules/coa/api/coa.api'
import {formatInitialCoaId, type InitialCoa} from '../../../modules/coa/coa.types'
import {financeCodeApi} from '../../../modules/finance-code/api/finance-code.api'
import type {FinanceCode} from '../../../modules/finance-code/finance-code.types'
import {financialStatementApi} from '../../../modules/financial-statement/api/financial-statement.api'
import type {
    FinancialStatementContext,
    GroupFormValues,
    LayerFormValues,
    ReportFormValues,
    SpecificationFormValues,
    StatementGroup,
    StatementLayer,
    StatementReport,
    StatementSpecification,
} from '../../../modules/financial-statement/financial-statement.types'
import {projectCodeApi} from '../../../modules/project-code/api/project-code.api'
import type {ProjectCode} from '../../../modules/project-code/project-code.types'
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
import {Modal, ModalActions} from '../../../shared/components/Modal'
import {PageContainer} from '../../../shared/components/PageContainer'
import {SearchableSelect} from '../../../shared/components/SearchableSelect'
import {SkeletonBoundary, TableSkeleton} from '../../../shared/components/Skeleton'
import {TableActionButton} from '../../../shared/components/TableActionButton'
import {setupInputClass} from '../../../shared/components/forms/SetupFormField'
import {formatCode} from '../../../shared/utils/formatCode'

type StatementLevel = 'report' | 'group' | 'layer' | 'specification'
type ModalType = StatementLevel | null
type GroupListItem = StatementGroup & { reportCode: string }
type LayerListItem = StatementLayer & { reportCode: string; groupCode: string }
type SpecificationListItem = StatementSpecification & { reportCode: string; groupCode: string; layerCode: string }
type FinancialBatchItem = ReportFormValues | GroupFormValues | LayerFormValues | SpecificationFormValues
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
    const [coas, setCoas] = useState<InitialCoa[]>([])
    const [coaId, setCoaId] = useState('')
    const [branches, setBranches] = useState<Branch[]>([])
    const [projects, setProjects] = useState<ProjectCode[]>([])
    const [finances, setFinances] = useState<FinanceCode[]>([])
    const [components, setComponents] = useState<ComponentCode[]>([])
    const [branchId, setBranchId] = useState('')
    const [projectId, setProjectId] = useState('')
    const [financeId, setFinanceId] = useState('')
    const [componentId, setComponentId] = useState('')
    const [reports, setReports] = useState<StatementReport[]>([])
    const [reportCode, setReportCode] = useState('')
    const [groupCode, setGroupCode] = useState('')
    const [layerCode, setLayerCode] = useState('')
    const [level, setLevel] = useState<StatementLevel>('specification')
    const [query, setQuery] = useState('')
    const [filterOpen, setFilterOpen] = useState(false)
    const [filterReportCode, setFilterReportCode] = useState('')
    const [filterGroupCode, setFilterGroupCode] = useState('')
    const [filterLayerCode, setFilterLayerCode] = useState('')
    const [draftFilterReportCode, setDraftFilterReportCode] = useState('')
    const [draftFilterGroupCode, setDraftFilterGroupCode] = useState('')
    const [draftFilterLayerCode, setDraftFilterLayerCode] = useState('')
    const filterPopoverRef = useRef<HTMLDivElement>(null)
    const [modal, setModal] = useState<ModalType>(null)
    const [batchItems, setBatchItems] = useState<FinancialBatchItem[]>([])
    const [expandedBatchIndex, setExpandedBatchIndex] = useState<number | null>(null)
    const [editing, setEditing] = useState<EditableItem | null>(null)
    const [deleting, setDeleting] = useState<EditableItem | null>(null)
    const [deleteBusy, setDeleteBusy] = useState(false)
    const [loading, setLoading] = useState(true)
    const [contextError, setContextError] = useState('')
    const canView = can('financial_statements.read') || can('financial_statements.manage')
    const canEdit = can('financial_statements.manage')

    const loadHierarchy = useCallback(async (nextCompanyId: string, nextCoaId?: string) => {
        if (!nextCompanyId) {
            setReports([]);
            setLoading(false);
            return
        }
        setLoading(true)
        try {
            setReports(await financialStatementApi.hierarchy(nextCompanyId, nextCoaId))
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
                const [nextCompanies, nextCoas] = await Promise.all([companyApi.companies(), initialCoaApi.list()])
                setCompanies(nextCompanies)
                setCoas(nextCoas)
                setCoaId(String(nextCoas[0]?.coaId ?? ''))
                const assigned = user?.organizations[0]?.organizationId
                const nextCompanyId = !user?.superAdmin && assigned ? assigned : (nextCompanies[0]?.id ?? '')
                setCompanyId(nextCompanyId)
                await loadHierarchy(nextCompanyId, String(nextCoas[0]?.coaId ?? ''))
            } catch (reason) {
                toast.error(reason instanceof ApiError ? reason.message : 'Unable to load setup choices.', 'Setup data unavailable')
                setLoading(false)
            }
        })()
    }, [canView, loadHierarchy, toast, user])

    useEffect(() => {
        let active = true
        setBranches([]); setProjects([]); setBranchId(''); setProjectId(''); setContextError('')
        if (!companyId) return () => { active = false }
        void Promise.all([branchApi.branches(companyId), projectCodeApi.list(companyId)]).then(([nextBranches, nextProjects]) => {
            if (!active) return
            const activeBranches = nextBranches.filter((item) => item.status === 'ACTIVE')
            const activeProjects = nextProjects.filter((item) => item.status === 'ACTIVE')
            setBranches(activeBranches); setProjects(activeProjects)
            setBranchId(activeBranches[0]?.id ?? '')
            setProjectId(String(activeProjects[0]?.id ?? ''))
        }).catch((reason) => { if (active) setContextError(reason instanceof Error ? reason.message : 'Unable to load statement context.') })
        return () => { active = false }
    }, [companyId])

    useEffect(() => {
        let active = true
        setFinances([]); setComponents([]); setFinanceId(''); setComponentId('')
        if (!companyId || !projectId) return () => { active = false }
        void financeCodeApi.list(companyId, projectId).then((next) => {
            if (!active) return
            const available = next.filter((item) => item.status === 'ACTIVE')
            setFinances(available); setFinanceId(String(available[0]?.id ?? ''))
        }).catch((reason) => { if (active) setContextError(reason instanceof Error ? reason.message : 'Unable to load finance codes.') })
        return () => { active = false }
    }, [companyId, projectId])

    useEffect(() => {
        let active = true
        setComponents([]); setComponentId('')
        if (!companyId || !projectId || !financeId) return () => { active = false }
        void componentCodeApi.list(companyId, projectId, financeId).then((next) => {
            if (!active) return
            const available = next.filter((item) => item.status === 'ACTIVE')
            setComponents(available); setComponentId(String(available[0]?.id ?? ''))
        }).catch((reason) => { if (active) setContextError(reason instanceof Error ? reason.message : 'Unable to load component codes.') })
        return () => { active = false }
    }, [companyId, financeId, projectId])

    useEffect(() => {
        if (!filterOpen) return
        const closeOnOutsideClick = (event: PointerEvent) => {
            const target = event.target as Node
            const element = event.target as Element
            if (!filterPopoverRef.current?.contains(target) && !element.closest('[data-select-popover]')) setFilterOpen(false)
        }
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setFilterOpen(false)
        }
        document.addEventListener('pointerdown', closeOnOutsideClick)
        window.addEventListener('keydown', closeOnEscape)
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsideClick)
            window.removeEventListener('keydown', closeOnEscape)
        }
    }, [filterOpen])

    const selectedCompany = companies.find((item) => item.id === companyId)
    const selectedBranch = branches.find((item) => item.id === branchId)
    const selectedProject = projects.find((item) => String(item.id) === projectId)
    const selectedFinance = finances.find((item) => String(item.id) === financeId)
    const selectedComponent = components.find((item) => String(item.id) === componentId)
    const statementContext: FinancialStatementContext = {
        company_code: selectedCompany?.code ?? '',
        coa_id: coaId,
        branch_code: selectedBranch?.code ?? '',
        project_code: String(selectedProject?.code ?? ''),
        finance_code: String(selectedFinance?.code ?? ''),
        component_code: String(selectedComponent?.code ?? ''),
    }
    const contextReady = Object.values(statementContext).every(Boolean)
    const selectedReport = reports.find((item) => String(item.reportCode) === reportCode)
    const groups = selectedReport?.groups ?? []
    const selectedGroup = groups.find((item) => String(item.groupCode) === groupCode)
    const layers = selectedGroup?.layers ?? []
    const selectedLayer = layers.find((item) => String(item.layerCode) === layerCode)
    const draftFilterReport = reports.find((item) => String(item.reportCode) === draftFilterReportCode)
    const draftFilterGroups = draftFilterReport?.groups ?? []
    const draftFilterGroup = draftFilterGroups.find((item) => String(item.groupCode) === draftFilterGroupCode)
    const draftFilterLayers = draftFilterGroup?.layers ?? []

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
    const visibleGroups = allGroups.filter((item) => (!filterReportCode || String(item.reportCode) === filterReportCode) && matches(item.reportCode, item.groupCode, item.groupDescription, item.summaryLabel))
    const visibleLayers = allLayers.filter((item) => (!filterReportCode || String(item.reportCode) === filterReportCode) && (!filterGroupCode || String(item.groupCode) === filterGroupCode) && matches(item.reportCode, item.groupCode, item.layerCode, item.layerDescription, item.summaryLabel, item.sign))
    const visibleSpecifications = allSpecifications.filter((item) => (!filterReportCode || String(item.reportCode) === filterReportCode) && (!filterGroupCode || String(item.groupCode) === filterGroupCode) && (!filterLayerCode || String(item.layerCode) === filterLayerCode) && matches(item.reportCode, item.groupCode, item.layerCode, item.specificationCode, item.specificationDescription, item.reportType))

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
        await loadHierarchy(companyId, coaId)
    }

    async function afterUpdate(message: string) {
        setEditing(null)
        toast.success(message, 'Updated')
        await loadHierarchy(companyId, coaId)
    }

    async function removeItem() {
        if (!deleting) return
        setDeleteBusy(true)
        try {
            const {level: itemLevel, item} = deleting
            if (itemLevel === 'report') await financialStatementApi.deleteReport(companyId, coaId, item.reportCode)
            if (itemLevel === 'group') await financialStatementApi.deleteGroup(companyId, coaId, item.reportCode, item.groupCode)
            if (itemLevel === 'layer') await financialStatementApi.deleteLayer(companyId, coaId, item.reportCode, item.groupCode, item.layerCode)
            if (itemLevel === 'specification') await financialStatementApi.deleteSpecification(companyId, coaId, item.reportCode, item.groupCode, item.layerCode, item.reportType ?? '', item.specificationCode)
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
        setBatchItems([])
        setExpandedBatchIndex(null)
        setModal(level)
    }
    const isDuplicate = (item: FinancialBatchItem) => {
        const key = batchKey(level, item)
        if (batchItems.some((queued) => batchKey(level, queued) === key)) return true
        if (level === 'report') return reports.some((existing) => String(existing.reportCode).toUpperCase() === key)
        if (level === 'group') return groups.some((existing) => String(existing.groupCode).toUpperCase() === key)
        if (level === 'layer') return layers.some((existing) => String(existing.layerCode).toUpperCase() === key)
        return (selectedLayer?.specifications ?? []).some((existing) => `${String(existing.reportType ?? '').toUpperCase()}:${String(existing.specificationCode).toUpperCase()}` === key)
    }
    const queueBatchItem = (item: FinancialBatchItem) => {
        if (isDuplicate(item)) {
            toast.error('This code already exists in the selected parent or in the current batch.', 'Duplicate code')
            return
        }
        setBatchItems((current) => [...current, item])
        setExpandedBatchIndex(null)
    }
    const clearFilters = () => {
        setFilterReportCode('')
        setFilterGroupCode('')
        setFilterLayerCode('')
    }
    const openFilters = () => {
        setDraftFilterReportCode(filterReportCode)
        setDraftFilterGroupCode(filterGroupCode)
        setDraftFilterLayerCode(filterLayerCode)
        setFilterOpen((current) => !current)
    }
    const applyFilters = () => {
        setFilterReportCode(level === 'report' ? '' : draftFilterReportCode)
        setFilterGroupCode(level === 'layer' || level === 'specification' ? draftFilterGroupCode : '')
        setFilterLayerCode(level === 'specification' ? draftFilterLayerCode : '')
        setFilterOpen(false)
    }
    const activeFilterCount = level === 'report' ? 0 : [
        filterReportCode,
        ...(level === 'layer' || level === 'specification' ? [filterGroupCode] : []),
        ...(level === 'specification' ? [filterLayerCode] : []),
    ].filter(Boolean).length
    const modalTitle = `Create New ${LEVEL_OPTIONS.find((item) => item.value === level)?.label ?? 'Statement Layer'}`
    const crumbs = [{label: 'Dashboard', to: '/'}, {label: 'Setup'}, {label: 'Financial statement setup'}]
    if (!canView) return <PageContainer breadcrumbs={crumbs} title="Access denied"><Card>You do not have access to
        financial statement setup.</Card></PageContainer>

    return <PageContainer breadcrumbs={crumbs} title="Financial Statement setup">
        <div
            className="mb-5 rounded-2xl border border-[#c2d9d0] bg-[linear-gradient(120deg,rgba(220,240,233,.92),rgba(248,250,244,.96),rgba(246,232,198,.72))] p-5 shadow-[0_10px_28px_rgba(35,84,77,.09)]">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <LabeledControl label="Company"><SearchableSelect ariaLabel="Company" value={companyId}
                    options={companies.map((item) => ({value: item.id, label: `${item.code} - ${item.legalName}`}))}
                    onChange={(value) => {setCompanyId(value); setReports([]); setQuery(''); clearFilters(); setFilterOpen(false); void loadHierarchy(value, coaId)}}/></LabeledControl>
                <LabeledControl label="Initial COA"><SearchableSelect ariaLabel="Initial COA" value={coaId}
                    options={coas.map((item) => ({value: String(item.coaId), label: `${formatInitialCoaId(item.coaId)} - ${item.description}`}))}
                    onChange={(value) => {setCoaId(value); setReports([]); void loadHierarchy(companyId, value)}}/></LabeledControl>
                <LabeledControl label="Branch code"><SearchableSelect ariaLabel="Branch code" value={branchId}
                    options={branches.map((item) => ({value: item.id, label: `${item.code} - ${item.name}`}))}
                    onChange={setBranchId}/></LabeledControl>
                <LabeledControl label="Select statement layer"><SearchableSelect ariaLabel="Statement layer"
                                                                                 value={level} options={LEVEL_OPTIONS}
                                                                                 onChange={(value) => {
                                                                                     setLevel(value as StatementLevel);
                                                                                     setQuery('');
                                                                                     clearFilters();
                                                                                     setFilterOpen(false)
                                                                                 }}/></LabeledControl>
                <LabeledControl label="Project code"><SearchableSelect ariaLabel="Project code" value={projectId}
                    options={projects.map((item) => ({value: String(item.id), label: `${formatCode(item.code)} - ${item.name}`}))}
                    onChange={setProjectId}/></LabeledControl>
                <LabeledControl label="Finance code"><SearchableSelect ariaLabel="Finance code" value={financeId} disabled={!projectId}
                    options={finances.map((item) => ({value: String(item.id), label: `${formatCode(item.code)} - ${item.name}`}))}
                    onChange={setFinanceId}/></LabeledControl>
                <LabeledControl label="Component code"><SearchableSelect ariaLabel="Component code" value={componentId} disabled={!financeId}
                    options={components.map((item) => ({value: String(item.id), label: `${formatCode(item.code)} - ${item.name}`}))}
                    onChange={setComponentId}/></LabeledControl>
            </div>
        </div>
        {contextError && <p role="alert" className="text-red-700">{contextError}</p>}

        <div
            className="rounded-2xl border border-[#bfd7ce] bg-[rgba(255,255,255,.72)] shadow-[0_14px_34px_rgba(39,73,68,.10)] backdrop-blur-sm">
            <div
                className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cfe0d9] bg-[linear-gradient(100deg,#dcefe8,#eef7f1_58%,#f5e7c5)] px-5 py-4">
                <div><h2 className="m-0 text-base font-bold text-[#173d42]">{LEVEL_TITLES[level]}</h2><p
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
                    <div className="relative" ref={filterPopoverRef}>
                        <Button type="button" variant="secondary" onClick={openFilters} aria-expanded={filterOpen}
                                aria-haspopup="dialog" aria-label={activeFilterCount ? `Filters, ${activeFilterCount} active` : 'Filters'}>
                            <span className="flex items-center gap-2"><Filter className="size-4" aria-hidden/>Filters
                                {activeFilterCount > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-[#347077] px-1.5 py-0.5 text-xs leading-4 text-white">{activeFilterCount}</span>}
                            </span>
                        </Button>
                        {activeFilterCount > 0 && <button type="button" aria-label="Clear active filters" title="Clear active filters"
                            onClick={clearFilters} className="absolute -top-2 -right-2 grid size-6 cursor-pointer place-items-center rounded-full border-2 border-white bg-[#a94b42] text-white shadow-sm transition hover:bg-[#8f3b34]"><X className="size-3.5" aria-hidden/></button>}
                        {filterOpen && <div role="dialog" aria-label={`Filter ${LEVEL_TITLES[level]}`}
                            className="absolute top-[calc(100%+10px)] right-0 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-[#c5d8d0] bg-white p-4 text-left shadow-[0_18px_48px_rgba(17,44,46,.22)]">
                            <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#dce8e3] pb-3">
                                <div><h3 className="m-0 text-sm font-semibold text-[#173d42]">Filter {LEVEL_TITLES[level]}</h3><p className="m-0 mt-1 text-xs text-[#617774]">Select parent statement layers.</p></div>
                                <button type="button" aria-label="Close filters" onClick={() => setFilterOpen(false)} className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-[#617774] hover:bg-[#e8f1ed] hover:text-[#173d42]"><X className="size-4" aria-hidden/></button>
                            </div>
                            <div className="grid gap-3">
                                {level === 'report' && <p className="m-0 text-sm text-[#617774]">The Report Layer has no parent-layer filters.</p>}
                                {level !== 'report' && <LabeledControl label="Report layer code"><SearchableSelect ariaLabel="Filter by report layer code" value={draftFilterReportCode}
                                    options={[{value: '', label: 'All'}, ...reports.map((item) => ({value: String(item.reportCode), label: `${formatId(item.reportCode, 2)} — ${item.reportDescription}`}))]}
                                    onChange={(value) => {setDraftFilterReportCode(value); setDraftFilterGroupCode(''); setDraftFilterLayerCode('')}}/></LabeledControl>}
                                {(level === 'layer' || level === 'specification') && <LabeledControl label="Group layer code"><SearchableSelect ariaLabel="Filter by group layer code" value={draftFilterGroupCode} disabled={!draftFilterReportCode}
                                    options={[{value: '', label: 'All'}, ...draftFilterGroups.map((item) => ({value: String(item.groupCode), label: `${formatId(item.groupCode, 3)} — ${item.groupDescription}`}))]}
                                    onChange={(value) => {setDraftFilterGroupCode(value); setDraftFilterLayerCode('')}}/></LabeledControl>}
                                {level === 'specification' && <LabeledControl label="Sub head code"><SearchableSelect ariaLabel="Filter by sub head code" value={draftFilterLayerCode} disabled={!draftFilterGroupCode}
                                    options={[{value: '', label: 'All'}, ...draftFilterLayers.map((item) => ({value: String(item.layerCode), label: `${formatId(item.layerCode, 3)} — ${item.layerDescription}`}))]}
                                    onChange={setDraftFilterLayerCode}/></LabeledControl>}
                            </div>
                            <div className="-mx-4 -mb-4 mt-4 flex flex-wrap justify-end gap-2 border-t border-[#dce8e3] bg-[#f4f8f6] px-4 py-3">
                                <Button type="button" variant="secondary" onClick={() => {setDraftFilterReportCode(''); setDraftFilterGroupCode(''); setDraftFilterLayerCode('')}}>Clear</Button>
                                <Button type="button" onClick={applyFilters}>Apply</Button>
                            </div>
                        </div>}
                    </div>
                    {canEdit && <Button type="button" disabled={!contextReady} onClick={openCreateModal}><span
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

        <Modal open={modal !== null} title={modalTitle} onClose={() => setModal(null)} size="batch">
            {modal && <ParentCodeSelectors level={modal} reports={reports} reportCode={reportCode} groupCode={groupCode}
                                           layerCode={layerCode} onReportChange={(value) => {
                setReportCode(value);
                setGroupCode('');
                setLayerCode('');
                setBatchItems([]);setExpandedBatchIndex(null)
            }} onGroupChange={(value) => {
                setGroupCode(value);
                setLayerCode('');
                setBatchItems([]);setExpandedBatchIndex(null)
            }} onLayerChange={(value) => {setLayerCode(value);setBatchItems([]);setExpandedBatchIndex(null)}}/>}
            <div className={modal === 'report' ? '' : 'mt-5 border-t border-[#d8e5df] pt-5'}>
                {batchItems.length > 0 && <div className="mb-4 grid gap-2">{batchItems.map((item, index) =>
                    <section key={`${batchKey(level, item)}-${index}`} className="overflow-hidden rounded-lg border border-[#c9ddd5] bg-white/80 text-sm">
                        <div className="flex items-center justify-between gap-3 bg-[#eef6f2] px-4 py-3">
                            <button type="button" aria-expanded={expandedBatchIndex===index} onClick={()=>setExpandedBatchIndex(current=>current===index?null:index)} className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 text-left text-[#173d42]">
                                <span className="truncate"><strong>Record {index + 1}:</strong> {batchLabel(level, item)}</span><span>{expandedBatchIndex===index?'Close':'Open'}</span>
                            </button>
                            <button type="button" className="cursor-pointer rounded-md px-2 py-1 text-[#8f3b34] hover:bg-red-50" onClick={() => {setBatchItems((current) => current.filter((_, itemIndex) => itemIndex !== index));setExpandedBatchIndex(null)}}>Remove</button>
                        </div>
                        {expandedBatchIndex===index && <dl className="grid gap-x-5 gap-y-3 p-4 sm:grid-cols-2">{batchDetails(item).map(detail=><div key={detail.label} className="min-w-0 border-b border-[#e3ece8] pb-2"><dt className="text-xs text-[#617774]">{detail.label}</dt><dd className="m-0 mt-1 break-words text-[#243f43]">{detail.value || '—'}</dd></div>)}</dl>}
                    </section>)}</div>}
                {modal === 'report' &&
                    <ReportForm key={`report-${batchItems.length}`} onCancel={() => setModal(null)} onAddAnother={queueBatchItem} onSave={async (values: ReportFormValues) => {
                        if (isDuplicate(values)) {toast.error('This report code already exists.','Duplicate code');return}
                        await financialStatementApi.createReports(companyId, [...batchItems as ReportFormValues[], values], statementContext);
                        await afterCreate(`${batchItems.length + 1} report layer record(s) created.`)
                    }}/>}
                {modal === 'group' && selectedReport &&
                    <GroupForm key={`group-${batchItems.length}`} parent={`${formatId(selectedReport.reportCode, 2)} — ${selectedReport.reportDescription}`}
                               onCancel={() => setModal(null)} onAddAnother={queueBatchItem} onSave={async (values: GroupFormValues) => {
                        if (isDuplicate(values)) {toast.error('This group code already exists.','Duplicate code');return}
                        await financialStatementApi.createGroups(companyId, reportCode, [...batchItems as GroupFormValues[], values], statementContext);
                        await afterCreate(`${batchItems.length + 1} group layer record(s) created.`)
                    }}/>}
                {modal === 'layer' && selectedGroup &&
                    <LayerForm key={`layer-${batchItems.length}`} parent={`${formatId(selectedGroup.groupCode, 3)} — ${selectedGroup.groupDescription}`}
                               onCancel={() => setModal(null)} onAddAnother={queueBatchItem} onSave={async (values: LayerFormValues) => {
                        if (isDuplicate(values)) {toast.error('This sub-head code already exists.','Duplicate code');return}
                        await financialStatementApi.createLayers(companyId, reportCode, groupCode, [...batchItems as LayerFormValues[], values], statementContext);
                        await afterCreate(`${batchItems.length + 1} statement sub-head record(s) created.`)
                    }}/>}
                {modal === 'specification' && selectedLayer &&
                    <SpecificationForm key={`specification-${batchItems.length}`} parent={`${formatId(selectedLayer.layerCode, 3)} — ${selectedLayer.layerDescription}`}
                                       onCancel={() => setModal(null)} onAddAnother={queueBatchItem}
                                       onSave={async (values: SpecificationFormValues) => {
                                            if (isDuplicate(values)) {toast.error('This sub-sub-head code and report type already exist.','Duplicate code');return}
                                            await financialStatementApi.createSpecifications(companyId, reportCode, groupCode, layerCode, [...batchItems as SpecificationFormValues[], values], statementContext);
                                           await afterCreate(`${batchItems.length + 1} statement sub-sub-head record(s) created.`)
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
                    await financialStatementApi.updateReport(companyId, editing.item.reportCode, values, statementContext);
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
                    await financialStatementApi.updateGroup(companyId, editing.item.reportCode, editing.item.groupCode, values, statementContext);
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
                    await financialStatementApi.updateLayer(companyId, editing.item.reportCode, editing.item.groupCode, editing.item.layerCode, values, statementContext);
                    await afterUpdate('Statement sub head updated.')
                }}
            />}
            {editing?.level === 'specification' && <SpecificationForm
                parent={formatId(editing.item.layerCode, 3)}
                initialValues={specificationValues(editing.item)}
                onCancel={() => setEditing(null)}
                onSave={async (values) => {
                    await financialStatementApi.updateSpecification(companyId, editing.item.reportCode, editing.item.groupCode, editing.item.layerCode, editing.item.reportType ?? '', editing.item.specificationCode, values, statementContext);
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
                <ModalActions>
                    <Button type="button" variant="secondary" disabled={deleteBusy}
                            onClick={() => setDeleting(null)}>Cancel</Button>
                    <Button type="button" variant="danger" disabled={deleteBusy}
                            onClick={() => void removeItem()}>{deleteBusy ? 'Deleting...' : 'Delete'}</Button>
                </ModalActions>
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

function batchKey(level: StatementLevel, item: FinancialBatchItem) {
    if (level === 'report') return (item as ReportFormValues).reportCode.trim().toUpperCase()
    if (level === 'group') return (item as GroupFormValues).groupCode.trim().toUpperCase()
    if (level === 'layer') return (item as LayerFormValues).layerCode.trim().toUpperCase()
    const specification = item as SpecificationFormValues
    return `${specification.reportType.trim().toUpperCase()}:${specification.specificationCode.trim().toUpperCase()}`
}

function batchLabel(level: StatementLevel, item: FinancialBatchItem) {
    if (level === 'report') { const value=item as ReportFormValues; return `${value.reportCode} — ${value.reportDescription}` }
    if (level === 'group') { const value=item as GroupFormValues; return `${value.groupCode} — ${value.groupDescription}` }
    if (level === 'layer') { const value=item as LayerFormValues; return `${value.layerCode} — ${value.layerDescription}` }
    const value=item as SpecificationFormValues
    return `${value.reportType}/${value.specificationCode} — ${value.specificationDescription}`
}

function batchDetails(item: FinancialBatchItem) {
    return Object.entries(item).map(([key,value])=>({
        label:key.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/^./,character=>character.toUpperCase()),
        value:String(value ?? ''),
    }))
}

function formatId(value: string, width: number) {
    return String(value).padStart(width, '0')
}

