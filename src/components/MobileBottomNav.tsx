import { Link, useLocation } from 'react-router-dom';
import { Home, Search, MapPin, MessageSquare, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { icon: Home, label: 'Home', path: '/', activePattern: /^\/$/  },
    { icon: Search, label: 'Listings', path: '/listings', activePattern: /^\/listings/ },
    { icon: MapPin, label: 'Map', path: '/map', activePattern: /^\/map/ },
    { icon: MessageSquare, label: 'Messages', path: '/messages', activePattern: /^\/messages/, requireAuth: true },
    { icon: User, label: user ? 'Profile' : 'Login', path: user ? '/dashboard' : '/auth', activePattern: user ? /^\/(dashboard|profile)/ : /^\/auth/ },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          if (item.requireAuth && !user) return null;
          
          const isActive = item.activePattern.test(location.pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 min-w-[60px]",
                isActive 
                  ? "text-primary bg-primary/10 scale-105" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 transition-transform",
                isActive && "scale-110"
              )} />
              <span className={cn(
                "text-xs font-medium",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
