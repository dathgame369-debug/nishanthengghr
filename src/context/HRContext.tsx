import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Employee, Advance, PayrollEntry, Department, Role, DEFAULT_DEPARTMENTS, DEFAULT_DESIGNATIONS } from '@/types/hr';

interface HRContextType {
  isLoggedIn: boolean;
  login: (user: string, pass: string) => boolean;
  logout: () => void;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  advances: Advance[];
  setAdvances: React.Dispatch<React.SetStateAction<Advance[]>>;
  payroll: PayrollEntry[];
  setPayroll: React.Dispatch<React.SetStateAction<PayrollEntry[]>>;
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  roles: Role[];
  setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
}

const HRContext = createContext<HRContextType | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch { return fallback; }
}

const defaultDepts: Department[] = DEFAULT_DEPARTMENTS.map((d, i) => ({ id: `DEPT${String(i + 1).padStart(3, '0')}`, name: d, status: 'Active' }));
const defaultRoles: Role[] = DEFAULT_DESIGNATIONS.map((r, i) => ({ id: `ROLE${String(i + 1).padStart(3, '0')}`, name: r, department: '', status: 'Active' }));

export function HRProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => load('hr_logged_in', false));
  const [employees, setEmployees] = useState<Employee[]>(() => load('hr_employees', []));
  const [advances, setAdvances] = useState<Advance[]>(() => load('hr_advances', []));
  const [payroll, setPayroll] = useState<PayrollEntry[]>(() => load('hr_payroll', []));
  const [departments, setDepartments] = useState<Department[]>(() => load('hr_departments', defaultDepts));
  const [roles, setRoles] = useState<Role[]>(() => load('hr_roles', defaultRoles));

  useEffect(() => { localStorage.setItem('hr_employees', JSON.stringify(employees)); }, [employees]);
  useEffect(() => { localStorage.setItem('hr_advances', JSON.stringify(advances)); }, [advances]);
  useEffect(() => { localStorage.setItem('hr_payroll', JSON.stringify(payroll)); }, [payroll]);
  useEffect(() => { localStorage.setItem('hr_logged_in', JSON.stringify(isLoggedIn)); }, [isLoggedIn]);
  useEffect(() => { localStorage.setItem('hr_departments', JSON.stringify(departments)); }, [departments]);
  useEffect(() => { localStorage.setItem('hr_roles', JSON.stringify(roles)); }, [roles]);

  const login = useCallback((user: string, pass: string) => {
    if (user === 'admin' && pass === 'admin123') {
      setIsLoggedIn(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => setIsLoggedIn(false), []);

  return (
    <HRContext.Provider value={{ isLoggedIn, login, logout, employees, setEmployees, advances, setAdvances, payroll, setPayroll, departments, setDepartments, roles, setRoles }}>
      {children}
    </HRContext.Provider>
  );
}

export function useHR() {
  const ctx = useContext(HRContext);
  if (!ctx) throw new Error('useHR must be used within HRProvider');
  return ctx;
}
