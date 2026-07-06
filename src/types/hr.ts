export interface Employee {
  id: string;
  name: string;
  fixedSalary: number;
  dateOfJoining: string;
  department: string;
  designation: string;
  phone: string;
  status: 'Active' | 'Inactive';
  // Optional payslip components (per-employee). Used only when enabled in Company Settings.
  hra?: number;
  specialAllowance?: number;
  medicalAllowance?: number;
  travelAllowance?: number;
  otherEarnings?: number;
  pf?: number;
  esi?: number;
  professionalTax?: number;
  loanRecovery?: number;
  otherDeductions?: number;
}

export interface AdvanceHistoryEntry {
  month?: string; // e.g., "July 2026" for payroll deductions
  date?: string;  // e.g., "2026-07-15" for additions
  amount: number;
  isAddition?: boolean;
}

export interface Advance {
  id: string;
  employeeId: string;
  employeeName: string;
  advanceDate: string;
  advanceAmount: number;
  deductionType: 'Manual' | 'EMI';
  monthlyDeductionAmount: number;
  totalDeducted: number;
  remainingBalance: number;
  notes: string;
  status: 'Active' | 'Closed';
  deductionHistory: AdvanceHistoryEntry[];
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  month: string;
  year: number;
  modeOfPayment: string;
  monthlySalary: number;
  presentDays: number;
  presentAmount: number;
  holidays: number;
  holidayAmount: number;
  otHours: number;
  otAmount: number;
  welfareAmount: number;
  advanceDeduction: number;
  noOfLeaves?: number;
  bonus: number;
  netPayable: number;
}

export interface Department {
  id: string;
  name: string;
  status: 'Active' | 'Inactive';
}

export interface Role {
  id: string;
  name: string;
  department: string;
  status: 'Active' | 'Inactive';
  welfareEnabled: boolean;
  welfareRate: number;
  welfareBasisHours: number;
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DEFAULT_DEPARTMENTS = [
  'Production', 'Maintenance', 'Quality', 'Admin', 'HR', 'Accounts', 'Sales', 'Store'
];

export const DEFAULT_DESIGNATIONS = [
  'Manager', 'Supervisor', 'Operator', 'Technician', 'Helper', 'Clerk', 'Engineer', 'Foreman'
];

export function getYearOptions(): number[] {
  const current = new Date().getFullYear();
  return [current - 2, current - 1, current, current + 1];
}

export function calculatePayroll(
  entry: Partial<PayrollEntry> & { monthlySalary: number },
  welfare?: { enabled: boolean; rate: number; basisHours: number }
): {
  presentAmount: number;
  holidayAmount: number;
  otAmount: number;
  welfareAmount: number;
  netPayable: number;
} {
  const perDay = entry.monthlySalary / 26;
  const perHour = perDay / 8;
  const presentAmount = perDay * (entry.presentDays || 0);
  const holidayAmount = perDay * (entry.holidays || 0);
  const otAmount = perHour * (entry.otHours || 0);
  let welfareAmount = 0;
  if (welfare && welfare.enabled && welfare.basisHours > 0) {
    welfareAmount = ((entry.otHours || 0) / welfare.basisHours) * welfare.rate;
  }
  const netPayable = Math.round(presentAmount + holidayAmount + otAmount + welfareAmount + (entry.bonus || 0) - (entry.advanceDeduction || 0));
  return { presentAmount, holidayAmount, otAmount, welfareAmount, netPayable };
}

export function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generateEmployeeId(employees: Employee[]): string {
  const maxNum = employees.reduce((max, emp) => {
    const num = parseInt(emp.id.replace('EMP', ''), 10);
    return num > max ? num : max;
  }, 0);
  return `EMP${String(maxNum + 1).padStart(3, '0')}`;
}
