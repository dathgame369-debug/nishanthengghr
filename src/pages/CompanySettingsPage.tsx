import { useRef, useState } from 'react';
import { Building2, Upload, Save, Trash2, ListChecks, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useCompanyInfo, usePayslipComponents } from '@/hooks/useCompanySettings';
import { PayslipComponents } from '@/utils/companySettings';
import { useHR } from '@/context/HRContext';

const EARNINGS: { key: keyof PayslipComponents; label: string }[] = [
  { key: 'hra', label: 'HRA' },
  { key: 'specialAllowance', label: 'Special Allowance' },
  { key: 'medicalAllowance', label: 'Medical Allowance' },
  { key: 'travelAllowance', label: 'Travel Allowance' },
  { key: 'otherEarnings', label: 'Other Earnings' },
];
const DEDUCTIONS: { key: keyof PayslipComponents; label: string }[] = [
  { key: 'pf', label: 'PF' },
  { key: 'esi', label: 'ESI' },
  { key: 'professionalTax', label: 'Professional Tax' },
  { key: 'loanRecovery', label: 'Loan Recovery' },
  { key: 'otherDeductions', label: 'Other Deductions' },
];

export default function CompanySettingsPage() {
  const [company, saveCompany] = useCompanyInfo();
  const [components, saveComponents] = usePayslipComponents();
  const [form, setForm] = useState(company);
  const [comp, setComp] = useState<PayslipComponents>(components);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { session, updateCredentials } = useHR();

  const [accForm, setAccForm] = useState({ username: session?.user?.email || '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogoUpload = (file: File) => {
    if (file.size > 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 1 MB', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = e => setForm(f => ({ ...f, logoDataUrl: String(e.target?.result || '') }));
    reader.readAsDataURL(file);
  };

  const onSave = () => {
    saveCompany(form);
    saveComponents(comp);
    toast({ title: 'Saved', description: 'Company settings updated' });
  };

  const saveAccount = async () => {
    if (!accForm.username.trim()) { toast({ title: 'Error', description: 'Username required', variant: 'destructive' }); return; }
    if (accForm.password && accForm.password !== accForm.confirm) { toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' }); return; }
    
    const { ok, error } = await updateCredentials(accForm.username.trim(), accForm.password || undefined);
    if (ok) {
      toast({ title: 'Success', description: 'Account credentials updated successfully' });
      setAccForm(prev => ({ ...prev, password: '', confirm: '' }));
    } else {
      toast({ title: 'Error', description: error || 'Failed to update credentials', variant: 'destructive' });
    }
  };

  return (
    <div className="animate-fade-in w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Company Settings</h1>
          <p className="text-sm text-muted-foreground">Manage company profile & payslip components</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Company Profile */}
        <div className="bg-card border border-border rounded-xl p-6 card-shadow space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Company Profile</h2>

          <div>
            <label className="text-sm font-medium block mb-1">Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                {form.logoDataUrl
                  ? <img src={form.logoDataUrl} alt="Logo" className="w-full h-full object-contain" />
                  : <Building2 className="w-8 h-8 text-muted-foreground" />}
              </div>
              <div className="flex flex-col gap-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-1.5" /> Upload Logo
                </Button>
                {form.logoDataUrl && (
                  <Button type="button" variant="ghost" size="sm" className="text-destructive"
                    onClick={() => setForm(f => ({ ...f, logoDataUrl: '' }))}>
                    <Trash2 className="w-4 h-4 mr-1.5" /> Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Company Name *</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Address</label>
            <Textarea rows={3} value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Phone</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Email</label>
              <Input type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">GST Number</label>
            <Input
              value={form.gstNumber ?? ''}
              onChange={e => setForm(f => ({ ...f, gstNumber: e.target.value.toUpperCase() }))}
              placeholder="e.g. 33AABCN1234F1ZX"
              maxLength={15}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your company's GSTIN — will appear on every quotation.
            </p>
          </div>
        </div>

        {/* Payslip Components */}
        <div className="bg-card border border-border rounded-xl p-6 card-shadow">
          <div className="flex items-center gap-2 mb-1">
            <ListChecks className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Payslip Components</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Enable the rows that should appear on payslips. Basic, Overtime, Incentives, Bonus & Advance Recovery are always shown.
          </p>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Earnings</h3>
              <div className="space-y-2">
                {EARNINGS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={comp[key]}
                      onCheckedChange={v => setComp(c => ({ ...c, [key]: !!v }))} />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Deductions</h3>
              <div className="space-y-2">
                {DEDUCTIONS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={comp[key]}
                      onCheckedChange={v => setComp(c => ({ ...c, [key]: !!v }))} />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Account Security */}
        <div className="bg-card border border-border rounded-xl p-6 card-shadow h-full flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Account Security</h2>
          </div>
          <div className="space-y-4 flex-1">
            <div>
              <label className="text-sm font-medium block mb-1">Username</label>
              <Input value={accForm.username} onChange={e => setAccForm(f => ({ ...f, username: e.target.value }))} placeholder="Enter username" />
            </div>
            <div className="border-t border-border pt-4">
              <label className="text-sm font-medium block mb-1">New Password (leave blank to keep current)</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={accForm.password}
                  onChange={e => setAccForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Enter new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Confirm New Password</label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  value={accForm.confirm}
                  onChange={e => setAccForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Confirm new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowConfirm(v => !v)}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button onClick={saveAccount} variant="outline" className="w-full mt-2">Update Credentials</Button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={onSave}><Save className="w-4 h-4 mr-2" /> Save Settings</Button>
      </div>
    </div>
  );
}
