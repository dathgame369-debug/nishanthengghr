import { PayrollEntry, Advance } from '@/types/hr';
import { PayslipComponents, getPayslipComponents } from '@/utils/companySettings';

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
export function buildPayslipBreakdown(
  entry: PayrollEntry,
  adv?: Advance,
  components?: PayslipComponents,
): PayslipBreakdown {
  const cfg = components || getPayslipComponents();
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

  const allEarnings: Array<PayslipLine & { on: boolean }> = [
    { label: 'Basic Salary', amount: basic, on: true },
    { label: 'HRA', amount: hra, on: cfg.hra },
    { label: 'Special Allowance', amount: special, on: cfg.specialAllowance },
    { label: 'Medical Allowance', amount: medical, on: cfg.medicalAllowance },
    { label: 'Travel Allowance', amount: travel, on: cfg.travelAllowance },
    { label: 'Overtime', amount: overtime, on: true },
    { label: 'Incentives', amount: incentives, on: true },
    { label: 'Bonus', amount: bonus, on: true },
    { label: 'Other Earnings', amount: otherEarn, on: cfg.otherEarnings },
  ];
  const earnings: PayslipLine[] = allEarnings.filter(r => r.on).map(({ label, amount }) => ({ label, amount }));

  const pf = e.pf ?? 0;
  const esi = e.esi ?? 0;
  const profTax = e.professionalTax ?? 0;
  const advanceRecovery = entry.advanceDeduction || 0;
  const loanRecovery = e.loanRecovery ?? 0;
  const otherDed = e.otherDeductions ?? 0;

  const allDeductions: Array<PayslipLine & { on: boolean }> = [
    { label: 'PF', amount: pf, on: cfg.pf },
    { label: 'ESI', amount: esi, on: cfg.esi },
    { label: 'Professional Tax', amount: profTax, on: cfg.professionalTax },
    { label: 'Advance Recovery', amount: advanceRecovery, on: true },
    { label: 'Loan Recovery', amount: loanRecovery, on: cfg.loanRecovery },
    { label: 'Other Deductions', amount: otherDed, on: cfg.otherDeductions },
  ];
  const deductions: PayslipLine[] = allDeductions.filter(r => r.on).map(({ label, amount }) => ({ label, amount }));

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