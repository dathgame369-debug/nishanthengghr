import { PayrollEntry, Advance, formatCurrency, MONTHS } from "@/types/hr";
import { useHR } from "@/context/HRContext";
import { numberToIndianWords } from "@/utils/numberToWords";
import { buildPayslipBreakdown } from "@/utils/payslipBreakdown";
import { useCompanyInfo } from "@/hooks/useCompanySettings";

/** Returns the advance balance as it was right after this payslip's month deduction. */
function getBalanceAtMonth(employeeId: string, entryMonth: string, entryYear: number, allPayroll: PayrollEntry[] = [], allAdvances: Advance[] = []): number {
  const entryMonthIdx = MONTHS.indexOf(entryMonth);
  const eYear = Number(entryYear);

  // Sum all advances given to this employee (no date restriction needed since deductions perfectly offset them)
  const totalAdvances = allAdvances
    .filter(a => a.employeeId === employeeId)
    .reduce((sum, a) => sum + (a.advanceAmount || 0), 0);

  // Sum all deductions for this employee up to this month
  const deductedSoFar = allPayroll.reduce((sum, p) => {
    if (p.employeeId !== employeeId) return sum;
    
    const pYear = Number(p.year) || eYear;
    const pMonthIdx = MONTHS.indexOf(p.month);
    
    if (pYear < eYear || (pYear === eYear && pMonthIdx <= entryMonthIdx)) {
      return sum + (p.advanceDeduction || 0);
    }
    return sum;
  }, 0);
  
  return Math.max(0, totalAdvances - deductedSoFar);
}

interface PayslipProps {
  entry: PayrollEntry;
  compact?: boolean;
  advances?: Advance[];
  allPayroll?: PayrollEntry[];
}

export default function PayslipTemplate({ entry, compact = false, advances: advancesProp, allPayroll }: PayslipProps) {
  const { employees, advances: contextAdvances } = useHR();
  const [company] = useCompanyInfo();
  const emp = employees.find((e) => e.id === entry.employeeId);
  // Use the passed-in advances (all records) if provided; fall back to context (paginated)
  const advancesList = advancesProp ?? contextAdvances;
  
  const calcLeaves = entry.noOfLeaves || 0;
  const leaveAmt = calcLeaves * (entry.monthlySalary / 26);
  const totalEarning = entry.presentAmount + entry.holidayAmount + (entry.otAmount || 0) + (entry.welfareAmount || 0) + (entry.bonus || 0);
  const totalDeductionDisplay = entry.advanceDeduction || 0;
  const calculatedNet = entry.netPayable;

  const text = compact ? "text-[10px]" : "text-xs";
  const headText = compact ? "text-sm" : "text-lg";

  return (
    <div
      className={`border border-foreground/20 rounded-lg ${compact ? "p-3" : "p-6"} bg-card font-sans`}
      style={{ pageBreakInside: "avoid" }}
    >
      {/* Company header */}
      <div className="text-center border-b border-foreground/15 pb-3 mb-3">
        <h2 className={`${headText} font-bold font-heading text-foreground`}>{company.name}</h2>
        <p className={`${text} text-muted-foreground leading-tight whitespace-pre-line`}>{company.address}</p>
        {company.phone && <p className={`${text} text-muted-foreground leading-tight`}>{company.phone}</p>}
        <div
          className={`mt-2 inline-block px-4 ${compact ? "py-0.5" : "py-1"} bg-primary text-primary-foreground rounded ${text} font-semibold tracking-wide`}
        >
          PAYSLIP — {entry.month} {entry.year || ""}
        </div>
      </div>

      {/* Employee info */}
      <div className={`grid grid-cols-2 gap-x-4 gap-y-1 ${text} mb-3 border-b border-foreground/10 pb-3`}>
        <Info label="Employee ID" value={entry.employeeId} />
        <Info label="Name" value={entry.employeeName} />
        <Info label="Department" value={emp?.department || "—"} />
        <Info label="Designation" value={emp?.designation || "—"} />
        <Info label="Date of Joining" value={emp?.dateOfJoining ? emp.dateOfJoining.split('-').reverse().join('-') : "—"} />
        <Info label="Pay Date" value={entry.date ? entry.date.split('-').reverse().join('-') : ""} />
        <Info label="Present Days" value={String(entry.presentDays || 0)} />
        <Info label="No. of Leaves" value={String(calcLeaves)} />
      </div>

      {/* Earnings Section */}
      <div className="border border-black rounded-lg overflow-hidden mb-3">
        <table className={`w-full ${text}`}>
          <thead>
            <tr className="bg-[#dceaf8] text-[#1e3a5f] border-b border-black">
              <th className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-left font-semibold tracking-wide`}>EARNINGS</th>
              <th className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-right font-semibold tracking-wide`}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Monthly Salary',                               entry.monthlySalary,              true],
              [`Present Days - ${entry.presentDays}`,          entry.presentAmount,               true],
              [`Holidays - ${entry.holidays}`,                 entry.holidayAmount,               true],
              [`OT - ${entry.otHours} hrs`,                   entry.otAmount,                    true],
              ['Welfare',                                      entry.welfareAmount,               true],
              ['Bonus',                                        entry.bonus,                       true],
            ].map(([label, value, isCurrency], i) => (
              <tr key={i} className="border-b border-black last:border-0">
                <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-muted-foreground`}>{label as string}</td>
                <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-right font-mono`}>
                  {isCurrency ? formatCurrency(value as number) : value as number}
                </td>
              </tr>
            ))}
            <tr className="bg-[#dceaf8]/60 font-bold border-t border-black">
              <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-right`}>TOTAL EARNINGS</td>
              <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-right font-mono text-[#1e3a5f]`}>
                {formatCurrency(totalEarning)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Deductions Section */}
      <div className="border border-black rounded-lg overflow-hidden mb-3">
        <table className={`w-full ${text}`}>
          <thead>
            <tr className="bg-[#fde8e8] text-[#7a2323] border-b border-black">
              <th className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-left font-semibold tracking-wide`}>DEDUCTIONS</th>
              <th className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-right font-semibold tracking-wide`}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-black">
              <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-muted-foreground`}>Advance Deduction</td>
              <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-right font-mono`}>{formatCurrency(entry.advanceDeduction)}</td>
            </tr>
            <tr className="bg-[#fde8e8]/40 font-bold border-b border-black">
              <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-right`}>TOTAL DEDUCTIONS</td>
              <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-right font-mono text-[#7a2323]`}>
                {formatCurrency(totalDeductionDisplay)}
              </td>
            </tr>
            <tr>
              <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-muted-foreground`}>
                Balance Advance <span className="text-[9px] opacity-60">(Advance Mgmt/Balance)</span>
              </td>
              <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-right font-mono`}>
                {formatCurrency(getBalanceAtMonth(entry.employeeId, entry.month, entry.year || new Date().getFullYear(), allPayroll, advancesList))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className={`border-t border-foreground/15 pt-2 ${text}`}>
        <div
          className={`flex justify-between ${compact ? "pt-1" : "pt-2"} ${compact ? "text-sm" : "text-base"} font-bold`}
        >
          <span>Net Salary</span>
          <span className="font-mono text-primary">{formatCurrency(calculatedNet)}</span>
        </div>
        <p className={`${text} text-muted-foreground mt-1 italic`}>In words: {numberToIndianWords(calculatedNet)}</p>
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
      <span className="text-muted-foreground">{label}:</span> <span className="font-medium">{value}</span>
    </div>
  );
}