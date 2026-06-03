import { PayrollEntry, formatCurrency } from "@/types/hr";
import { useHR } from "@/context/HRContext";
import { numberToIndianWords } from "@/utils/numberToWords";
import { buildPayslipBreakdown } from "@/utils/payslipBreakdown";
import { useCompanyInfo } from "@/hooks/useCompanySettings";

interface PayslipProps {
  entry: PayrollEntry;
  compact?: boolean;
}

export default function PayslipTemplate({ entry, compact = false }: PayslipProps) {
  const { employees, advances } = useHR();
  const [company] = useCompanyInfo();
  const emp = employees.find((e) => e.id === entry.employeeId);
  const adv = advances.find((a) => a.employeeId === entry.employeeId);
  
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
        <Info label="Date of Joining" value={emp?.dateOfJoining || "—"} />
        <Info label="Pay Date" value={entry.date} />
        <Info label="Present Days" value={String(entry.presentDays || 0)} />
        <Info label="No. of Leaves" value={String(calcLeaves)} />
      </div>

      {/* Earnings Section */}
      <div className="border border-border rounded-lg overflow-hidden mb-3">
        <table className={`w-full ${text}`}>
          <thead>
            <tr className="bg-[#1e3a5f] text-white">
              <th className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-left font-semibold tracking-wide`} colSpan={2}>EARNINGS</th>
              <th className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-left font-semibold tracking-wide border-l border-white/20`} colSpan={2}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Monthly Salary', entry.monthlySalary],
              ['Present Days', entry.presentDays, 'Present Amount', entry.presentAmount],
              ['Holidays', entry.holidays, 'Holiday Amount', entry.holidayAmount],
              ['OT Hours', entry.otHours, 'OT Amount', entry.otAmount],
              ['Welfare', entry.welfareAmount],
              ['Bonus', entry.bonus],
            ].map((row, i) => {
              const label = row[0] as string;

              // Identifies count columns that should be displayed as pure integers
              const isCountColumn =
                label.includes('Days') ||
                label.includes('Hours') ||
                label.includes('Leaves') ||
                label === 'Holidays';

              return (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-muted-foreground`} colSpan={1}>{row[0]}</td>
                  <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-right font-mono`}>
                    {typeof row[1] === 'number' && isCountColumn
                      ? row[1]
                      : formatCurrency(row[1] as number)
                    }
                  </td>
                  {row.length > 2 ? (
                    <>
                      <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-muted-foreground border-l border-border`}>{row[2]}</td>
                      <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-right font-mono`}>
                        {formatCurrency(row[3] as number)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} border-l border-border`}></td>
                      <td className={`${compact ? "px-2 py-1" : "px-3 py-2"}`}></td>
                    </>
                  )}
                </tr>
              );
            })}
            <tr className="bg-primary/5 font-bold">
              <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-right`} colSpan={3}>TOTAL EARNINGS</td>
              <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-right font-mono text-primary`}>
                {formatCurrency(totalEarning)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Deductions Section */}
      <div className="border border-border rounded-lg overflow-hidden mb-3">
        <table className={`w-full ${text}`}>
          <thead>
            <tr className="bg-[#7a2323] text-white">
              <th className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-left font-semibold tracking-wide`}>DEDUCTIONS</th>
              <th className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-right font-semibold tracking-wide`}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>

            <tr className="border-b border-border">
              <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-muted-foreground`}>Advance Deduction</td>
              <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-right font-mono`}>{formatCurrency(entry.advanceDeduction)}</td>
            </tr>
            <tr className="bg-destructive/5 font-bold border-b border-border">
              <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-right`}>TOTAL DEDUCTIONS</td>
              <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-right font-mono text-destructive`}>
                {formatCurrency(totalDeductionDisplay)}
              </td>
            </tr>
            <tr className="last:border-0">
              <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-muted-foreground`}>
                Balance Advance <span className="text-[9px] opacity-60">(Advance Mgmt/Balance)</span>
              </td>
              <td className={`${compact ? "px-2 py-1" : "px-3 py-2"} text-right font-mono`}>
                {formatCurrency(adv ? Math.max(0, adv.remainingBalance || 0) : 0)}
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