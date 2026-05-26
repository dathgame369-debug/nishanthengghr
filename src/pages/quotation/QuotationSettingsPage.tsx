import { useEffect, useState } from 'react';
import { useQuotation } from '@/context/QuotationContext';
import { QuotationSettings } from '@/types/quotation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon } from 'lucide-react';

export default function QuotationSettingsPage() {
  const { settings, saveSettings } = useQuotation();
  const { toast } = useToast();
  const [form, setForm] = useState<QuotationSettings>(settings);

  useEffect(() => { setForm(settings); }, [settings]);

  const save = async () => {
    try {
      await saveSettings(form);
      toast({ title: 'Saved', description: 'Quotation settings updated' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Quotation Settings</h1>
          <p className="text-sm text-muted-foreground">Numbering, default terms and tax</p>
        </div>
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Default Tax %</label>
            <Input type="number" step="0.01" value={form.defaultTaxPercent}
              onChange={e => setForm(f => ({ ...f, defaultTaxPercent: parseFloat(e.target.value) || 0 }))} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Default Terms & Conditions</label>
          <Textarea rows={6} value={form.defaultTerms}
            onChange={e => setForm(f => ({ ...f, defaultTerms: e.target.value }))} />
        </div>
        <Button onClick={save}>Save Settings</Button>
      </div>
    </div>
  );
}