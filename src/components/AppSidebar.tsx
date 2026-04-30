import { useNavigate, useLocation } from 'react-router-dom';
import { useHR } from '@/context/HRContext';
import {
  LayoutDashboard, UserPlus, Users, CalendarDays,
  Wallet, FileText, LogOut, Building2, Settings, X
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/employees', label: 'Employee List', icon: Users },
  { path: '/payroll', label: 'Monthly Payroll', icon: CalendarDays },
  { path: '/advances', label: 'Advance Mgmt', icon: Wallet },
  { path: '/payslip', label: 'Payslip Generator', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface AppSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function AppSidebar({ mobileOpen = false, onClose }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useHR();

  const handleNav = (path: string) => {
    navigate(path);
    onClose?.();
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
        <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
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

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <button key={item.path} onClick={() => handleNav(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}`}>
              <item.icon className="w-4.5 h-4.5" />
              {item.label}
            </button>
          );
        })}
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
