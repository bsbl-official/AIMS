import { Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppShell } from './AppShell'
import { LoginPage } from '../pages/auth/LoginPage'
import { ProtectedRoute } from '../modules/auth/ProtectedRoute'

const DashboardPage = lazy(() => import('../pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage').then(m => ({ default: m.ProfilePage })))
const InitialCoaPage = lazy(() => import('../pages/setup/chart-of-accounts/InitialCoaPage').then(m => ({ default: m.InitialCoaPage })))
const AccountLayersPage = lazy(() => import('../pages/setup/chart-of-accounts/AccountLayersPage').then(m => ({ default: m.AccountLayersPage })))
const VoucherListPage = lazy(() => import('../pages/transactions/VoucherListPage').then(m => ({ default: m.VoucherListPage })))
const DebitVoucherPage = lazy(() => import('../pages/transactions/DebitVoucherPage').then(m => ({ default: m.DebitVoucherPage })))
const CreditVoucherPage = lazy(() => import('../pages/transactions/CreditVoucherPage').then(m => ({ default: m.CreditVoucherPage })))
const JournalVoucherPage = lazy(() => import('../pages/transactions/JournalVoucherPage').then(m => ({ default: m.JournalVoucherPage })))
const UserManagementPage = lazy(() => import('../pages/user-management/UserManagementPage').then(m => ({ default: m.UserManagementPage })))
const PermissionManagementPage = lazy(() => import('../pages/user-management/PermissionManagementPage').then(m => ({ default: m.PermissionManagementPage })))
const CompanySetupPage = lazy(() => import('../pages/setup/company/CompanySetupPage').then(m => ({ default: m.CompanySetupPage })))
const BranchSetupPage = lazy(() => import('../pages/setup/branch/BranchSetupPage').then(m => ({ default: m.BranchSetupPage })))
const ProjectCodeSetupPage = lazy(() => import('../pages/setup/project-code/ProjectCodeSetupPage').then(m => ({ default: m.ProjectCodeSetupPage })))
const FinanceCodeSetupPage = lazy(() => import('../pages/setup/finance-code/FinanceCodeSetupPage').then(m => ({ default: m.FinanceCodeSetupPage })))
const ComponentCodeSetupPage = lazy(() => import('../pages/setup/component-code/ComponentCodeSetupPage').then(m => ({ default: m.ComponentCodeSetupPage })))
const FinancialYearSetupPage = lazy(() => import('../pages/setup/financial-year/FinancialYearSetupPage').then(m => ({ default: m.FinancialYearSetupPage })))
const InitialDataSetupPage = lazy(() => import('../pages/setup/initial-data/InitialDataSetupPage').then(m => ({ default: m.InitialDataSetupPage })))
const VoucherSetupPage = lazy(() => import('../pages/setup/voucher-setup/VoucherSetupPage').then(m => ({ default: m.VoucherSetupPage })))
const VoucherControlSetupPage = lazy(() => import('../pages/setup/voucher-control/VoucherControlSetupPage').then(m => ({ default: m.VoucherControlSetupPage })))
const FinancialStatementSetupPage = lazy(() => import('../pages/setup/financial-statement/FinancialStatementSetupPage').then(m => ({ default: m.FinancialStatementSetupPage })))

export function App() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center text-sm text-[#6b7b78]" role="status">Loading page…</div>}><Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="setup/initial-coa" element={<InitialCoaPage />} />
          <Route path="accounts" element={<Navigate to="/setup/initial-coa" replace />} />
          <Route path="setup/chart-of-accounts" element={<AccountLayersPage />} />
          <Route path="journals" element={<Navigate to="/transactions/journal-vouchers" replace />} />
          <Route path="transactions/vouchers" element={<VoucherListPage />} />
          <Route path="transactions/debit-vouchers" element={<DebitVoucherPage />} />
          <Route path="transactions/credit-vouchers" element={<CreditVoucherPage />} />
          <Route path="transactions/journal-vouchers" element={<JournalVoucherPage />} />
          <Route path="user-management/users" element={<UserManagementPage view="users" />} />
          <Route path="user-management/roles" element={<UserManagementPage view="roles" />} />
          <Route path="user-management/permissions" element={<PermissionManagementPage />} />
          <Route path="users" element={<Navigate to="/user-management/users" replace />} />
          <Route path="setup/company" element={<CompanySetupPage />} />
          <Route path="setup/branches" element={<BranchSetupPage />} />
          <Route path="setup/project-codes" element={<ProjectCodeSetupPage />} />
          <Route path="setup/finance-codes" element={<FinanceCodeSetupPage />} />
          <Route path="setup/component-codes" element={<ComponentCodeSetupPage />} />
          <Route path="setup/financial-year" element={<FinancialYearSetupPage />} />
          <Route path="setup/initial-data" element={<InitialDataSetupPage />} />
          <Route path="setup/voucher-setup" element={<VoucherSetupPage />} />
          <Route path="setup/voucher-control" element={<VoucherControlSetupPage />} />
          <Route path="setup/financial-statements" element={<FinancialStatementSetupPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes></Suspense>
  )
}
