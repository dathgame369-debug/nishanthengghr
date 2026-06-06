import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Report } from '@/types/report';
import { supabase } from '@/integrations/supabase/client';
import { useHR } from './HRContext';

type Setter<T> = React.Dispatch<React.SetStateAction<T[]>>;

interface ReportContextType {
  loading: boolean;
  reports: Report[];
  setReports: Setter<Report>;
}

const ReportContext = createContext<ReportContextType | null>(null);

// Mappers
const reportToRow = (r: Report) => ({
  id: r.id, report_no: r.reportNo, current_page: r.currentPage, customer_id: r.customerId,
  customer_name: r.customerName, date: r.date, description: r.description,
  details_of_pattern: r.detailsOfPattern, drawing_no: r.drawingNo, rows: r.rows,
  total_pages: r.totalPages, unit_mode: r.unitMode
});

const reportFromRow = (r: any): Report => ({
  id: r.id, reportNo: r.report_no || '', currentPage: r.current_page || '',
  customerId: r.customer_id || '', customerName: r.customer_name || '',
  date: r.date || '', description: r.description || '',
  detailsOfPattern: r.details_of_pattern || '', drawingNo: r.drawing_no || '',
  rows: r.rows || [], totalPages: r.total_pages || '', unitMode: r.unit_mode || 'MM'
});

// Diff helper
function diffArrays<T extends { id: string }>(prev: T[], next: T[]) {
  const prevMap = new Map(prev.map(x => [x.id, x]));
  const nextMap = new Map(next.map(x => [x.id, x]));
  const toUpsert: T[] = [];
  const toDelete: string[] = [];
  for (const [id, item] of nextMap) {
    const old = prevMap.get(id);
    if (!old || JSON.stringify(old) !== JSON.stringify(item)) toUpsert.push(item);
  }
  for (const id of prevMap.keys()) if (!nextMap.has(id)) toDelete.push(id);
  return { toUpsert, toDelete };
}

export function ReportProvider({ children }: { children: React.ReactNode }) {
  const { session } = useHR();
  const [loading, setLoading] = useState(false);
  const [reports, setReportsState] = useState<Report[]>([]);

  useEffect(() => {
    if (!session) {
      setReportsState([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const rep = await supabase.from('reports').select('*').order('created_at', { ascending: false });
      
      if (cancelled) return;
      setReportsState((rep.data || []).map(reportFromRow));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [session]);

  function makeSetter<T extends { id: string }>(
    table: 'reports',
    setLocal: React.Dispatch<React.SetStateAction<T[]>>,
    toRow: (x: T) => any,
    getCurrent: () => T[],
  ): Setter<T> {
    return (action: React.SetStateAction<T[]>) => {
      setLocal(prev => {
        const next = typeof action === 'function' ? (action as (p: T[]) => T[])(prev) : action;
        const { toUpsert, toDelete } = diffArrays(prev, next);
        if (toUpsert.length) {
          supabase.from(table).upsert(toUpsert.map(toRow)).then(({ error }) => {
            if (error) console.error(`[${table}] upsert failed`, error);
          });
        }
        if (toDelete.length) {
          supabase.from(table).delete().in('id', toDelete).then(({ error }) => {
            if (error) console.error(`[${table}] delete failed`, error);
          });
        }
        return next;
      });
    };
  }

  const repRef = useRef(reports); repRef.current = reports;

  const setReports = useCallback(makeSetter<Report>('reports', setReportsState, reportToRow, () => repRef.current), []);

  return (
    <ReportContext.Provider value={{
      loading, reports, setReports
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
