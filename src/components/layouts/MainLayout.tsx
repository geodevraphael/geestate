import { ReactNode } from 'react';
import { Navbar } from '@/components/Navbar';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';

interface MainLayoutProps {
  children: ReactNode;
  hideSidebar?: boolean;
}

export function MainLayout({ children, hideSidebar = false }: MainLayoutProps) {
  const { user } = useAuth();
  const showSidebar = user && !hideSidebar;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex flex-1 w-full">
        {showSidebar && <DashboardSidebar />}
        <main className={showSidebar ? "flex-1 overflow-auto" : "flex-1 w-full"}>
          {children}
        </main>
      </div>
    </div>
  );
}
