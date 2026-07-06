import React, { createContext, useContext, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  username: string | null;
  action: string;
  module: string;
  description: string | null;
  meta?: Record<string, any> | null;
}

export interface LogFilters {
  module?: string;
  action?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface ActivityLogContextType {
  logActivity: (action: string, module: string, description: string, meta?: Record<string, any>) => void;
  fetchLogs: (page: number, pageSize: number, filters?: LogFilters) => Promise<{ data: ActivityLogEntry[]; total: number }>;
}

const ActivityLogContext = createContext<ActivityLogContextType | null>(null);

// Read current username from localStorage session
function getCurrentUsername(): string {
  try {
    const s = localStorage.getItem('hr_session');
    if (s) {
      const parsed = JSON.parse(s);
      return parsed?.user?.email || 'System';
    }
  } catch { /* ignore */ }
  return 'System';
}

export function ActivityLogProvider({ children }: { children: React.ReactNode }) {
  // Fire-and-forget: never blocks the UI
  const logActivity = useCallback((
    action: string,
    module: string,
    description: string,
    meta?: Record<string, any>,
  ) => {
    const username = getCurrentUsername();
    supabase.from('activity_log').insert({
      action,
      module,
      description,
      username,
      meta: meta ?? null,
    }).then(({ error }) => {
      if (error) console.warn('[ActivityLog] insert failed:', error.message);
    });
  }, []);

  const fetchLogs = useCallback(async (
    page: number,
    pageSize: number,
    filters: LogFilters = {},
  ): Promise<{ data: ActivityLogEntry[]; total: number }> => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('activity_log')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(from, to);

    if (filters.module && filters.module !== 'All') query = query.eq('module', filters.module);
    if (filters.action && filters.action !== 'All') query = query.eq('action', filters.action);
    if (filters.search) query = query.ilike('description', `%${filters.search}%`);
    if (filters.dateFrom) query = query.gte('timestamp', filters.dateFrom);
    if (filters.dateTo) query = query.lte('timestamp', filters.dateTo + 'T23:59:59');

    const { data, count, error } = await query;
    if (error) {
      console.error('[ActivityLog] fetchLogs failed:', error);
      return { data: [], total: 0 };
    }
    return {
      data: (data || []).map((r: any) => ({
        id: r.id,
        timestamp: r.timestamp,
        username: r.username,
        action: r.action,
        module: r.module,
        description: r.description,
        meta: r.meta,
      })),
      total: count ?? 0,
    };
  }, []);

  return (
    <ActivityLogContext.Provider value={{ logActivity, fetchLogs }}>
      {children}
    </ActivityLogContext.Provider>
  );
}

export function useActivityLog() {
  const ctx = useContext(ActivityLogContext);
  if (!ctx) throw new Error('useActivityLog must be used within ActivityLogProvider');
  return ctx;
}
