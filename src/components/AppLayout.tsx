import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useHR } from '@/context/HRContext';
import AppSidebar from './AppSidebar';
import { Menu, Building2 } from 'lucide-react';

export default function AppLayout() {
  const { isLoggedIn } = useHR();
  const [mobileOpen, setMobileOpen] = useState(false);
  if (!isLoggedIn) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/** Mobile top bar **/}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-20 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-md hover:bg-muted"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-foreground">Nishanth</p>
            <p className="text-[10px] text-muted-foreground -mt-0.5">Engineering Portal</p>
          </div>
        </div>
      </header>

      <main className="flex-1 lg:ml-64 pt-16 lg:pt-8 p-4 sm:p-6 lg:p-8 overflow-auto w-full min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
