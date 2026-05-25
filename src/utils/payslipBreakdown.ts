import { PayrollEntry, Advance } from '@/types/hr';

export interface PayslipLine {
  label: string;
  amount: number;
}

export interface PayslipBreakdown {
  earnings: PayslipLine[];
  deductions: PayslipLine[];
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
}

// Map current PayrollEntry fields onto the richer payslip layout
// (Basic/HRA/Special/Medical/Travel/Overtime/Incentives/Bonus/Other earnings;
// PF/ESI/Prof Tax/Advance Recovery/Loan Recovery/Other deductions).
// Optional structured fields can be added later — until then unspecified rows
// render as 0 so the layout matches the spec.
export function buildPayslipBreakdown(entry: PayrollEntry, adv?: Advance): PayslipBreakdown {
  const e: any = entry;

  const basic = e.basic ?? (entry.presentAmount + entry.holidayAmount); // attendance-derived basic
  const hra = e.hra ?? 0;
  const special = e.specialAllowance ?? 0;
  const medical = e.medicalAllowance ?? 0;
  const travel = e.travelAllowance ?? 0;
  const overtime = entry.otAmount || 0;
  const incentives = e.incentives ?? entry.welfareAmount ?? 0;
  const bonus = entry.bonus || 0;
  const otherEarn = e.otherEarnings ?? 0;

  const earnings: PayslipLine[] = [
    { label: 'Basic Salary', amount: basic },
    { label: 'HRA', amount: hra },
    { label: 'Special Allowance', amount: special },
    { label: 'Medical Allowance', amount: medical },
    { label: 'Travel Allowance', amount: travel },
    { label: 'Overtime', amount: overtime },
    { label: 'Incentives', amount: incentives },
    { label: 'Bonus', amount: bonus },
    { label: 'Other Earnings', amount: otherEarn },
  ];

  const pf = e.pf ?? 0;
  const esi = e.esi ?? 0;
  const profTax = e.professionalTax ?? 0;
  const advanceRecovery = entry.advanceDeduction || 0;
  const loanRecovery = e.loanRecovery ?? 0;
  const otherDed = e.otherDeductions ?? 0;

  const deductions: PayslipLine[] = [
    { label: 'PF', amount: pf },
    { label: 'ESI', amount: esi },
    { label: 'Professional Tax', amount: profTax },
    { label: 'Advance Recovery', amount: advanceRecovery },
    { label: 'Loan Recovery', amount: loanRecovery },
    { label: 'Other Deductions', amount: otherDed },
  ];

  const grossSalary = earnings.reduce((s, r) => s + r.amount, 0);
  const totalDeductions = deductions.reduce((s, r) => s + r.amount, 0);
  const netSalary = grossSalary - totalDeductions;

  return { earnings, deductions, grossSalary, totalDeductions, netSalary };
}

export function advanceSummary(adv?: Advance) {
  return {
    totalDeducted: adv?.totalDeducted || 0,
    remaining: adv ? Math.max(0, adv.advanceAmount - adv.totalDeducted) : 0,
  };
}