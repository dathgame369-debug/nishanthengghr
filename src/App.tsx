import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HRProvider } from "@/context/HRContext";
import { QuotationProvider } from "@/context/QuotationContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AddEmployeePage from "./pages/AddEmployeePage";
import EmployeeListPage from "./pages/EmployeeListPage";
import PayrollPage from "./pages/PayrollPage";
import AdvanceManagementPage from "./pages/AdvanceManagementPage";
import PayslipPage from "./pages/PayslipPage";
import DocumentationCenterPage from "./pages/DocumentationCenterPage";
import UserManagementPage from "./pages/UserManagementPage";
import SettingsPage from "./pages/SettingsPage";
import CompanySettingsPage from "./pages/CompanySettingsPage";
import QuotationDashboard from "./pages/quotation/QuotationDashboard";
import QuotationListPage from "./pages/quotation/QuotationListPage";
import QuotationEditorPage from "./pages/quotation/QuotationEditorPage";
import CustomersPage from "./pages/quotation/CustomersPage";
import QuotationSettingsPage from "./pages/quotation/QuotationSettingsPage";
import AppLayout from "./components/AppLayout";
import NotFound from "./pages/NotFound";
import ReportsPage from "./pages/ReportsPage";
import CreateReportPage from "./pages/reports/CreateReportPage";
import { ReportProvider } from "./context/ReportContext";
import { useHR } from "./context/HRContext";
import { PermissionKey } from "./types/hr";

const queryClient = new QueryClient();

function PermGuard({ permission, children }: { permission: PermissionKey; children: React.ReactNode }) {
  const { canAccess, isLoggedIn } = useHR();
  if (!isLoggedIn) return <Navigate to="/" replace />;
  if (!canAccess(permission)) {
    const fallback = canAccess('quotations') ? '/quotations/dashboard'
                   : canAccess('reports') ? '/reports'
                   : canAccess('customers') ? '/customers'
                   : canAccess('dashboard') ? '/dashboard'
                   : '/';
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HRProvider>
        <QuotationProvider>
          <ReportProvider>
            <BrowserRouter>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route element={<AppLayout />}>
                {/* HR Modules */}
                <Route path="/dashboard" element={<PermGuard permission="dashboard"><DashboardPage /></PermGuard>} />
                <Route path="/add-employee" element={<PermGuard permission="employees"><AddEmployeePage /></PermGuard>} />
                <Route path="/employees" element={<PermGuard permission="employees"><EmployeeListPage /></PermGuard>} />
                <Route path="/payroll" element={<PermGuard permission="payroll"><PayrollPage /></PermGuard>} />
                <Route path="/advances" element={<PermGuard permission="advances"><AdvanceManagementPage /></PermGuard>} />
                <Route path="/payslip" element={<PermGuard permission="payslip"><PayslipPage /></PermGuard>} />
                <Route path="/documentation-center" element={<PermGuard permission="documentation"><DocumentationCenterPage /></PermGuard>} />
                <Route path="/settings" element={<PermGuard permission="hr_settings"><SettingsPage /></PermGuard>} />

                {/* Quotation Modules */}
                <Route path="/quotations/dashboard" element={<PermGuard permission="quotations"><QuotationDashboard /></PermGuard>} />
                <Route path="/quotations" element={<PermGuard permission="quotations"><QuotationListPage /></PermGuard>} />
                <Route path="/quotations/new" element={<PermGuard permission="quotations"><QuotationEditorPage /></PermGuard>} />
                <Route path="/quotations/settings" element={<PermGuard permission="quotations"><QuotationSettingsPage /></PermGuard>} />
                <Route path="/quotations/:id" element={<PermGuard permission="quotations"><QuotationEditorPage /></PermGuard>} />

                {/* Clients & Reports */}
                <Route path="/customers" element={<PermGuard permission="customers"><CustomersPage /></PermGuard>} />
                <Route path="/reports" element={<PermGuard permission="reports"><ReportsPage /></PermGuard>} />
                <Route path="/reports/new" element={<PermGuard permission="reports"><CreateReportPage /></PermGuard>} />
                <Route path="/reports/:id" element={<PermGuard permission="reports"><CreateReportPage /></PermGuard>} />

                {/* Settings & Admin Modules */}
                <Route path="/company-settings" element={<PermGuard permission="company_settings"><CompanySettingsPage /></PermGuard>} />
                <Route path="/user-management" element={<PermGuard permission="user_management"><UserManagementPage /></PermGuard>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BrowserRouter>
          </ReportProvider>
        </QuotationProvider>
      </HRProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
