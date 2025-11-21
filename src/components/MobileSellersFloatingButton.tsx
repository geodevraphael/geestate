import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

export function MobileSellersFloatingButton() {
  const isMobile = useIsMobile();

  // Only show on mobile devices
  if (!isMobile) return null;

  return (
    <Link 
      to="/sellers"
      className="fixed bottom-20 right-4 z-50 md:hidden"
    >
      <Button
        size="lg"
        className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
        aria-label="Browse sellers"
      >
        <Users className="h-6 w-6" />
      </Button>
    </Link>
  );
}