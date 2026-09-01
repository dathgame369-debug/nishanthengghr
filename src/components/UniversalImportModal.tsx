import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileType, Check, AlertCircle } from 'lucide-react';
import { useHR } from '@/context/HRContext';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

interface UniversalImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UniversalImportModal({ isOpen, onClose }: UniversalImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const { employees, setEmployees } = useHR();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const parseDATFile = async (datFile: File) => {
    // Simple parser for ZKTeco user.dat (extracting names and PINs)
    const arrayBuffer = await datFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // ZKTeco user.dat is typically 72 bytes per record
    const RECORD_SIZE = 72;
    const records = [];
    
    const numRecords = Math.floor(bytes.length / RECORD_SIZE);
    
    let currentMaxId = employees.reduce((max, emp) => {
      const num = parseInt(emp.id.replace('EMP', ''), 10);
      return num > max ? num : max;
    }, 0);

    for (let i = 0; i < numRecords; i++) {
      const offset = i * RECORD_SIZE;
      const recordBytes = bytes.slice(offset, offset + RECORD_SIZE);
      
      let text = new TextDecoder().decode(recordBytes);
      text = text.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
      
      const parts = text.split(' ').filter(Boolean);
      const nameParts = parts.filter(p => /[A-Za-z]/.test(p));
      const idParts = parts.filter(p => /^\d+$/.test(p));
      
      const name = nameParts.join(' ');

      if (name) {
        currentMaxId++;
        records.push({
          id: `EMP${String(currentMaxId).padStart(3, '0')}`,
          name: name,
          fixedSalary: 0,
          dateOfJoining: new Date().toISOString().split('T')[0],
          department: 'Unassigned',
          designation: 'Unassigned',
          phone: '',
          status: 'Active' as const,
        });
      }
    }

    if (records.length > 0) {
      setEmployees(prev => [...prev, ...records]);
      toast({ title: 'Import Successful', description: `Imported ${records.length} employees from DAT file.` });
      onClose();
    } else {
      toast({ title: 'Import Failed', description: 'Could not extract valid employee data from the DAT file.', variant: 'destructive' });
    }
  };

  const parseCSVFile = (csvFile: File) => {
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        let currentMaxId = employees.reduce((max, emp) => {
          const num = parseInt(emp.id.replace('EMP', ''), 10);
          return num > max ? num : max;
        }, 0);

        const newEmployees = results.data.map((row: any) => {
          currentMaxId++;
          
          const name = row['Name'] || row['Employee Name'] || row['Emp Name'] || row['FullName'] || 'Unknown';
          const dept = row['Department'] || row['Dept'] || 'Unassigned';
          const desig = row['Designation'] || row['Role'] || 'Unassigned';
          const salary = parseFloat(row['Salary'] || row['Fixed Salary'] || row['Base Salary']) || 0;
          
          return {
            id: `EMP${String(currentMaxId).padStart(3, '0')}`,
            name,
            department: dept,
            designation: desig,
            fixedSalary: salary,
            dateOfJoining: new Date().toISOString().split('T')[0],
            phone: row['Phone'] || row['Mobile'] || '',
            status: 'Active' as const,
          };
        });

        if (newEmployees.length > 0) {
          setEmployees(prev => [...prev, ...newEmployees]);
          toast({ title: 'Import Successful', description: `Imported ${newEmployees.length} employees from CSV.` });
          onClose();
        } else {
          toast({ title: 'Import Failed', description: 'No valid data found in CSV.', variant: 'destructive' });
        }
      },
      error: (error: any) => {
        toast({ title: 'CSV Error', description: error.message, variant: 'destructive' });
      }
    });
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'dat') {
        await parseDATFile(file);
      } else if (ext === 'csv') {
        parseCSVFile(file);
      } else {
        toast({ title: 'Invalid File', description: 'Please upload a .csv or .dat file', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Import Error', description: 'An error occurred during import.', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Employees</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg bg-muted/30">
            <FileType className="w-10 h-10 text-muted-foreground mb-4" />
            <p className="text-sm font-medium text-foreground mb-1">Select a CSV or Biometric DAT file</p>
            <p className="text-xs text-muted-foreground mb-4">Supports .csv and ZKTeco user.dat</p>
            
            <input 
              type="file" 
              accept=".csv,.dat" 
              className="hidden" 
              id="file-upload" 
              onChange={handleFileChange}
            />
            <label htmlFor="file-upload">
              <Button variant="outline" asChild>
                <span>Browse Files</span>
              </Button>
            </label>
          </div>

          {file && (
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <Check className="w-5 h-5 text-green-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          )}

          <div className="bg-primary/10 p-3 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-sm text-primary-foreground">
              <p className="font-medium">Note on imported data</p>
              <p className="text-primary/80 mt-1">
                Data will be mapped automatically. Missing fields (like Salary) will be set to defaults. You can edit them later in the Employee List.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={!file || importing}>
            {importing ? 'Importing...' : 'Start Import'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
