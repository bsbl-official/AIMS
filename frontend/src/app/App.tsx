import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { ChartOfAccountsPage } from '../pages/setup/chart-of-accounts/ChartOfAccountsPage'
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

export function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="accounts" element={<ChartOfAccountsPage />} />
          <Route path="journals" element={<JournalVouchersPage />} />
          <Route path="user-management/users" element={<UserManagementPage view="users" />} />
          <Route path="user-management/roles" element={<UserManagementPage view="roles" />} />
          <Route path="users" element={<Navigate to="/user-management/users" replace />} />
          <Route path="setup/company" element={<CompanySetupPage />} />
          <Route path="setup/branches" element={<BranchSetupPage />} />
          <Route path="setup/project-codes" element={<ProjectCodeSetupPage />} />
          <Route path="setup/finance-codes" element={<FinanceCodeSetupPage />} />
          <Route path="setup/component-codes" element={<ComponentCodeSetupPage />} />
          <Route path="setup/financial-statements" element={<FinancialStatementSetupPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
