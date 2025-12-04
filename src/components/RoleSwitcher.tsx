import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeftRight, ShoppingCart, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface RoleSwitcherProps {
  compact?: boolean;
}

export function RoleSwitcher({ compact = false }: RoleSwitcherProps) {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeMode, setActiveMode] = useState<'buyer' | 'seller'>('buyer');

  // Initialize from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('activeMode');
    if (saved === 'seller' || saved === 'buyer') {
      setActiveMode(saved);
    } else if (hasRole('seller') || hasRole('broker')) {
      setActiveMode('seller');
    }
  }, [hasRole]);

  if (!user) return null;

  const canActAsSeller = hasRole('seller') || hasRole('broker') || hasRole('admin');

  const handleSwitch = (mode: 'buyer' | 'seller') => {
    if (mode === 'seller' && !canActAsSeller) {
      // Prompt buyer to apply for seller role
      toast({
        title: 'Become a Seller',
        description: 'Apply to become a seller to list your properties.',
      });
      navigate('/apply-for-role');
      return;
    }
    
    setActiveMode(mode);
    localStorage.setItem('activeMode', mode);
    
    toast({
      title: `Switched to ${mode === 'buyer' ? 'Buyer' : 'Seller'} Mode`,
      description: mode === 'buyer' 
        ? 'You can now browse and purchase properties.' 
        : 'You can now manage and list your properties.',
    });
  };

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            {activeMode === 'buyer' ? (
              <ShoppingCart className="h-5 w-5" />
            ) : (
              <Store className="h-5 w-5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover border border-border shadow-lg z-50">
          <DropdownMenuItem 
            onClick={() => handleSwitch('buyer')}
            className={cn(activeMode === 'buyer' && 'bg-accent')}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Buyer Mode
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleSwitch('seller')}
            className={cn(activeMode === 'seller' && canActAsSeller && 'bg-accent')}
          >
            <Store className="h-4 w-4 mr-2" />
            {canActAsSeller ? 'Seller Mode' : 'Become a Seller'}
          </DropdownMenuItem>
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
      <Button
        variant={activeMode === 'seller' && canActAsSeller ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleSwitch('seller')}
        className="gap-2"
      >
        <Store className="h-4 w-4" />
        <span className="hidden sm:inline">{canActAsSeller ? 'Seller' : 'Become Seller'}</span>
      </Button>
    </div>
  );
}