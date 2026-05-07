import { PayrollEntry, formatCurrency } from '@/types/hr';
import { useHR } from '@/context/HRContext';

interface PayslipProps {
  entry: PayrollEntry;
  compact?: boolean;
}

export default function PayslipTemplate({ entry, compact = false }: PayslipProps) {
  const { employees, advances } = useHR();
  const emp = employees.find(e => e.id === entry.employeeId);
  const adv = advances.find(a => a.employeeId === entry.employeeId);
  const totalAdvAmount = adv?.advanceAmount || 0;
  const totalDeducted = adv?.totalDeducted || 0;
  const remainingAdv = adv ? Math.max(0, adv.advanceAmount - adv.totalDeducted) : 0;
  const grossEarnings = entry.presentAmount + entry.holidayAmount + entry.otAmount + entry.welfareAmount + entry.bonus;

  const py = compact ? 'py-1.5' : 'py-2';
  const text = compact ? 'text-[10px]' : 'text-xs';
  const headText = compact ? 'text-sm' : 'text-lg';

  return (
    <div className={`border border-foreground/20 rounded-lg ${compact ? 'p-3' : 'p-6'} bg-card font-sans`} style={{ pageBreakInside: 'avoid' }}>
      {/* Header */}
      <div className="text-center border-b border-foreground/15 pb-3 mb-3">
        <h2 className={`${headText} font-bold font-heading text-foreground`}>Nishanth Engineering Works</h2>
        <p className={`${text} text-muted-foreground leading-tight`}>
          102/1, Subbanaickenpalayam School, Street, Chinnavedampatti, Coimbatore, Tamil Nadu 641049
        </p>
        <div className={`mt-2 inline-block px-4 ${compact ? 'py-0.5' : 'py-1'} bg-primary text-primary-foreground rounded ${text} font-semibold tracking-wide`}>
          PAYSLIP — {entry.month}
        </div>
      </div>

      {/* Employee Info */}
      <div className={`grid grid-cols-2 gap-x-4 gap-y-1 ${text} mb-3 border-b border-foreground/10 pb-3`}>
        <div><span className="text-muted-foreground">Employee ID:</span> <span className="font-medium">{entry.employeeId}</span></div>
        <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{entry.employeeName}</span></div>
        <div><span className="text-muted-foreground">Department:</span> <span className="font-medium">{emp?.department || '—'}</span></div>
        <div><span className="text-muted-foreground">Designation:</span> <span className="font-medium">{emp?.designation || '—'}</span></div>
        <div><span className="text-muted-foreground">Fixed Salary:</span> <span className="font-medium font-mono">{formatCurrency(entry.monthlySalary)}</span></div>
        <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{entry.date}</span></div>
      </div>

      {/* Salary Breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <h3 className={`${text} font-semibold text-foreground mb-1 uppercase tracking-wider`}>Earnings</h3>
          <table className={`w-full ${text}`}>
            <tbody>
              <Row label="Present Days" value={`${entry.presentDays} days`} py={py} />
              <Row label="Present Amount" value={formatCurrency(entry.presentAmount)} py={py} />
              <Row label="Holidays" value={`${entry.holidays} days`} py={py} />
              <Row label="Holiday Amount" value={formatCurrency(entry.holidayAmount)} py={py} />
              <Row label="OT Hours" value={`${entry.otHours} hrs`} py={py} />
              <Row label="OT Amount" value={formatCurrency(entry.otAmount)} py={py} />
              <Row label="Welfare Amount" value={formatCurrency(entry.welfareAmount)} py={py} />
              <Row label="Bonus" value={formatCurrency(entry.bonus)} py={py} />
            </tbody>
          </table>
        </div>
        <div>
          <h3 className={`${text} font-semibold text-foreground mb-1 uppercase tracking-wider`}>Deductions</h3>
          <table className={`w-full ${text}`}>
            <tbody>
              <Row label="Total Advance Deduction" value={formatCurrency(totalDeducted)} py={py} />
              <Row label="Remaining Advance Amount" value={formatCurrency(remainingAdv)} py={py} />
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className={`border-t border-foreground/15 pt-2 ${text}`}>
        <div className="flex justify-between mb-1">
          <span className="text-muted-foreground">Gross Earnings</span>
          <span className="font-mono font-medium">{formatCurrency(grossEarnings)}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-muted-foreground">Total Deductions</span>
          <span className="font-mono font-medium text-destructive">{formatCurrency(entry.advanceDeduction)}</span>
        </div>
        <div className={`flex justify-between ${compact ? 'pt-1' : 'pt-2'} border-t border-foreground/15 ${compact ? 'text-sm' : 'text-base'} font-bold`}>
          <span>Net Payable</span>
          <span className="font-mono text-primary">{formatCurrency(entry.netPayable)}</span>
        </div>
      </div>

      {/* Footer */}
      {!compact && (
        <div className="mt-6 pt-4 border-t border-foreground/10 flex justify-between text-[10px] text-muted-foreground">
          <span>This is a system generated payslip</span>
          <div className="text-center">
            <div className="w-32 border-t border-foreground/30 pt-1">Authorized Signature</div>
          </div>
          <div className="text-center">
            <div className="w-24 border-t border-foreground/30 pt-1">Company Seal</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, py }: { label: string; value: string; py: string }) {
  return (
    <tr>
      <td className={`${py} text-muted-foreground`}>{label}</td>
      <td className={`${py} text-right font-mono font-medium`}>{value}</td>
    </tr>
  );
}
