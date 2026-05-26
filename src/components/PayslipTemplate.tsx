import { PayrollEntry, formatCurrency } from '@/types/hr';
import { useHR } from '@/context/HRContext';
import { numberToIndianWords } from '@/utils/numberToWords';
import { buildPayslipBreakdown } from '@/utils/payslipBreakdown';

interface PayslipProps {
  entry: PayrollEntry;
  compact?: boolean;
}

export default function PayslipTemplate({ entry, compact = false }: PayslipProps) {
  const { employees, advances } = useHR();
  const emp = employees.find(e => e.id === entry.employeeId);
  const adv = advances.find(a => a.employeeId === entry.employeeId);
  const { earnings, deductions, grossSalary, totalDeductions, netSalary } =
    buildPayslipBreakdown(entry, adv);

  const text = compact ? 'text-[10px]' : 'text-xs';
  const headText = compact ? 'text-sm' : 'text-lg';

  return (
    <div
      className={`border border-foreground/20 rounded-lg ${compact ? 'p-3' : 'p-6'} bg-card font-sans`}
      style={{ pageBreakInside: 'avoid' }}
    >
      {/* Company header */}
      <div className="text-center border-b border-foreground/15 pb-3 mb-3">
        <h2 className={`${headText} font-bold font-heading text-foreground`}>Nishanth Engineering Works</h2>
        <p className={`${text} text-muted-foreground leading-tight`}>
          102/1, Subbanaickenpalayam School Street, Chinnavedampatti, Coimbatore, Tamil Nadu 641049
        </p>
        <div
          className={`mt-2 inline-block px-4 ${compact ? 'py-0.5' : 'py-1'} bg-primary text-primary-foreground rounded ${text} font-semibold tracking-wide`}
        >
          PAYSLIP — {entry.month} {entry.year || ''}
        </div>
      </div>

      {/* Employee info */}
      <div className={`grid grid-cols-2 gap-x-4 gap-y-1 ${text} mb-3 border-b border-foreground/10 pb-3`}>
        <Info label="Employee ID" value={entry.employeeId} />
        <Info label="Name" value={entry.employeeName} />
        <Info label="Department" value={emp?.department || '—'} />
        <Info label="Designation" value={emp?.designation || '—'} />
        <Info label="Date of Joining" value={emp?.dateOfJoining || '—'} />
        <Info label="Pay Date" value={entry.date} />
      </div>

      {/* Earnings / Deductions */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <h3 className={`${text} font-semibold text-foreground mb-1 uppercase tracking-wider`}>Earnings</h3>
          <table className={`w-full ${text}`}>
            <tbody>
              {earnings.map(r => (
                <Row key={r.label} label={r.label} value={formatCurrency(r.amount)} compact={compact} />
              ))}
              <Row label="Gross Salary" value={formatCurrency(grossSalary)} compact={compact} bold />
            </tbody>
          </table>
        </div>
        <div>
          <h3 className={`${text} font-semibold text-foreground mb-1 uppercase tracking-wider`}>Deductions</h3>
          <table className={`w-full ${text}`}>
            <tbody>
              {deductions.map(r => (
                <Row key={r.label} label={r.label} value={formatCurrency(r.amount)} compact={compact} />
              ))}
              <Row label="Total Deductions" value={formatCurrency(totalDeductions)} compact={compact} bold />
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className={`border-t border-foreground/15 pt-2 ${text}`}>
        <div className={`flex justify-between ${compact ? 'pt-1' : 'pt-2'} ${compact ? 'text-sm' : 'text-base'} font-bold`}>
          <span>Net Salary</span>
          <span className="font-mono text-primary">{formatCurrency(netSalary)}</span>
        </div>
        <p className={`${text} text-muted-foreground mt-1 italic`}>
          In words: {numberToIndianWords(netSalary)}
        </p>
      </div>

      {/* Signatures */}
      {!compact && (
        <div className="mt-8 pt-4 border-t border-foreground/10 grid grid-cols-2 gap-4 text-[10px] text-muted-foreground">
          <div className="text-center">
            <div className="h-10" />
            <div className="border-t border-foreground/30 pt-1">Employee Signature</div>
          </div>
          <div className="text-center">
            <div className="h-10" />
            <div className="border-t border-foreground/30 pt-1">Employer Signature</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{' '}
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Row({
  label, value, compact, bold,
}: { label: string; value: string; compact: boolean; bold?: boolean }) {
  const py = compact ? 'py-1' : 'py-1.5';
  return (
    <tr className={bold ? 'border-t border-foreground/15' : ''}>
      <td className={`${py} ${bold ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{label}</td>
      <td className={`${py} text-right font-mono ${bold ? 'font-bold' : 'font-medium'}`}>{value}</td>
    </tr>
  );
}
