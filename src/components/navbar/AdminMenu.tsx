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
import { Settings, Users, Building, FileCheck, BarChart3, FileText, Download, Webhook, Activity, Briefcase, Map, DollarSign, FileUp } from 'lucide-react';

export function AdminMenu() {
  const { hasRole } = useAuth();

  const isAdmin = hasRole('admin');
  const isStaff = hasRole('verification_officer') || hasRole('compliance_officer') || hasRole('spatial_analyst') || hasRole('customer_success');

  if (!isAdmin && !isStaff) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden md:inline">Admin</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link to="/admin-dashboard" className="cursor-pointer">
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link to="/admin/verification" className="cursor-pointer">
            <FileCheck className="mr-2 h-4 w-4" />
            Verify Listings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/admin/service-requests" className="cursor-pointer">
            <Briefcase className="mr-2 h-4 w-4" />
            Service Requests
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/admin/listing-requests" className="cursor-pointer">
            <FileUp className="mr-2 h-4 w-4" />
            Listing Requests
          </Link>
        </DropdownMenuItem>

        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/admin/users" className="cursor-pointer">
                <Users className="mr-2 h-4 w-4" />
                User Management
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/service-providers" className="cursor-pointer">
                <Briefcase className="mr-2 h-4 w-4" />
                Service Providers
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/institutional-sellers" className="cursor-pointer">
                <Building className="mr-2 h-4 w-4" />
                Institutions
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/geodata-upload" className="cursor-pointer">
                <Map className="mr-2 h-4 w-4" />
                GeoData Upload
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link to="/admin/income" className="cursor-pointer">
            <DollarSign className="mr-2 h-4 w-4" />
            Income Management
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link to="/admin/analytics" className="cursor-pointer">
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link to="/audit-logs" className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4" />
            Audit Logs
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/data-export" className="cursor-pointer">
            <Download className="mr-2 h-4 w-4" />
            Data Export
          </Link>
        </DropdownMenuItem>

        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/integrations" className="cursor-pointer">
                <Webhook className="mr-2 h-4 w-4" />
                Integrations
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/system-status" className="cursor-pointer">
                <Activity className="mr-2 h-4 w-4" />
                System Status
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
