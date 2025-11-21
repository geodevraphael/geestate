import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, MapPin, MessageSquare, User, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    setOpen(false);
    navigate('/');
  };

  const navItems = [
    { icon: Home, label: 'Home', path: '/', activePattern: /^\/$/  },
    { icon: Search, label: 'Listings', path: '/listings', activePattern: /^\/listings/ },
    { icon: MapPin, label: 'Map', path: '/map', activePattern: /^\/map/ },
    { icon: MessageSquare, label: 'Messages', path: '/messages', activePattern: /^\/messages/, requireAuth: true },
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

        {/* User Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 min-w-[60px]",
                "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {user ? (
                <>
                  <Menu className="h-5 w-5" />
                  <span className="text-xs font-medium">Menu</span>
                </>
              ) : (
                <>
                  <User className="h-5 w-5" />
                  <span className="text-xs font-medium">Login</span>
                </>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader>
              <SheetTitle>
                {user ? 'Account' : 'Get Started'}
              </SheetTitle>
            </SheetHeader>
            <div className="py-6 space-y-4">
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full justify-start" size="lg">
                      <User className="mr-2 h-5 w-5" />
                      My Dashboard
                    </Button>
                  </Link>
                  <Separator />
                  <Button 
                    variant="destructive" 
                    className="w-full justify-start" 
                    size="lg"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setOpen(false)}>
                    <Button className="w-full" size="lg">
                      <User className="mr-2 h-5 w-5" />
                      Sign In / Sign Up
                    </Button>
                  </Link>
                  <Link to="/about-us" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full" size="lg">
                      Learn More
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
