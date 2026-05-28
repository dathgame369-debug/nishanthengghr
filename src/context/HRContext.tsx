import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Employee, Advance, PayrollEntry, Department, Role } from '@/types/hr';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

type Setter<T> = React.Dispatch<React.SetStateAction<T[]>>;

interface HRContextType {
  isLoggedIn: boolean;
  loading: boolean;
  session: Session | null;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  employees: Employee[];
  setEmployees: Setter<Employee>;
  advances: Advance[];
  setAdvances: Setter<Advance>;
  payroll: PayrollEntry[];
  setPayroll: Setter<PayrollEntry>;
  departments: Department[];
  setDepartments: Setter<Department>;
  roles: Role[];
  setRoles: Setter<Role>;
}

const HRContext = createContext<HRContextType | null>(null);

// ---- Row mappers (DB snake_case <-> app camelCase) ----
const empToRow = (e: Employee) => ({
  id: e.id, name: e.name, fixed_salary: e.fixedSalary, date_of_joining: e.dateOfJoining,
  department: e.department, designation: e.designation, phone: e.phone, status: e.status,
  hra: e.hra ?? 0, special_allowance: e.specialAllowance ?? 0,
  medical_allowance: e.medicalAllowance ?? 0, travel_allowance: e.travelAllowance ?? 0,
  other_earnings: e.otherEarnings ?? 0,
  pf: e.pf ?? 0, esi: e.esi ?? 0, professional_tax: e.professionalTax ?? 0,
  loan_recovery: e.loanRecovery ?? 0, other_deductions: e.otherDeductions ?? 0,
});
const empFromRow = (r: any): Employee => ({
  id: r.id, name: r.name, fixedSalary: Number(r.fixed_salary), dateOfJoining: r.date_of_joining || '',
  department: r.department || '', designation: r.designation || '', phone: r.phone || '',
  status: (r.status as 'Active' | 'Inactive') || 'Active',
  hra: Number(r.hra ?? 0),
  specialAllowance: Number(r.special_allowance ?? 0),
  medicalAllowance: Number(r.medical_allowance ?? 0),
  travelAllowance: Number(r.travel_allowance ?? 0),
  otherEarnings: Number(r.other_earnings ?? 0),
  pf: Number(r.pf ?? 0),
  esi: Number(r.esi ?? 0),
  professionalTax: Number(r.professional_tax ?? 0),
  loanRecovery: Number(r.loan_recovery ?? 0),
  otherDeductions: Number(r.other_deductions ?? 0),
});
const advToRow = (a: Advance) => ({
  id: a.id, employee_id: a.employeeId, employee_name: a.employeeName, advance_date: a.advanceDate,
  advance_amount: a.advanceAmount, deduction_type: a.deductionType,
  monthly_deduction_amount: a.monthlyDeductionAmount, total_deducted: a.totalDeducted,
  remaining_balance: a.remainingBalance, notes: a.notes, status: a.status,
  deduction_history: a.deductionHistory as any,
});
const advFromRow = (r: any): Advance => ({
  id: r.id, employeeId: r.employee_id, employeeName: r.employee_name,
  advanceDate: r.advance_date || '', advanceAmount: Number(r.advance_amount),
  deductionType: (r.deduction_type as 'Manual' | 'EMI') || 'Manual',
  monthlyDeductionAmount: Number(r.monthly_deduction_amount),
  totalDeducted: Number(r.total_deducted), remainingBalance: Number(r.remaining_balance),
  notes: r.notes || '', status: (r.status as 'Active' | 'Closed') || 'Active',
  deductionHistory: Array.isArray(r.deduction_history) ? r.deduction_history : [],
});
const payToRow = (p: PayrollEntry) => ({
  id: p.id, employee_id: p.employeeId, employee_name: p.employeeName, date: p.date,
  month: p.month, year: p.year, monthly_salary: p.monthlySalary,
  present_days: p.presentDays, present_amount: p.presentAmount,
  holidays: p.holidays, holiday_amount: p.holidayAmount,
  ot_hours: p.otHours, ot_amount: p.otAmount, welfare_amount: p.welfareAmount,
  advance_deduction: p.advanceDeduction, bonus: p.bonus, net_payable: p.netPayable,
});
const payFromRow = (r: any): PayrollEntry => ({
  id: r.id, employeeId: r.employee_id, employeeName: r.employee_name,
  date: r.date || '', month: r.month, year: r.year,
  monthlySalary: Number(r.monthly_salary), presentDays: Number(r.present_days),
  presentAmount: Number(r.present_amount), holidays: Number(r.holidays),
  holidayAmount: Number(r.holiday_amount), otHours: Number(r.ot_hours),
  otAmount: Number(r.ot_amount), welfareAmount: Number(r.welfare_amount),
  advanceDeduction: Number(r.advance_deduction), bonus: Number(r.bonus),
  netPayable: Number(r.net_payable),
});
const deptFromRow = (r: any): Department => ({ id: r.id, name: r.name, status: r.status });
const deptToRow = (d: Department) => ({ id: d.id, name: d.name, status: d.status });
const roleFromRow = (r: any): Role => ({
  id: r.id, name: r.name, department: r.department || '', status: r.status,
  welfareEnabled: !!r.welfare_enabled,
  welfareRate: Number(r.welfare_rate ?? 0),
  welfareBasisHours: Number(r.welfare_basis_hours ?? 4),
});
const roleToRow = (r: Role) => ({
  id: r.id, name: r.name, department: r.department, status: r.status,
  welfare_enabled: !!r.welfareEnabled,
  welfare_rate: Number(r.welfareRate ?? 0),
  welfare_basis_hours: Number(r.welfareBasisHours ?? 4),
});

