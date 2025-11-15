import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, MessageSquare, Star, Shield, LogOut, FileText, CreditCard } from 'lucide-react';

export function UserMenu() {
  const { user, signOut, hasRole } = useAuth();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span className="hidden md:inline">Account</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link to={`/profile/${user.id}`} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            My Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/messages" className="cursor-pointer">
            <MessageSquare className="mr-2 h-4 w-4" />
            Messages
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/reputation" className="cursor-pointer">
            <Star className="mr-2 h-4 w-4" />
            Reputation
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/disputes" className="cursor-pointer">
            <Shield className="mr-2 h-4 w-4" />
            Disputes
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/visit-requests" className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4" />
            Visit Requests
          </Link>
        </DropdownMenuItem>
        
        {(hasRole('seller') || hasRole('broker') || hasRole('admin')) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/payment-proofs" className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
                Payments
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/geoinsight-payments" className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
                My GeoInsight Fees
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/subscriptions" className="cursor-pointer">
                Subscriptions
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/crm" className="cursor-pointer">
                CRM
              </Link>
            </DropdownMenuItem>
          </>
        )}

        {(hasRole('seller') || hasRole('broker')) && (
          <DropdownMenuItem asChild>
            <Link to="/apply-institutional-seller" className="cursor-pointer">
              Apply as Institution
            </Link>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
