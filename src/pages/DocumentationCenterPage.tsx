import { useState, useRef, useCallback } from 'react';
import { useHR } from '@/context/HRContext';
import { useCompanyInfo } from '@/hooks/useCompanySettings';
import { Employee } from '@/types/hr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Award, FileText, TrendingUp, DollarSign, UserX,
  Printer, Download, ChevronLeft
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import logo from '@/assets/logo.png';

// ─── Certificate types ────────────────────────────────────────────────────────
type CertType = 'experience' | 'salary_revision' | 'compensation' | 'relieving';

const CERT_META: Record<CertType, { label: string; icon: any; color: string; bg: string }> = {
  experience:      { label: 'Experience Certificate',      icon: Award,      color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
  salary_revision: { label: 'Salary Revision Certificate', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  compensation:    { label: 'Compensation Certificate',    icon: DollarSign, color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-200' },
  relieving:       { label: 'Relieving Certificate',       icon: UserX,      color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-200' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function today(): string {
  return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtCurrency(n: number): string {
  return '₹' + n.toLocaleString('en-IN') + '/-';
}

// ─── Editable field form state per certificate ────────────────────────────────
interface ExperienceFields {
  employeeName: string; employeeId: string; designation: string; department: string;
  dateOfJoining: string; lastWorkingDay: string; issueDate: string;
  customBody: string;
}
interface SalaryRevisionFields {
  employeeName: string; employeeId: string; designation: string; department: string;
  currentSalary: string; revisedSalary: string; effectiveDate: string; issueDate: string;
  reason: string;
}
interface CompensationFields {
  employeeName: string; employeeId: string; designation: string; department: string;
  basicSalary: string; hra: string; specialAllowance: string; totalCtc: string;
  effectiveDate: string; issueDate: string;
}
interface RelievingFields {
  employeeName: string; employeeId: string; designation: string; department: string;
  dateOfJoining: string; lastWorkingDay: string; issueDate: string;
  customBody: string;
}

// ─── Certificate Templates ────────────────────────────────────────────────────

function LetterHead({ company }: { company: ReturnType<typeof useCompanyInfo>[0] }) {
  const companyLogo = company.logoDataUrl || logo;
  const companyName = company.name || 'Nishanth Engineering Works';
  const tagline = company.tagline || 'MFRS OF : ALL KINDS OF WOODEN AND ALUMINUM PATTERNS';
  const address = company.address || '102/1, Subbanaickenpalayam School Street, Chinnavedampatti, Coimbatore, Tamil Nadu 641049';
  const phone = company.phone || '0422-2532130 / 94426 32130';

  return (
    <div className="letterhead-container pb-2 mb-6">
      <div className="flex items-center gap-4 sm:gap-6 mb-2">
        <div className="shrink-0 w-24 h-24 flex items-center justify-center">
          <img
            src={companyLogo}
            alt={companyName}
            className="w-24 h-24 object-contain"
          />
        </div>
        <div className="flex-1 text-center -ml-6 sm:-ml-10">
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-[#0f3c6c] leading-tight mb-1">
            {companyName}
          </h1>
          <p className="text-xs text-gray-800 leading-snug font-medium">
            {address}
          </p>
          <p className="text-xs text-gray-800 font-medium mt-0.5">
            {phone}
            {company.email ? ` | ${company.email}` : ''}
            {company.gstNumber ? ` | GST: ${company.gstNumber}` : ''}
          </p>
        </div>
      </div>
      <div className="text-center italic text-xs font-semibold text-[#1a3a60] tracking-wider mb-2">
        {tagline}
      </div>
      <div className="h-1 bg-[#0f3c6c] w-full" />
    </div>
  );
}

function SignatureBlock({ company }: { company: ReturnType<typeof useCompanyInfo>[0] }) {
  const companyName = company.name || 'Nishanth Engineering Works';
  return (
    <div className="mt-16 flex justify-end">
      <div className="text-center">
        <div className="border-t-2 border-gray-700 pt-2 w-48">
          <p className="text-sm font-semibold text-gray-800">Authorised Signatory</p>
          <p className="text-xs text-gray-600">{companyName}</p>
        </div>
      </div>
    </div>
  );
}

// Experience Certificate
function ExperienceCert({ f, company }: { f: ExperienceFields; company: ReturnType<typeof useCompanyInfo>[0] }) {
  return (
    <div className="font-serif text-gray-800">
      <LetterHead company={company} />
      <div className="text-center mb-8">
        <h2 className="text-lg font-bold uppercase tracking-widest underline underline-offset-4">Experience Certificate</h2>
      </div>
      <p className="text-sm text-right mb-6">Date: <span className="font-medium">{f.issueDate}</span></p>
      <p className="text-sm leading-7 mb-4">
        <span className="font-bold">To Whom It May Concern,</span>
      </p>
      <p className="text-sm leading-8 text-justify">
        This is to certify that <strong>{f.employeeName || '___________'}</strong>{f.employeeId ? ` (Employee ID: ${f.employeeId})` : ''} was employed with <strong>{company.name}</strong> as a <strong>{f.designation || '___________'}</strong> in the <strong>{f.department || '___________'}</strong> department from <strong>{fmtDate(f.dateOfJoining) || '___________'}</strong> to <strong>{fmtDate(f.lastWorkingDay) || '___________'}</strong>.
      </p>
      <p className="text-sm leading-8 text-justify mt-4">
        {f.customBody || `During ${f.employeeName ? f.employeeName.split(' ')[0] : 'their'}'s tenure with us, they demonstrated excellent work ethics, professional behaviour, and a commitment to delivering quality results. We found them to be sincere, dedicated, and a valuable member of our team.`}
      </p>
      <p className="text-sm leading-8 mt-4">
        We wish them all the best in their future endeavours.
      </p>
      <SignatureBlock company={company} />
    </div>
  );
}

// Salary Revision Certificate
function SalaryRevisionCert({ f, company }: { f: SalaryRevisionFields; company: ReturnType<typeof useCompanyInfo>[0] }) {
  return (
    <div className="font-serif text-gray-800">
      <LetterHead company={company} />
      <div className="text-center mb-8">
        <h2 className="text-lg font-bold uppercase tracking-widest underline underline-offset-4">Salary Revision Letter</h2>
      </div>
      <p className="text-sm text-right mb-6">Date: <span className="font-medium">{f.issueDate}</span></p>
      <p className="text-sm mb-1"><strong>To,</strong></p>
      <p className="text-sm mb-0.5">{f.employeeName || '___________'}</p>
      {f.designation && <p className="text-sm mb-0.5">{f.designation}</p>}
      {f.department && <p className="text-sm mb-6">{f.department} Department</p>}
      <p className="text-sm mb-4"><strong>Subject: Revision of Salary</strong></p>
      <p className="text-sm leading-8 text-justify">
        Dear <strong>{f.employeeName?.split(' ')[0] || '___________'}</strong>,
      </p>
      <p className="text-sm leading-8 text-justify mt-3">
        We are pleased to inform you that, in recognition of your continued contribution and performance, the management of <strong>{company.name}</strong> has decided to revise your salary with effect from <strong>{fmtDate(f.effectiveDate) || '___________'}</strong>.
      </p>
      <div className="my-5 border border-gray-300 rounded overflow-hidden text-sm">
        <table className="w-full">
          <tbody>
            <tr className="bg-gray-100"><td className="px-4 py-2 font-semibold border-r border-gray-300 w-1/2">Previous Salary</td><td className="px-4 py-2">{f.currentSalary ? fmtCurrency(Number(f.currentSalary)) : '___________'} per month</td></tr>
            <tr><td className="px-4 py-2 font-semibold border-r border-gray-300">Revised Salary</td><td className="px-4 py-2 text-emerald-700 font-bold">{f.revisedSalary ? fmtCurrency(Number(f.revisedSalary)) : '___________'} per month</td></tr>
            <tr className="bg-gray-100"><td className="px-4 py-2 font-semibold border-r border-gray-300">Effective From</td><td className="px-4 py-2">{fmtDate(f.effectiveDate) || '___________'}</td></tr>
          </tbody>
        </table>
      </div>
      {f.reason && <p className="text-sm leading-8 text-justify mt-3">{f.reason}</p>}
      <p className="text-sm leading-8 mt-3">Please acknowledge the receipt of this letter. Congratulations and we look forward to your continued contribution.</p>
      <SignatureBlock company={company} />
    </div>
  );
}

// Compensation Certificate
function CompensationCert({ f, company }: { f: CompensationFields; company: ReturnType<typeof useCompanyInfo>[0] }) {
  const total = [f.basicSalary, f.hra, f.specialAllowance].reduce((s, v) => s + (Number(v) || 0), 0);
  const displayTotal = f.totalCtc ? Number(f.totalCtc) : total;
  return (
    <div className="font-serif text-gray-800">
      <LetterHead company={company} />
      <div className="text-center mb-8">
        <h2 className="text-lg font-bold uppercase tracking-widest underline underline-offset-4">Compensation / Offer Letter</h2>
      </div>
      <p className="text-sm text-right mb-6">Date: <span className="font-medium">{f.issueDate}</span></p>
      <p className="text-sm mb-1"><strong>To,</strong></p>
      <p className="text-sm mb-0.5">{f.employeeName || '___________'}</p>
      {f.designation && <p className="text-sm mb-0.5">{f.designation}</p>}
      {f.department && <p className="text-sm mb-6">{f.department} Department</p>}
      <p className="text-sm leading-8 text-justify mt-3">
        Dear <strong>{f.employeeName?.split(' ')[0] || '___________'}</strong>,<br />
        We are pleased to confirm your compensation structure at <strong>{company.name}</strong> effective from <strong>{fmtDate(f.effectiveDate) || '___________'}</strong>.
      </p>
      <div className="my-5 border border-gray-300 rounded overflow-hidden text-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-800 text-white"><th className="px-4 py-2 text-left w-1/2">Component</th><th className="px-4 py-2 text-right">Amount (per month)</th></tr>
          </thead>
          <tbody>
            {[
              { label: 'Basic Salary', val: f.basicSalary },
              { label: 'HRA', val: f.hra },
              { label: 'Special Allowance', val: f.specialAllowance },
            ].filter(r => Number(r.val) > 0).map(r => (
              <tr key={r.label} className="border-t border-gray-200">
                <td className="px-4 py-2 border-r border-gray-200">{r.label}</td>
                <td className="px-4 py-2 text-right">{fmtCurrency(Number(r.val))}</td>
              </tr>
            ))}
            <tr className="bg-gray-100 border-t-2 border-gray-400 font-bold">
              <td className="px-4 py-2 border-r border-gray-200">Total CTC</td>
              <td className="px-4 py-2 text-right">{displayTotal ? fmtCurrency(displayTotal) : '___________'}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-sm leading-8">Please sign and return a copy as acknowledgment of your acceptance.</p>
      <SignatureBlock company={company} />
    </div>
  );
}

// Relieving Certificate
function RelievingCert({ f, company }: { f: RelievingFields; company: ReturnType<typeof useCompanyInfo>[0] }) {
  return (
    <div className="font-serif text-gray-800">
      <LetterHead company={company} />
      <div className="text-center mb-8">
        <h2 className="text-lg font-bold uppercase tracking-widest underline underline-offset-4">Relieving Certificate</h2>
      </div>
      <p className="text-sm text-right mb-6">Date: <span className="font-medium">{f.issueDate}</span></p>
      <p className="text-sm leading-7 mb-4"><span className="font-bold">To Whom It May Concern,</span></p>
      <p className="text-sm leading-8 text-justify">
        This is to certify that <strong>{f.employeeName || '___________'}</strong>{f.employeeId ? ` (Employee ID: ${f.employeeId})` : ''} has been employed with <strong>{company.name}</strong> as <strong>{f.designation || '___________'}</strong> in the <strong>{f.department || '___________'}</strong> department from <strong>{fmtDate(f.dateOfJoining) || '___________'}</strong>.
      </p>
      <p className="text-sm leading-8 text-justify mt-4">
        {f.employeeName?.split(' ')[0] || 'They'} has been relieved from the services of the company on <strong>{fmtDate(f.lastWorkingDay) || '___________'}</strong> and has been issued this certificate as per their request.
      </p>
      <p className="text-sm leading-8 text-justify mt-4">
        {f.customBody || `We confirm that all dues have been settled and there are no pending obligations. We wish ${f.employeeName?.split(' ')[0] || 'them'} the very best in their future endeavours.`}
      </p>
      <SignatureBlock company={company} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DocumentationCenterPage() {
  const { employees } = useHR();
  const [company] = useCompanyInfo();

  const [certType, setCertType] = useState<CertType | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  // ── Form state for each cert type ──────────────────────────────────────────
  const [expFields, setExpFields] = useState<ExperienceFields>({
    employeeName: '', employeeId: '', designation: '', department: '',
    dateOfJoining: '', lastWorkingDay: '', issueDate: today(), customBody: '',
  });
  const [salRevFields, setSalRevFields] = useState<SalaryRevisionFields>({
    employeeName: '', employeeId: '', designation: '', department: '',
    currentSalary: '', revisedSalary: '', effectiveDate: '', issueDate: today(), reason: '',
  });
  const [compFields, setCompFields] = useState<CompensationFields>({
    employeeName: '', employeeId: '', designation: '', department: '',
    basicSalary: '', hra: '', specialAllowance: '', totalCtc: '',
    effectiveDate: '', issueDate: today(),
  });
  const [relFields, setRelFields] = useState<RelievingFields>({
    employeeName: '', employeeId: '', designation: '', department: '',
    dateOfJoining: '', lastWorkingDay: '', issueDate: today(), customBody: '',
  });

  // ── Load employee into all form states ─────────────────────────────────────
  const loadEmployee = useCallback((emp: Employee) => {
    const base = {
      employeeName: emp.name, employeeId: emp.id,
      designation: emp.designation, department: emp.department,
      dateOfJoining: emp.dateOfJoining,
    };
    setExpFields(f => ({ ...f, ...base }));
    setSalRevFields(f => ({ ...f, ...base, currentSalary: String(emp.fixedSalary) }));
    setCompFields(f => ({
      ...f, ...base,
      basicSalary: String(emp.fixedSalary),
      hra: String(emp.hra ?? 0),
      specialAllowance: String(emp.specialAllowance ?? 0),
      totalCtc: String(emp.fixedSalary + (emp.hra ?? 0) + (emp.specialAllowance ?? 0)),
    }));
    setRelFields(f => ({ ...f, ...base }));
  }, []);

  const handleEmpSelect = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = employees.find(e => e.id === empId);
    if (emp) loadEmployee(emp);
  };

  // ── Print ──────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const win = window.open('', '_blank', 'width=900,height=800');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html><head><title>Certificate</title>
      <style>
        @page { size: A4; margin: 15mm 20mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Times New Roman', Times, Georgia, serif; margin: 0; padding: 15px; color: #111; }
        .letterhead-container { margin-bottom: 24px; padding-bottom: 8px; }
        .flex { display: flex; align-items: center; }
        .gap-4, .gap-6 { gap: 20px; }
        .shrink-0 { flex-shrink: 0; }
        .w-24 { width: 90px; }
        .h-24 { height: 90px; }
        .object-contain { object-fit: contain; }
        .flex-1 { flex: 1; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .justify-end { justify-content: flex-end; }
        .italic { font-style: italic; }
        .font-extrabold, .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .tracking-tight { letter-spacing: -0.02em; }
        .tracking-wider { letter-spacing: 0.05em; }
        .tracking-widest { letter-spacing: 0.1em; }
        .uppercase { text-transform: uppercase; }
        .underline { text-decoration: underline; }
        h1 { font-family: Arial, sans-serif; font-size: 26px; color: #0f3c6c; margin: 0 0 4px 0; }
        h2 { font-family: Arial, sans-serif; font-size: 18px; margin: 16px 0; }
        p { font-size: 14px; line-height: 1.8; margin: 6px 0; }
        .letterhead-container p { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; margin: 2px 0; }
        .bg-\\[\\#0f3c6c\\], .h-1 { height: 3.5px; background-color: #0f3c6c; width: 100%; display: block; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        td, th { border: 1px solid #ccc; padding: 8px 12px; font-size: 13px; font-family: Arial, sans-serif; }
        th { background: #0f3c6c; color: white; }
        .border-t-2 { border-top: 2px solid #333; }
        .mt-16 { margin-top: 50px; }
        .w-48 { width: 190px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${el.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  };

  // ── Download PDF ───────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    const el = printRef.current;
    if (!el) return;
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    const fname = certType ? `${CERT_META[certType].label.replace(/ /g, '_')}_${expFields.employeeName || 'Certificate'}.pdf` : 'Certificate.pdf';
    pdf.save(fname);
  };

  // ── Shared input style ─────────────────────────────────────────────────────
  const labelCls = "text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block";
  const inputCls = "text-sm";

  // ── Certificate form based on type ────────────────────────────────────────
  const renderForm = () => {
    if (!certType) return null;

    const EmpSelector = (
      <div className="bg-muted/40 rounded-lg p-4 border border-border mb-6">
        <label className={labelCls}>Select Employee</label>
        <Select value={selectedEmpId} onValueChange={handleEmpSelect}>
          <SelectTrigger className="text-sm"><SelectValue placeholder="Choose an employee to auto-fill…" /></SelectTrigger>
          <SelectContent>
            {employees.map(e => (
              <SelectItem key={e.id} value={e.id}>{e.id} — {e.name} ({e.designation})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-2">Select an employee to auto-fill the fields below. You can edit any field after selection.</p>
      </div>
    );

    if (certType === 'experience') {
      return (
        <div className="space-y-4">
          {EmpSelector}
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Employee Name</label><Input className={inputCls} value={expFields.employeeName} onChange={e => setExpFields(f => ({ ...f, employeeName: e.target.value }))} /></div>
            <div><label className={labelCls}>Employee ID</label><Input className={inputCls} value={expFields.employeeId} onChange={e => setExpFields(f => ({ ...f, employeeId: e.target.value }))} /></div>
            <div><label className={labelCls}>Designation</label><Input className={inputCls} value={expFields.designation} onChange={e => setExpFields(f => ({ ...f, designation: e.target.value }))} /></div>
            <div><label className={labelCls}>Department</label><Input className={inputCls} value={expFields.department} onChange={e => setExpFields(f => ({ ...f, department: e.target.value }))} /></div>
            <div><label className={labelCls}>Date of Joining</label><Input type="date" className={inputCls} value={expFields.dateOfJoining} onChange={e => setExpFields(f => ({ ...f, dateOfJoining: e.target.value }))} /></div>
            <div><label className={labelCls}>Last Working Day</label><Input type="date" className={inputCls} value={expFields.lastWorkingDay} onChange={e => setExpFields(f => ({ ...f, lastWorkingDay: e.target.value }))} /></div>
            <div><label className={labelCls}>Issue Date</label><Input className={inputCls} value={expFields.issueDate} onChange={e => setExpFields(f => ({ ...f, issueDate: e.target.value }))} /></div>
          </div>
          <div><label className={labelCls}>Custom Body Text (optional — leave blank for default)</label><Textarea className={inputCls} rows={3} value={expFields.customBody} onChange={e => setExpFields(f => ({ ...f, customBody: e.target.value }))} placeholder="Override the default body paragraph…" /></div>
        </div>
      );
    }

    if (certType === 'salary_revision') {
      return (
        <div className="space-y-4">
          {EmpSelector}
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Employee Name</label><Input className={inputCls} value={salRevFields.employeeName} onChange={e => setSalRevFields(f => ({ ...f, employeeName: e.target.value }))} /></div>
            <div><label className={labelCls}>Employee ID</label><Input className={inputCls} value={salRevFields.employeeId} onChange={e => setSalRevFields(f => ({ ...f, employeeId: e.target.value }))} /></div>
            <div><label className={labelCls}>Designation</label><Input className={inputCls} value={salRevFields.designation} onChange={e => setSalRevFields(f => ({ ...f, designation: e.target.value }))} /></div>
            <div><label className={labelCls}>Department</label><Input className={inputCls} value={salRevFields.department} onChange={e => setSalRevFields(f => ({ ...f, department: e.target.value }))} /></div>
            <div><label className={labelCls}>Current Salary (₹)</label><Input type="number" className={inputCls} value={salRevFields.currentSalary} onChange={e => setSalRevFields(f => ({ ...f, currentSalary: e.target.value }))} /></div>
            <div><label className={labelCls}>Revised Salary (₹)</label><Input type="number" className={inputCls} value={salRevFields.revisedSalary} onChange={e => setSalRevFields(f => ({ ...f, revisedSalary: e.target.value }))} /></div>
            <div><label className={labelCls}>Effective Date</label><Input type="date" className={inputCls} value={salRevFields.effectiveDate} onChange={e => setSalRevFields(f => ({ ...f, effectiveDate: e.target.value }))} /></div>
            <div><label className={labelCls}>Issue Date</label><Input className={inputCls} value={salRevFields.issueDate} onChange={e => setSalRevFields(f => ({ ...f, issueDate: e.target.value }))} /></div>
          </div>
          <div><label className={labelCls}>Reason / Additional Note (optional)</label><Textarea className={inputCls} rows={2} value={salRevFields.reason} onChange={e => setSalRevFields(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. This revision is in recognition of your outstanding performance…" /></div>
        </div>
      );
    }

    if (certType === 'compensation') {
      return (
        <div className="space-y-4">
          {EmpSelector}
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Employee Name</label><Input className={inputCls} value={compFields.employeeName} onChange={e => setCompFields(f => ({ ...f, employeeName: e.target.value }))} /></div>
            <div><label className={labelCls}>Employee ID</label><Input className={inputCls} value={compFields.employeeId} onChange={e => setCompFields(f => ({ ...f, employeeId: e.target.value }))} /></div>
            <div><label className={labelCls}>Designation</label><Input className={inputCls} value={compFields.designation} onChange={e => setCompFields(f => ({ ...f, designation: e.target.value }))} /></div>
            <div><label className={labelCls}>Department</label><Input className={inputCls} value={compFields.department} onChange={e => setCompFields(f => ({ ...f, department: e.target.value }))} /></div>
            <div><label className={labelCls}>Basic Salary (₹)</label><Input type="number" className={inputCls} value={compFields.basicSalary} onChange={e => setCompFields(f => ({ ...f, basicSalary: e.target.value }))} /></div>
            <div><label className={labelCls}>HRA (₹)</label><Input type="number" className={inputCls} value={compFields.hra} onChange={e => setCompFields(f => ({ ...f, hra: e.target.value }))} /></div>
            <div><label className={labelCls}>Special Allowance (₹)</label><Input type="number" className={inputCls} value={compFields.specialAllowance} onChange={e => setCompFields(f => ({ ...f, specialAllowance: e.target.value }))} /></div>
            <div><label className={labelCls}>Total CTC (₹) — override</label><Input type="number" className={inputCls} value={compFields.totalCtc} onChange={e => setCompFields(f => ({ ...f, totalCtc: e.target.value }))} /></div>
            <div><label className={labelCls}>Effective Date</label><Input type="date" className={inputCls} value={compFields.effectiveDate} onChange={e => setCompFields(f => ({ ...f, effectiveDate: e.target.value }))} /></div>
            <div><label className={labelCls}>Issue Date</label><Input className={inputCls} value={compFields.issueDate} onChange={e => setCompFields(f => ({ ...f, issueDate: e.target.value }))} /></div>
          </div>
        </div>
      );
    }

    if (certType === 'relieving') {
      return (
        <div className="space-y-4">
          {EmpSelector}
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Employee Name</label><Input className={inputCls} value={relFields.employeeName} onChange={e => setRelFields(f => ({ ...f, employeeName: e.target.value }))} /></div>
            <div><label className={labelCls}>Employee ID</label><Input className={inputCls} value={relFields.employeeId} onChange={e => setRelFields(f => ({ ...f, employeeId: e.target.value }))} /></div>
            <div><label className={labelCls}>Designation</label><Input className={inputCls} value={relFields.designation} onChange={e => setRelFields(f => ({ ...f, designation: e.target.value }))} /></div>
            <div><label className={labelCls}>Department</label><Input className={inputCls} value={relFields.department} onChange={e => setRelFields(f => ({ ...f, department: e.target.value }))} /></div>
            <div><label className={labelCls}>Date of Joining</label><Input type="date" className={inputCls} value={relFields.dateOfJoining} onChange={e => setRelFields(f => ({ ...f, dateOfJoining: e.target.value }))} /></div>
            <div><label className={labelCls}>Last Working Day</label><Input type="date" className={inputCls} value={relFields.lastWorkingDay} onChange={e => setRelFields(f => ({ ...f, lastWorkingDay: e.target.value }))} /></div>
            <div><label className={labelCls}>Issue Date</label><Input className={inputCls} value={relFields.issueDate} onChange={e => setRelFields(f => ({ ...f, issueDate: e.target.value }))} /></div>
          </div>
          <div><label className={labelCls}>Custom Body Text (optional)</label><Textarea className={inputCls} rows={3} value={relFields.customBody} onChange={e => setRelFields(f => ({ ...f, customBody: e.target.value }))} placeholder="Override the default relieving message…" /></div>
        </div>
      );
    }

    return null;
  };

  const renderPreview = () => {
    if (!certType) return null;
    return (
      <div ref={printRef} className="bg-white p-8 sm:p-12 text-[13px] w-full min-h-full">
        {certType === 'experience'      && <ExperienceCert      f={expFields}    company={company} />}
        {certType === 'salary_revision' && <SalaryRevisionCert  f={salRevFields} company={company} />}
        {certType === 'compensation'    && <CompensationCert    f={compFields}   company={company} />}
        {certType === 'relieving'       && <RelievingCert       f={relFields}    company={company} />}
      </div>
    );
  };

  // ── Selection screen ───────────────────────────────────────────────────────
  if (!certType) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">Documentation Center</h1>
            <p className="text-sm text-muted-foreground">Generate official HR certificates and letters</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {(Object.entries(CERT_META) as [CertType, typeof CERT_META[CertType]][]).map(([key, meta]) => {
            const Icon = meta.icon;
            return (
              <button
                key={key}
                onClick={() => setCertType(key)}
                className={`group text-left p-6 rounded-2xl border-2 ${meta.bg} hover:shadow-lg transition-all duration-200 hover:-translate-y-1`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${meta.color} bg-white shadow-sm group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h2 className={`text-base font-bold ${meta.color} mb-1`}>{meta.label}</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {key === 'experience'      && 'Confirm an employee\'s work history, roles, and contributions.'}
                  {key === 'salary_revision' && 'Official letter documenting a salary revision for an employee.'}
                  {key === 'compensation'    && 'Break down salary components and total CTC for an employee.'}
                  {key === 'relieving'       && 'Formally relieve an employee and confirm their last working day.'}
                </p>
                <span className={`mt-4 inline-flex items-center gap-1.5 text-xs font-semibold ${meta.color}`}>
                  Generate →
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 p-4 rounded-xl bg-muted/40 border border-border text-sm text-muted-foreground flex gap-3">
          <Award className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
          <span>All certificates use your company letterhead from <strong>Company Settings</strong>. Employee details are auto-filled when you select an employee — all fields remain editable before printing.</span>
        </div>
      </div>
    );
  }

  // ── Generator screen ───────────────────────────────────────────────────────
  const meta = CERT_META[certType];
  const Icon = meta.icon;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setCertType(null)} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${meta.color} bg-white border ${meta.bg.split(' ')[1]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-heading text-foreground">{meta.label}</h1>
            <p className="text-xs text-muted-foreground">Fill in the details and preview the certificate below</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button onClick={handleDownloadPDF} className="gap-2">
            <Download className="w-4 h-4" /> Download PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Form panel */}
        <div className="bg-card rounded-2xl border border-border p-6 card-shadow space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Certificate Details</h2>
          {renderForm()}
        </div>

        {/* Preview panel */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Live Preview</span>
          </div>
          <div className="rounded-2xl overflow-hidden border border-border shadow-lg bg-white">
            {renderPreview()}
          </div>
        </div>
      </div>
    </div>
  );
}
