import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHR } from '@/context/HRContext';
import { MONTHS, getYearOptions, formatCurrency } from '@/types/hr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Users, DollarSign, Clock, Gift, Wallet, Search, UserPlus, Download, FileText, FileSpreadsheet, Eye } from 'lucide-react';
import { generatePayslipPDF, generateBulkPayslipPDF, exportPayrollExcel, exportPayrollPDF } from '@/utils/pdfExport';

export default function DashboardPage() {
  const { employees, payroll, advances } = useHR();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [search, setSearch] = useState('');

  const monthEntries = payroll.filter(p => p.month === selectedMonth && (p.year || currentYear) === selectedYear);
  const filtered = monthEntries.filter(e =>
    e.employeeName.toLowerCase().includes(search.toLowerCase()) || e.employeeId.toLowerCase().includes(search.toLowerCase())
  );

  const totalPayroll = monthEntries.reduce((s, e) => s + e.netPayable, 0);
  const totalOT = monthEntries.reduce((s, e) => s + e.otAmount, 0);
  const totalBonus = monthEntries.reduce((s, e) => s + e.bonus, 0);
  const totalAdvance = advances.filter(a => a.status === 'Active').reduce((s, a) => s + a.remainingBalance, 0);

  const stats = [
    { label: 'Total Employees', value: employees.length, icon: Users, color: 'bg-primary' },
    { label: 'Total Payroll', value: formatCurrency(totalPayroll), icon: DollarSign, color: 'bg-accent' },
    { label: 'Total OT Amount', value: formatCurrency(totalOT), icon: Clock, color: 'bg-info' },
    { label: 'Total Bonus', value: formatCurrency(totalBonus), icon: Gift, color: 'bg-success' },
    { label: 'Outstanding Advances', value: formatCurrency(totalAdvance), icon: Wallet, color: 'bg-warning' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Nishanth Engineering Works — HR Overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {stats.map(s => (
          <Card key={s.label} className="card-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center`}>
                <s.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-card rounded-xl p-4 card-shadow border border-border mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{getYearOptions().map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee..." className="pl-9" />
          </div>
          <div className="ml-auto flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => navigate('/add-employee')}><UserPlus className="w-4 h-4 mr-1" /> Add Employee</Button>
            <Button variant="outline" size="sm" onClick={() => exportPayrollPDF(monthEntries)}><Download className="w-4 h-4 mr-1" /> PDF</Button>
            <Button variant="outline" size="sm" onClick={() => exportPayrollExcel(monthEntries)}><FileSpreadsheet className="w-4 h-4 mr-1" /> Excel</Button>
            <Button size="sm" onClick={() => generateBulkPayslipPDF(monthEntries, employees, 'compact')}><FileText className="w-4 h-4 mr-1" /> Bulk Payslips</Button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 text-xs">
              <TableHead>Emp ID</TableHead><TableHead>Name</TableHead><TableHead>Month</TableHead>
              <TableHead className="text-right">Salary</TableHead>
              <TableHead className="text-center">Present</TableHead><TableHead className="text-right">Pres Amt</TableHead>
              <TableHead className="text-center">Hol</TableHead><TableHead className="text-right">Hol Amt</TableHead>
              <TableHead className="text-center">OT</TableHead><TableHead className="text-right">OT Amt</TableHead>
              <TableHead className="text-right">Welfare</TableHead><TableHead className="text-right">Adv Ded</TableHead>
              <TableHead className="text-right">Bonus</TableHead>
              <TableHead className="text-right font-bold">Net Pay</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(e => (
              <TableRow key={e.id}>
                <TableCell className="font-medium text-primary text-sm">{e.employeeId}</TableCell>
                <TableCell className="text-sm">{e.employeeName}</TableCell>
                <TableCell className="text-sm">{e.month} {e.year}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(e.monthlySalary)}</TableCell>
                <TableCell className="text-center text-sm">{e.presentDays}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(e.presentAmount)}</TableCell>
                <TableCell className="text-center text-sm">{e.holidays}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(e.holidayAmount)}</TableCell>
                <TableCell className="text-center text-sm">{e.otHours}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(e.otAmount)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(e.welfareAmount)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(e.advanceDeduction)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(e.bonus)}</TableCell>
                <TableCell className="text-right font-mono text-sm font-bold text-primary">{formatCurrency(e.netPayable)}</TableCell>
                <TableCell className="text-center">
                  <div className="flex gap-1 justify-center">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate('/payslip')}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => generatePayslipPDF(e, employees)}>
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                {monthEntries.length === 0 ? 'No payroll data for this month' : 'No matching results'}
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
