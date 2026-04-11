import { Outlet, Navigate } from 'react-router-dom';
import { useHR } from '@/context/HRContext';
import AppSidebar from './AppSidebar';

export default function AppLayout() {
  const { isLoggedIn } = useHR();
  if (!isLoggedIn) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 ml-64 p-6 lg:p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
