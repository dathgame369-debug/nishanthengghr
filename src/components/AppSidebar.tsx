import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useHR } from '@/context/HRContext';
import {
  LayoutDashboard, UserPlus, Users, CalendarDays,
  Wallet, FileText, LogOut, Settings, X,
  Briefcase, FileSpreadsheet, Building2, ChevronDown, ChevronRight,
} from 'lucide-react';
import logo from '@/assets/logo.png';

type NavItem = { path: string; label: string; icon: any };
type NavGroup = { key: string; label: string; icon: any; items: NavItem[] };

const dashboardItem: NavItem = { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard };

const groups: NavGroup[] = [
  {
    key: 'hr', label: 'HR Management', icon: Briefcase,
    items: [
      { path: '/employees', label: 'Employee List', icon: Users },
      { path: '/payroll', label: 'Monthly Payroll', icon: CalendarDays },
      { path: '/advances', label: 'Advance Mgmt', icon: Wallet },
      { path: '/payslip', label: 'Payslip Generator', icon: FileText },
    ],
  },
  {
    key: 'quot', label: 'Quotation Management', icon: FileSpreadsheet,
    items: [
      { path: '/quotations/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/quotations/new', label: 'Create Quotation', icon: FileText },
      { path: '/quotations', label: 'Quotation List', icon: FileSpreadsheet },
      { path: '/customers', label: 'Customers', icon: Building2 },
      { path: '/quotations/settings', label: 'Quotation Settings', icon: Settings },
    ],
  },
];

const settingsItem: NavItem = { path: '/settings', label: 'Settings', icon: Settings };

interface AppSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function AppSidebar({ mobileOpen = false, onClose }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useHR();

  const isActive = (path: string) => location.pathname === path;
  const initialOpen = () => {
    const open: Record<string, boolean> = {};
    for (const g of groups) open[g.key] = g.items.some(i => isActive(i.path));
    // Default both open if neither matches yet
    if (!Object.values(open).some(Boolean)) {
      open.hr = true; open.quot = true;
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
        {itemBtn(dashboardItem)}

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

        <div className="pt-2">{itemBtn(settingsItem)}</div>
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        <button onClick={async () => { await logout(); navigate('/'); onClose?.(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-all">
          <LogOut className="w-4.5 h-4.5" />
          Logout
        </button>
      </div>
      </aside>
    </>
  );
}