// Diff helper: figure out adds / updates / deletes between prev & next
function diffArrays<T extends { id: string }>(prev: T[], next: T[]) {
  const prevMap = new Map(prev.map(x => [x.id, x]));
  const nextMap = new Map(next.map(x => [x.id, x]));
  const toUpsert: T[] = [];
  const toDelete: string[] = [];
  for (const [id, item] of nextMap) {
    const old = prevMap.get(id);
    if (!old || JSON.stringify(old) !== JSON.stringify(item)) toUpsert.push(item);
  }
  for (const id of prevMap.keys()) if (!nextMap.has(id)) toDelete.push(id);
  return { toUpsert, toDelete };
}

export function HRProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployeesState] = useState<Employee[]>([]);
  const [advances, setAdvancesState] = useState<Advance[]>([]);
  const [payroll, setPayrollState] = useState<PayrollEntry[]>([]);
  const [departments, setDepartmentsState] = useState<Department[]>([]);
  const [roles, setRolesState] = useState<Role[]>([]);

  const isLoggedIn = !!session;

  // Auth bootstrap
  useEffect(() => {
    const savedSession = localStorage.getItem('hr_session');
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch (e) {
        console.error('Failed to parse saved session', e);
      }
    }
    setAuthReady(true);
  }, []);

  // Load data when logged in
  useEffect(() => {
    if (!session) {
      setEmployeesState([]); setAdvancesState([]); setPayrollState([]);
      setDepartmentsState([]); setRolesState([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [emp, adv, pay, dep, rol] = await Promise.all([
        supabase.from('employees').select('*').order('id'),
        supabase.from('advances').select('*').order('created_at'),
        supabase.from('payroll').select('*').order('created_at'),
        supabase.from('departments').select('*').order('id'),
        supabase.from('roles').select('*').order('id'),
      ]);
      if (cancelled) return;
      setEmployeesState((emp.data || []).map(empFromRow));
      setAdvancesState((adv.data || []).map(advFromRow));
      setPayrollState((pay.data || []).map(payFromRow));
      setDepartmentsState((dep.data || []).map(deptFromRow));
      setRolesState((rol.data || []).map(roleFromRow));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [session]);

  // Generic syncing setter factory
  function makeSetter<T extends { id: string }>(
    table: 'employees' | 'advances' | 'payroll' | 'departments' | 'roles',
    setLocal: React.Dispatch<React.SetStateAction<T[]>>,
    toRow: (x: T) => any,
    getCurrent: () => T[],
  ): Setter<T> {
    return (action: React.SetStateAction<T[]>) => {
      setLocal(prev => {
        const next = typeof action === 'function' ? (action as (p: T[]) => T[])(prev) : action;
        const { toUpsert, toDelete } = diffArrays(prev, next);
        if (toUpsert.length) {
          supabase.from(table).upsert(toUpsert.map(toRow)).then(({ error }) => {
            if (error) console.error(`[${table}] upsert failed`, error);
          });
        }
        if (toDelete.length) {
          supabase.from(table).delete().in('id', toDelete).then(({ error }) => {
            if (error) console.error(`[${table}] delete failed`, error);
          });
        }
        return next;
      });
    };
  }

  const empRef = useRef(employees); empRef.current = employees;
  const advRef = useRef(advances); advRef.current = advances;
  const payRef = useRef(payroll); payRef.current = payroll;
  const depRef = useRef(departments); depRef.current = departments;
  const rolRef = useRef(roles); rolRef.current = roles;

  const setEmployees = useCallback(makeSetter<Employee>('employees', setEmployeesState, empToRow, () => empRef.current), []);
  const setAdvances = useCallback(makeSetter<Advance>('advances', setAdvancesState, advToRow, () => advRef.current), []);
  const setPayroll = useCallback(makeSetter<PayrollEntry>('payroll', setPayrollState, payToRow, () => payRef.current), []);
  const setDepartments = useCallback(makeSetter<Department>('departments', setDepartmentsState, deptToRow, () => depRef.current), []);
  const setRoles = useCallback(makeSetter<Role>('roles', setRolesState, roleToRow, () => rolRef.current), []);

  const login = useCallback(async (username: string, password: string) => {
    const { data, error } = await supabase
      .from('login_credentials')
      .select('username')
      .eq('username', username)
      .eq('password', password)
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message };
    }
    if (!data) {
      return { ok: false, error: 'Invalid username or password' };
    }

    const dummySession = { user: { email: username } } as unknown as Session;
    setSession(dummySession);
    localStorage.setItem('hr_session', JSON.stringify(dummySession));
    return { ok: true };
  }, []);

  const signUp = useCallback(async (username: string, password: string) => {
    const { error } = await supabase
      .from('login_credentials')
      .insert({ username, password });

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    setSession(null);
    localStorage.removeItem('hr_session');
  }, []);

  if (!authReady) return null;

  return (
    <HRContext.Provider value={{
      isLoggedIn, loading, session, login, signUp, logout,
      employees, setEmployees, advances, setAdvances, payroll, setPayroll,
      departments, setDepartments, roles, setRoles,
    }}>
      {children}
    </HRContext.Provider>
  );
}

export function useHR() {
  const ctx = useContext(HRContext);
  if (!ctx) throw new Error('useHR must be used within HRProvider');
  return ctx;
}
