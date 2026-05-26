import { PayslipComponents } from '@/utils/companySettings';

export interface ComponentAmounts {
  hra: number;
  specialAllowance: number;
  medicalAllowance: number;
  travelAllowance: number;
  otherEarnings: number;
  pf: number;
  esi: number;
  professionalTax: number;
  loanRecovery: number;
  otherDeductions: number;
}

// Standard Indian payroll formulas, applied on top of a "basic" (fixed) salary.
// All values are rounded to 2 decimals. Components disabled in settings return 0.
export function computeComponentDefaults(
  fixedSalary: number,
  cfg: PayslipComponents,
): ComponentAmounts {
  const basic = Math.max(0, fixedSalary || 0);
  const r2 = (n: number) => Math.round(n * 100) / 100;

  // HRA = 40% of basic (non-metro standard)
  const hra = cfg.hra ? r2(basic * 0.4) : 0;
  // Medical allowance: ₹1,250/month standard
  const medicalAllowance = cfg.medicalAllowance ? 1250 : 0;
  // Travel/Conveyance allowance: ₹1,600/month standard
  const travelAllowance = cfg.travelAllowance ? 1600 : 0;
  // Special allowance: balance of basic (10%)
  const specialAllowance = cfg.specialAllowance ? r2(basic * 0.1) : 0;
  const otherEarnings = 0;

  // PF = 12% of basic, capped at ₹1,800 (salary ceiling ₹15,000)
  const pf = cfg.pf ? Math.min(r2(basic * 0.12), 1800) : 0;
  // ESI = 0.75% of gross, only if basic ≤ ₹21,000
  const esi = cfg.esi && basic > 0 && basic <= 21000 ? r2(basic * 0.0075) : 0;
  // Professional tax: ₹200/month if basic ≥ ₹15,000
  const professionalTax = cfg.professionalTax ? (basic >= 15000 ? 200 : basic > 0 ? 150 : 0) : 0;
  const loanRecovery = 0;
  const otherDeductions = 0;

  return {
    hra, specialAllowance, medicalAllowance, travelAllowance, otherEarnings,
    pf, esi, professionalTax, loanRecovery, otherDeductions,
  };
}

export const COMPONENT_LABELS: Record<keyof ComponentAmounts, string> = {
  hra: 'HRA',
  specialAllowance: 'Special Allowance',
  medicalAllowance: 'Medical Allowance',
  travelAllowance: 'Travel Allowance',
  otherEarnings: 'Other Earnings',
  pf: 'PF',
  esi: 'ESI',
  professionalTax: 'Professional Tax',
  loanRecovery: 'Loan Recovery',
  otherDeductions: 'Other Deductions',
};

export const COMPONENT_FORMULA_HINT: Record<keyof ComponentAmounts, string> = {
  hra: '40% of basic',
  specialAllowance: '10% of basic',
  medicalAllowance: '₹1,250 fixed',
  travelAllowance: '₹1,600 fixed',
  otherEarnings: 'manual',
  pf: '12% of basic (cap ₹1,800)',
  esi: '0.75% if basic ≤ ₹21,000',
  professionalTax: '₹200 if basic ≥ ₹15,000',
  loanRecovery: 'manual',
  otherDeductions: 'manual',
};
