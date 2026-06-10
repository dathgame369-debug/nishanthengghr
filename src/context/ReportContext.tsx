import React, { createContext, useContext, useState, useCallback } from 'react';
import { Report } from '@/types/report';
import { supabase } from '@/integrations/supabase/client';
import { useHR } from './HRContext';

export interface ReportFilters {
  search?: string;
  customerId?: string;
  date?: string;
}

interface ReportContextType {
  loading: boolean;
  reports: Report[];        // current page only
  totalReports: number;
  fetchReports: (page: number, pageSize: number, filters?: ReportFilters) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
}

const ReportContext = createContext<ReportContextType | null>(null);

// Mappers
const reportFromRow = (r: any): Report => ({
  id: r.id, reportNo: r.report_no || '', currentPage: r.current_page || '',
  customerId: r.customer_id || '', customerName: r.customer_name || '',
  date: r.date || '', description: r.description || '',
  detailsOfPattern: r.details_of_pattern || '', drawingNo: r.drawing_no || '',
  rows: r.rows || [], totalPages: r.total_pages || '', unitMode: r.unit_mode || 'MM'
});

export function ReportProvider({ children }: { children: React.ReactNode }) {
  const { session } = useHR();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [totalReports, setTotalReports] = useState(0);

  const fetchReports = useCallback(async (
    page: number,
    pageSize: number,
    filters: ReportFilters = {}
  ) => {
    if (!session) return;
    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('reports')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filters.search) {
        query = query.or(
          `report_no.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }
      if (filters.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }
      if (filters.date) {
        // date filter: match by date prefix (YYYY-MM-DD stored as ISO)
        query = query.gte('date', filters.date).lt('date', filters.date + 'T23:59:59');
      }

      const { data, count, error } = await query;
      if (error) throw error;
      setReports((data || []).map(reportFromRow));
      setTotalReports(count ?? 0);
    } catch (e) {
      console.error('[reports] fetchReports failed', e);
    } finally {
      setLoading(false);
    }
  }, [session]);

  const deleteReport = useCallback(async (id: string) => {
    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (error) throw error;
    // Remove from local state immediately
    setReports(prev => prev.filter(r => r.id !== id));
    setTotalReports(prev => Math.max(0, prev - 1));
  }, []);

  return (
    <ReportContext.Provider value={{
      loading, reports, totalReports, fetchReports, deleteReport
    }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReport() {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error('useReport must be used within ReportProvider');
  return ctx;
}
