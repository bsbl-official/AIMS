import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { AccountLayersPage } from '../pages/setup/chart-of-accounts/AccountLayersPage'
import { InitialCoaPage } from '../pages/setup/chart-of-accounts/InitialCoaPage'
import { DashboardPage } from '../pages/DashboardPage'
import { JournalVouchersPage } from '../pages/transactions/JournalVouchersPage'
import { LoginPage } from '../pages/auth/LoginPage'
import { ProtectedRoute } from '../modules/auth/ProtectedRoute'
import { UserManagementPage } from '../pages/user-management/UserManagementPage'
import { FinancialStatementSetupPage } from '../pages/setup/financial-statement/FinancialStatementSetupPage'
import { CompanySetupPage } from '../pages/setup/company/CompanySetupPage'
import { BranchSetupPage } from '../pages/setup/branch/BranchSetupPage'
import { ProjectCodeSetupPage } from '../pages/setup/project-code/ProjectCodeSetupPage'
import { FinanceCodeSetupPage } from '../pages/setup/finance-code/FinanceCodeSetupPage'
import { ComponentCodeSetupPage } from '../pages/setup/component-code/ComponentCodeSetupPage'
import { FinancialYearSetupPage } from '../pages/setup/financial-year/FinancialYearSetupPage'
import { InitialDataSetupPage } from '../pages/setup/initial-data/InitialDataSetupPage'
import { VoucherSetupPage } from '../pages/setup/voucher-setup/VoucherSetupPage'
import { VoucherControlSetupPage } from '../pages/setup/voucher-control/VoucherControlSetupPage'

export function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="setup/initial-coa" element={<InitialCoaPage />} />
          <Route path="accounts" element={<Navigate to="/setup/initial-coa" replace />} />
          <Route path="setup/chart-of-accounts" element={<AccountLayersPage />} />
          <Route path="journals" element={<JournalVouchersPage />} />
          <Route path="user-management/users" element={<UserManagementPage view="users" />} />
          <Route path="user-management/roles" element={<UserManagementPage view="roles" />} />
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
    </Routes>
  )
}
