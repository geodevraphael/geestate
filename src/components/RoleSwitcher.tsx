import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeftRight, ShoppingCart, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleSwitcherProps {
  compact?: boolean;
}

export function RoleSwitcher({ compact = false }: RoleSwitcherProps) {
  const { user, hasRole, primaryRole } = useAuth();
  const [activeMode, setActiveMode] = useState<'buyer' | 'seller'>(
    hasRole('seller') || hasRole('broker') ? 'seller' : 'buyer'
  );

  if (!user) return null;

  const canSwitchToSeller = hasRole('seller') || hasRole('broker') || hasRole('admin');

  const handleSwitch = (mode: 'buyer' | 'seller') => {
    setActiveMode(mode);
    // Store preference in localStorage for persistence
    localStorage.setItem('activeMode', mode);
  };

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeftRight className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={() => handleSwitch('buyer')}
            className={cn(activeMode === 'buyer' && 'bg-accent')}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Buyer Mode
          </DropdownMenuItem>
          {canSwitchToSeller && (
            <DropdownMenuItem 
              onClick={() => handleSwitch('seller')}
              className={cn(activeMode === 'seller' && 'bg-accent')}
            >
              <Store className="h-4 w-4 mr-2" />
              Seller Mode
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      <Button
        variant={activeMode === 'buyer' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleSwitch('buyer')}
        className="gap-2"
      >
        <ShoppingCart className="h-4 w-4" />
        <span className="hidden sm:inline">Buyer</span>
      </Button>
      {canSwitchToSeller && (
        <Button
          variant={activeMode === 'seller' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleSwitch('seller')}
          className="gap-2"
        >
          <Store className="h-4 w-4" />
          <span className="hidden sm:inline">Seller</span>
        </Button>
      )}
    </div>
  );
}