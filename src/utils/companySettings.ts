export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstNumber: string;
  logoDataUrl: string;
}

export interface PayslipComponents {
  hra: boolean;
  specialAllowance: boolean;
  medicalAllowance: boolean;
  travelAllowance: boolean;
  otherEarnings: boolean;
  pf: boolean;
  esi: boolean;
  professionalTax: boolean;
  loanRecovery: boolean;
  otherDeductions: boolean;
}

export const DEFAULT_COMPANY: CompanyInfo = {
  name: 'Nishanth Engineering Portal',
  address:
    '102/1, Subbanaickenpalayam School Street, Chinnavedampatti, Coimbatore, Tamil Nadu 641049',
  phone: '0422-2532130 / 94426 32130',
  email: '',
  gstNumber: '',
  logoDataUrl: '',
};

export const DEFAULT_PAYSLIP_COMPONENTS: PayslipComponents = {
  hra: false,
  specialAllowance: false,
  medicalAllowance: false,
  travelAllowance: false,
  otherEarnings: false,
  pf: false,
  esi: false,
  professionalTax: false,
  loanRecovery: false,
  otherDeductions: false,
};

const KEY_C = 'nem.companyInfo';
const KEY_P = 'nem.payslipComponents';
export const COMPANY_EVENT = 'nem-company-settings-changed';
export const COMPONENTS_EVENT = 'nem-payslip-components-changed';

export function getCompanyInfo(): CompanyInfo {
  try {
    return { ...DEFAULT_COMPANY, ...JSON.parse(localStorage.getItem(KEY_C) || '{}') };
  } catch {
    return DEFAULT_COMPANY;
  }
}
export function setCompanyInfo(c: CompanyInfo) {
  localStorage.setItem(KEY_C, JSON.stringify(c));
  window.dispatchEvent(new Event(COMPANY_EVENT));
}

export function getPayslipComponents(): PayslipComponents {
  try {
    return { ...DEFAULT_PAYSLIP_COMPONENTS, ...JSON.parse(localStorage.getItem(KEY_P) || '{}') };
  } catch {
    return DEFAULT_PAYSLIP_COMPONENTS;
  }
}
export function setPayslipComponents(p: PayslipComponents) {
  localStorage.setItem(KEY_P, JSON.stringify(p));
  window.dispatchEvent(new Event(COMPONENTS_EVENT));
}