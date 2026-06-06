import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useReport } from '@/context/ReportContext';

type ClientFormData = {
  companyName: string;
  address: string;
  contactNumber: string;
  email: string;
};

export default function AddClientPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { companyDetails, setCompanyDetails } = useReport();
  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<ClientFormData>();

  const isEditing = id && id !== 'new';

  useEffect(() => {
    if (isEditing) {
      const client = companyDetails.find(c => c.id === id);
      if (client) {
        setValue('companyName', client.companyName);
        setValue('address', client.address);
        setValue('contactNumber', client.contactNumber);
        setValue('email', client.email);
      }
    }
  }, [id, companyDetails, setValue, isEditing]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      let clientId = isEditing ? id : Date.now().toString(); // Use timestamp as simple ID
      
      const payload = {
        id: clientId,
        company_name: data.companyName,
        address: data.address,
        contact_number: data.contactNumber,
        email: data.email
      };

      const { error } = await supabase.from('company_details').upsert(payload);
      if (error) throw error;

      // Update local state context
      if (isEditing) {
        setCompanyDetails(companyDetails.map(c => c.id === id ? { ...c, ...data } as any : c));
      } else {
        setCompanyDetails([...companyDetails, {
          id: clientId,
          companyName: data.companyName,
          address: data.address,
          contactNumber: data.contactNumber,
          email: data.email,
          createdAt: new Date().toISOString()
        }]);
      }

      toast.success(`Client ${isEditing ? 'updated' : 'added'} successfully`);
      navigate('/clients');
    } catch (e: any) {
      toast.error('Failed to save client: ' + e.message);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/clients')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isEditing ? 'Edit Client' : 'Add Client'}</h1>
          <p className="text-muted-foreground">{isEditing ? 'Update customer details.' : 'Enter new customer details.'}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
          <CardDescription>Details will be available in the Create Report form.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                placeholder="Enter company name"
                {...register('companyName', { required: true })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Enter address"
                {...register('address')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input
                  id="contactNumber"
                  placeholder="e.g. 0422-123456"
                  {...register('contactNumber')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  {...register('email')}
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="button" variant="outline" onClick={() => navigate('/clients')} className="mr-2">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? 'Update Client' : 'Save Client'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
