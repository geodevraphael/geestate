import { ReactNode } from 'react';
import { Navbar } from '@/components/Navbar';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { AdminTodoPopup } from '@/components/AdminTodoPopup';
import { MobileSellersFloatingButton } from '@/components/MobileSellersFloatingButton';
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
        <main className="flex-1 w-full overflow-auto pb-24 md:pb-0">
          <div className="w-full h-full">
            {children}
          </div>
        </main>
      </div>
      <MobileBottomNav />
      <MobileSellersFloatingButton />
      <AdminTodoPopup />
    </div>
  );
}
