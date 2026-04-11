import { useState } from 'react';
import { useHR } from '@/context/HRContext';
import { PayrollEntry, MONTHS, getYearOptions, calculatePayroll, formatCurrency } from '@/types/hr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, Plus, Save } from 'lucide-react';

export default function PayrollPage() {
  const { employees, payroll, setPayroll, advances, setAdvances } = useHR();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadMonth = () => {
    const existing = payroll.filter(p => p.month === selectedMonth && (p.year || currentYear) === selectedYear);
    if (existing.length > 0) {
      setEntries(existing);
    } else {
      const activeEmps = employees.filter(e => e.status === 'Active');
      const newEntries: PayrollEntry[] = activeEmps.map(emp => {
        const activeAdv = advances.find(a => a.employeeId === emp.id && a.status === 'Active');
        const advDed = activeAdv ? activeAdv.monthlyDeductionAmount : 0;
        const base = { monthlySalary: emp.fixedSalary, presentDays: 0, holidays: 0, otHours: 0, bonus: 0, advanceDeduction: advDed };
        const calc = calculatePayroll(base);
        return {
          id: `PAY-${emp.id}-${selectedMonth}-${selectedYear}`, employeeId: emp.id, employeeName: emp.name,
          date: new Date().toISOString().split('T')[0], month: selectedMonth, year: selectedYear,
          monthlySalary: emp.fixedSalary, presentDays: 0, holidays: 0, otHours: 0,
          advanceDeduction: advDed, bonus: 0, ...calc,
        };
      });
      setEntries(newEntries);
    }
    setLoaded(true);
  };

  const updateEntry = (idx: number, field: string, value: number) => {
    setEntries(prev => {
      const updated = [...prev];
      const entry = { ...updated[idx], [field]: value };
      const calc = calculatePayroll(entry);
      updated[idx] = { ...entry, ...calc };
      return updated;
    });
  };

  const savePayroll = () => {
    entries.forEach(entry => {
      if (entry.advanceDeduction > 0) {
        setAdvances(prev => prev.map(adv => {
          if (adv.employeeId === entry.employeeId && adv.status === 'Active') {
            const newDeducted = adv.totalDeducted + entry.advanceDeduction;
            const newBalance = adv.advanceAmount - newDeducted;
            return {
              ...adv, totalDeducted: newDeducted, remainingBalance: Math.max(0, newBalance),
              status: newBalance <= 0 ? 'Closed' : 'Active',
              deductionHistory: [...adv.deductionHistory, { month: `${selectedMonth} ${selectedYear}`, amount: entry.advanceDeduction }],
            };
          }
          return adv;
        }));
      }
    });

    setPayroll(prev => {
      const others = prev.filter(p => !(p.month === selectedMonth && (p.year || currentYear) === selectedYear));
      return [...others, ...entries];
    });
    toast({ title: 'Saved', description: `Payroll for ${selectedMonth} ${selectedYear} saved` });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">Monthly Payroll</h1>
            <p className="text-sm text-muted-foreground">Process monthly salary</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMonth} onValueChange={v => { setSelectedMonth(v); setLoaded(false); }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={v => { setSelectedYear(Number(v)); setLoaded(false); }}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{getYearOptions().map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={loadMonth} variant="outline"><Plus className="w-4 h-4 mr-2" /> Load</Button>
          {loaded && <Button onClick={savePayroll}><Save className="w-4 h-4 mr-2" /> Save Payroll</Button>}
        </div>
      </div>

      {loaded && entries.length > 0 && (
        <div className="bg-card rounded-xl card-shadow border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 text-xs">
                <TableHead>Emp ID</TableHead><TableHead>Name</TableHead><TableHead>Date</TableHead>
                <TableHead className="text-right">Salary</TableHead>
                <TableHead className="text-center">Present</TableHead><TableHead className="text-right">Pres. Amt</TableHead>
                <TableHead className="text-center">Holidays</TableHead><TableHead className="text-right">Hol. Amt</TableHead>
                <TableHead className="text-center">OT Hrs</TableHead><TableHead className="text-right">OT Amt</TableHead>
                <TableHead className="text-right">Welfare</TableHead>
                <TableHead className="text-center">Adv. Ded.</TableHead>
                <TableHead className="text-center">Bonus</TableHead>
                <TableHead className="text-right font-bold">Net Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, idx) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium text-primary text-sm">{entry.employeeId}</TableCell>
                  <TableCell className="text-sm font-medium">{entry.employeeName}</TableCell>
                  <TableCell><Input type="date" value={entry.date} onChange={e => { const v = e.target.value; setEntries(prev => prev.map((en, i) => i === idx ? { ...en, date: v } : en)); }} className="h-8 w-32 text-xs" /></TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(entry.monthlySalary)}</TableCell>
                  <TableCell><Input type="number" min="0" max="31" value={entry.presentDays} onChange={e => updateEntry(idx, 'presentDays', parseFloat(e.target.value) || 0)} className="h-8 w-16 text-center text-sm" /></TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(entry.presentAmount)}</TableCell>
                  <TableCell><Input type="number" min="0" max="10" value={entry.holidays} onChange={e => updateEntry(idx, 'holidays', parseFloat(e.target.value) || 0)} className="h-8 w-16 text-center text-sm" /></TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(entry.holidayAmount)}</TableCell>
                  <TableCell><Input type="number" min="0" value={entry.otHours} onChange={e => updateEntry(idx, 'otHours', parseFloat(e.target.value) || 0)} className="h-8 w-16 text-center text-sm" /></TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(entry.otAmount)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(entry.welfareAmount)}</TableCell>
                  <TableCell><Input type="number" min="0" value={entry.advanceDeduction} onChange={e => updateEntry(idx, 'advanceDeduction', parseFloat(e.target.value) || 0)} className="h-8 w-20 text-center text-sm" /></TableCell>
                  <TableCell><Input type="number" min="0" value={entry.bonus} onChange={e => updateEntry(idx, 'bonus', parseFloat(e.target.value) || 0)} className="h-8 w-20 text-center text-sm" /></TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold text-primary">{formatCurrency(entry.netPayable)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {loaded && entries.length === 0 && (
        <div className="bg-card rounded-xl p-12 text-center card-shadow border border-border">
          <p className="text-muted-foreground">No active employees. Add employees first.</p>
        </div>
      )}

      {!loaded && (
        <div className="bg-card rounded-xl p-12 text-center card-shadow border border-border">
          <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Select a month & year and click Load to begin</p>
        </div>
      )}
    </div>
  );
}
