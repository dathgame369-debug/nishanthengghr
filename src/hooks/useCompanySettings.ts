import { useEffect, useState } from 'react';
import {
  CompanyInfo, PayslipComponents,
  getCompanyInfo, setCompanyInfo, getPayslipComponents, setPayslipComponents,
  COMPANY_EVENT, COMPONENTS_EVENT,
} from '@/utils/companySettings';

export function useCompanyInfo() {
  const [c, setC] = useState<CompanyInfo>(getCompanyInfo);
  useEffect(() => {
    const h = () => setC(getCompanyInfo());
    window.addEventListener(COMPANY_EVENT, h);
    window.addEventListener('storage', h);
    return () => {
      window.removeEventListener(COMPANY_EVENT, h);
      window.removeEventListener('storage', h);
    };
  }, []);
  return [c, (n: CompanyInfo) => { setCompanyInfo(n); setC(n); }] as const;
}

export function usePayslipComponents() {
  const [c, setC] = useState<PayslipComponents>(getPayslipComponents);
  useEffect(() => {
    const h = () => setC(getPayslipComponents());
    window.addEventListener(COMPONENTS_EVENT, h);
    window.addEventListener('storage', h);
    return () => {
      window.removeEventListener(COMPONENTS_EVENT, h);
      window.removeEventListener('storage', h);
    };
  }, []);
  return [c, (n: PayslipComponents) => { setPayslipComponents(n); setC(n); }] as const;
}