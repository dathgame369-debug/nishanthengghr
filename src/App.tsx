import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HRProvider } from "@/context/HRContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AddEmployeePage from "./pages/AddEmployeePage";
import EmployeeListPage from "./pages/EmployeeListPage";
import PayrollPage from "./pages/PayrollPage";
import AdvanceManagementPage from "./pages/AdvanceManagementPage";
import PayslipPage from "./pages/PayslipPage";
import AppLayout from "./components/AppLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HRProvider>
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
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </HRProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
