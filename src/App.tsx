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
import { ActivityLogProvider } from "./context/ActivityLogContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HRProvider>
        <ActivityLogProvider>
        <QuotationProvider>
          <ReportProvider>
            <BrowserRouter>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/add-employee" element={<AddEmployeePage />} />
                <Route path="/employees" element={<EmployeeListPage />} />
                <Route path="/payroll" element={<PayrollPage />} />
                <Route path="/advances" element={<AdvanceManagementPage />} />
                <Route path="/payslip" element={<PayslipPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/company-settings" element={<CompanySettingsPage />} />
                <Route path="/quotations/dashboard" element={<QuotationDashboard />} />
                <Route path="/quotations" element={<QuotationListPage />} />
                <Route path="/quotations/new" element={<QuotationEditorPage />} />
                <Route path="/quotations/settings" element={<QuotationSettingsPage />} />
                <Route path="/quotations/:id" element={<QuotationEditorPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/reports/new" element={<CreateReportPage />} />
                <Route path="/reports/:id" element={<CreateReportPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BrowserRouter>
          </ReportProvider>
        </QuotationProvider>
        </ActivityLogProvider>
      </HRProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
