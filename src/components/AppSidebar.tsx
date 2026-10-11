import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useHR } from '@/context/HRContext';
import {
  LayoutDashboard, Users, CalendarDays,
  Wallet, FileText, LogOut, Settings, X,
  Briefcase, FileSpreadsheet, Building2, ChevronDown, ChevronRight, Settings2, Plus, Eye,
  Award, ShieldCheck
} from 'lucide-react';
import logo from '@/assets/logo.png';

import { PermissionKey } from '@/types/hr';

type NavItem = { path: string; label: string; icon: any; perm: PermissionKey };
type NavGroup = { key: string; label: string; icon: any; items: NavItem[] };

const rawGroups: NavGroup[] = [
  {
    key: 'hr', label: 'HR Management', icon: Briefcase,
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard' },
      { path: '/employees', label: 'Employee List', icon: Users, perm: 'employees' },
      { path: '/payroll', label: 'Monthly Payroll', icon: CalendarDays, perm: 'payroll' },
      { path: '/advances', label: 'Advance Mgmt', icon: Wallet, perm: 'advances' },
      { path: '/payslip', label: 'Payslip Generator', icon: FileText, perm: 'payslip' },
      { path: '/documentation-center', label: 'Documentation Center', icon: Award, perm: 'documentation' },
      { path: '/settings', label: 'HR Settings', icon: Settings, perm: 'hr_settings' },
    ],
  },
  {
    key: 'quot', label: 'Quotation Management', icon: FileSpreadsheet,
    items: [
      { path: '/quotations/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'quotations' },
      { path: '/quotations/new', label: 'Create Quotation', icon: FileText, perm: 'quotations' },
      { path: '/quotations', label: 'Quotation List', icon: FileSpreadsheet, perm: 'quotations' },
      { path: '/quotations/settings', label: 'Quotation Settings', icon: Settings, perm: 'quotations' },
    ],
  },
  {
    key: 'reports', label: 'Reports & Inspections', icon: FileText,
    items: [
      { path: '/reports/new', label: 'Create Report', icon: FileText, perm: 'reports' },
      { path: '/reports', label: 'View Reports', icon: Eye, perm: 'reports' },
    ],
  },
  {
    key: 'settings', label: 'Settings', icon: Settings2,
    items: [
      { path: '/customers', label: 'Clients Master', icon: Building2, perm: 'customers' },
      { path: '/company-settings', label: 'Company Settings', icon: Settings2, perm: 'company_settings' },
      { path: '/user-management', label: 'User & Access Mgmt', icon: ShieldCheck, perm: 'user_management' },
    ]
  }
];

interface AppSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function AppSidebar({ mobileOpen = false, onClose }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, role, session, canAccess } = useHR();

  const groups = useMemo(() => {
    return rawGroups
      .map(g => ({
        ...g,
        items: g.items.filter(item => canAccess(item.perm))
      }))
      .filter(g => g.items.length > 0);
  }, [canAccess]);

  const isActive = (path: string) => location.pathname === path;
  const initialOpen = () => {
    const open: Record<string, boolean> = {};
    for (const g of rawGroups) open[g.key] = g.items.some(i => isActive(i.path));
    if (!Object.values(open).some(Boolean)) {
      if (isFrontOffice) {
        open.quot = true; open.reports = true;
      } else {
        open.hr = true; open.quot = true;
      }
    }
    return open;
  };
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);
  const toggleGroup = (key: string) => setOpenGroups(s => ({ ...s, [key]: !s[key] }));

  const handleNav = (path: string) => {
    navigate(path);
    onClose?.();
  };

  const itemBtn = (item: NavItem) => {
    const active = isActive(item.path);
    return (
      <button key={item.path} onClick={() => handleNav(item.path)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
          ${active
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}`}>
        <item.icon className="w-4 h-4" />
        {item.label}
      </button>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={onClose}
          className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-64 flex flex-col z-50 transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{ background: 'linear-gradient(180deg, hsl(215, 70%, 18%), hsl(215, 70%, 26%))' }}
      >
      <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border relative">
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden">
          <img src={logo} alt="Nishanth Engineering Works" className="w-9 h-9 object-contain" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-sidebar-foreground leading-tight">Nishanth</h1>
          <p className="text-xs text-sidebar-foreground/60">Engineering Works</p>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
        {groups.map(g => {
          const open = openGroups[g.key];
          return (
            <div key={g.key} className="pt-1">
              <button
                onClick={() => toggleGroup(g.key)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-all"
              >
                <g.icon className="w-3.5 h-3.5" />
                <span className="flex-1 text-left">{g.label}</span>
                {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {open && (
                <div className="mt-1 space-y-1 ml-1 pl-2 border-l border-sidebar-border/40">
                  {g.items.map(itemBtn)}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User profile & Logout */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
        <div className="px-3 py-2 bg-white/5 rounded-lg border border-white/10">
          <p className="text-xs font-semibold text-sidebar-foreground truncate">
            @{session?.user?.email || 'user'}
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full mt-1 bg-white/10 text-white border border-white/20">
            {role || 'User'}
          </span>
        </div>

        <button onClick={async () => { await logout(); navigate('/'); onClose?.(); }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-all">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
      </aside>
    </>
  );
}
